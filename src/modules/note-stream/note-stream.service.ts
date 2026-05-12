import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/prisma/client';
import { PrismaService } from '@core/prisma/prisma.service';
import {
  mapNoteListItemsWithStreams,
  type NoteListStream,
  noteListItemSelect,
} from '@modules/note/utils/note-list-item.util';
import { prepareStreamName } from '@modules/stream/utils/prepare-stream-name.util';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';
import { PaginationService } from '@shared/pagination/pagination.service';
import { DecodeCursorError } from '@shared/pagination/utils/codec.util';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

type PreparedStreamName = ReturnType<typeof prepareStreamName>;

type ResolveStreamIdsForNoteParams = {
  streamIds?: string[];
  streamNames?: string[];
  client?: PrismaClientLike;
};

@Injectable()
export class NoteStreamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
  ) {}

  async findNotes(
    userId: string,
    streamId: string,
    paginateDto: CursorPaginationDto,
  ) {
    try {
      const stream = await this.getOwnedStreamOrThrow(
        this.prisma,
        userId,
        streamId,
      );

      const notes = await this.prisma.note.findMany({
        where: {
          userId,
          deletedAt: null,
          noteStreams: {
            some: {
              streamId: stream.id,
            },
          },
        },
        select: noteListItemSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...this.pagination.toPrismaCursorArgs<Prisma.NoteWhereUniqueInput>(
          paginateDto,
          (id) => ({ id }),
        ),
      });

      const page = this.pagination.toCursorPage(
        notes,
        paginateDto,
        (note) => note.id,
      );
      const streamsByNoteId = await this.findStreamsByNoteIds(
        userId,
        page.result.map((note) => note.id),
      );

      return {
        ...page,
        result: mapNoteListItemsWithStreams(page.result, streamsByNoteId),
      };
    } catch (error: unknown) {
      this.throwInvalidCursorIfNeeded(error);
    }
  }

  async attachNote(userId: string, streamId: string, noteId: string) {
    await this.prisma.$transaction(async (tx) => {
      const stream = await this.getOwnedStreamOrThrow(tx, userId, streamId);
      const note = await this.getOwnedNoteOrThrow(tx, userId, noteId);

      await tx.noteStream.upsert({
        where: {
          noteId_streamId: {
            noteId: note.id,
            streamId: stream.id,
          },
        },
        update: {},
        create: {
          noteId: note.id,
          streamId: stream.id,
        },
      });
    });

    return true;
  }

  async detachNote(userId: string, streamId: string, noteId: string) {
    await this.prisma.$transaction(async (tx) => {
      const stream = await this.getOwnedStreamOrThrow(tx, userId, streamId);
      const note = await this.getOwnedNoteOrThrow(tx, userId, noteId);

      const deleteResult = await tx.noteStream.deleteMany({
        where: {
          noteId: note.id,
          streamId: stream.id,
        },
      });

      if (deleteResult.count === 0) {
        throw new NotFoundException('Note stream link not found');
      }
    });

    return true;
  }

  async resolveStreamIdsForNote(
    userId: string,
    params: ResolveStreamIdsForNoteParams = {},
  ) {
    const { streamIds = [], streamNames = [], client = this.prisma } = params;
    const ownedStreamIds = await this.getOwnedStreamIdsOrThrow(
      client,
      userId,
      this.uniqueStrings(streamIds),
    );
    const namedStreamIds = await this.resolveStreamIdsByName(
      client,
      userId,
      streamNames,
    );

    return this.uniqueStrings([...ownedStreamIds, ...namedStreamIds]);
  }

  async findStreamsByNoteIds(
    userId: string,
    noteIds: string[],
    client: PrismaClientLike = this.prisma,
  ) {
    const uniqueNoteIds = this.uniqueStrings(noteIds);
    const streamsByNoteId = new Map<string, NoteListStream[]>();

    if (uniqueNoteIds.length === 0) {
      return streamsByNoteId;
    }

    const links = await client.noteStream.findMany({
      where: {
        noteId: {
          in: uniqueNoteIds,
        },
        note: {
          userId,
          deletedAt: null,
        },
        stream: {
          userId,
        },
      },
      select: {
        noteId: true,
        stream: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    for (const link of links) {
      const streams = streamsByNoteId.get(link.noteId) ?? [];
      streams.push(link.stream);
      streamsByNoteId.set(link.noteId, streams);
    }

    return streamsByNoteId;
  }

  private async getOwnedStreamIdsOrThrow(
    client: PrismaClientLike,
    userId: string,
    streamIds: string[],
  ) {
    if (streamIds.length === 0) {
      return [];
    }

    const streams = await client.stream.findMany({
      where: {
        userId,
        id: {
          in: streamIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (streams.length !== streamIds.length) {
      throw new NotFoundException('Stream not found');
    }

    return streams.map((stream) => stream.id);
  }

  private async resolveStreamIdsByName(
    client: PrismaClientLike,
    userId: string,
    streamNames: string[],
  ) {
    const names = this.prepareUniqueNames(streamNames);

    if (names.length === 0) {
      return [];
    }

    const streamIds: string[] = [];

    for (const name of names) {
      const stream = await client.stream.upsert({
        where: {
          userId_normalizedName: {
            userId,
            normalizedName: name.normalizedName,
          },
        },
        update: {},
        create: {
          userId,
          name: name.name,
          normalizedName: name.normalizedName,
        },
        select: {
          id: true,
        },
      });

      streamIds.push(stream.id);
    }

    return streamIds;
  }

  private async getOwnedStreamOrThrow(
    client: PrismaClientLike,
    userId: string,
    id: string,
  ) {
    try {
      return await client.stream.findFirstOrThrow({
        where: { id, userId },
      });
    } catch (error: unknown) {
      this.throwStreamNotFoundIfNeeded(error);
    }
  }

  private async getOwnedNoteOrThrow(
    client: PrismaClientLike,
    userId: string,
    id: string,
  ) {
    try {
      return await client.note.findFirstOrThrow({
        where: { id, userId, deletedAt: null },
        select: {
          id: true,
        },
      });
    } catch (error: unknown) {
      this.throwNoteNotFoundIfNeeded(error);
    }
  }

  private prepareUniqueNames(streamNames: string[]) {
    const names = new Map<string, PreparedStreamName>();

    for (const streamName of streamNames) {
      const name = prepareStreamName(streamName);

      if (!names.has(name.normalizedName)) {
        names.set(name.normalizedName, name);
      }
    }

    return [...names.values()];
  }

  private uniqueStrings(values: string[]) {
    return [...new Set(values)];
  }

  private throwInvalidCursorIfNeeded(error: unknown): never {
    if (error instanceof DecodeCursorError) {
      throw new BadRequestException('Invalid cursor');
    }

    throw error;
  }

  private throwStreamNotFoundIfNeeded(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Stream not found');
    }

    throw error;
  }

  private throwNoteNotFoundIfNeeded(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Note not found');
    }

    throw error;
  }
}
