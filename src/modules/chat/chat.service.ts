import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/prisma/client';
import { PrismaService } from '@core/prisma/prisma.service';
import { NoteStreamService } from '@modules/note-stream/note-stream.service';
import { buildNoteContentFields } from '@modules/note/utils/note-content.util';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';
import { PaginationService } from '@shared/pagination/pagination.service';
import { DecodeCursorError } from '@shared/pagination/utils/codec.util';
import { ChatMessageRole } from './constants/chat-message-role.constant';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { CreateChatDto } from './dto/create-chat.dto';
import { parseChatMessageForNote } from './utils/chat-message-parser.util';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

const messageInclude = {
  notes: {
    select: {
      id: true,
      previewText: true,
      noteStreams: {
        select: {
          stream: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  },
  streams: {
    select: {
      id: true,
      name: true,
    },
  },
} as const satisfies Prisma.MessageInclude;

type MessageWithRelations = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
    private readonly noteStreamService: NoteStreamService,
  ) {}

  async create(userId: string, dto: CreateChatDto) {
    const streamId = await this.resolveOwnedStreamId(userId, dto);

    await this.ensureChatDoesNotExist(userId, streamId);

    try {
      return await this.createChat(userId, streamId);
    } catch (error: unknown) {
      this.throwChatConflictIfNeeded(error);
    }
  }

  async findOrCreate(userId: string, dto: CreateChatDto) {
    const streamId = dto.streamId ?? null;

    await this.resolveOwnedStreamId(userId, dto);

    const existingChat = await this.findAvailableChat(userId, streamId);

    if (existingChat) {
      return this.mapChat(existingChat, userId);
    }

    try {
      return await this.createChat(userId, streamId);
    } catch (error: unknown) {
      return await this.findAvailableChatAfterCreateConflict(
        error,
        userId,
        streamId,
      );
    }
  }

  async findAll(userId: string, paginateDto: CursorPaginationDto) {
    try {
      const chats = await this.prisma.chat.findMany({
        where: {
          OR: this.ownedChatConditions(userId),
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        ...this.pagination.toPrismaCursorArgs<Prisma.ChatWhereUniqueInput>(
          paginateDto,
          (id) => ({ id }),
        ),
      });

      const page = this.pagination.toCursorPage(
        chats,
        paginateDto,
        (chat) => chat.id,
      );

      return {
        ...page,
        result: page.result.map((chat) => this.mapChat(chat, userId)),
      };
    } catch (error: unknown) {
      this.throwInvalidCursorIfNeeded(error);
    }
  }

  async findMessages(
    userId: string,
    chatId: string,
    paginateDto: CursorPaginationDto,
  ) {
    try {
      const chat = await this.getOwnedChatOrThrow(userId, chatId);
      const messages = await this.prisma.message.findMany({
        where: { chatId: chat.id },
        include: messageInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...this.pagination.toPrismaCursorArgs<Prisma.MessageWhereUniqueInput>(
          paginateDto,
          (id) => ({ id }),
        ),
      });
      const page = this.pagination.toCursorPage(
        messages,
        paginateDto,
        (message) => message.id,
      );

      return {
        ...page,
        result: this.mapChatMessages(page.result),
      };
    } catch (error: unknown) {
      this.throwInvalidCursorIfNeeded(error);
    }
  }

  async createMessage(
    userId: string,
    chatId: string,
    dto: CreateChatMessageDto,
  ) {
    const parsedMessage = parseChatMessageForNote(dto.bodyMarkdown);

    if (parsedMessage.bodyMarkdown.trim().length === 0) {
      throw new BadRequestException('Note body is required');
    }

    return await this.prisma.$transaction(async (tx) => {
      const chat = await this.getOwnedChatOrThrow(userId, chatId, tx);

      const { streamIds, createdStreamIds } =
        await this.noteStreamService.resolveStreamIdsForNoteResult(userId, {
          streamIds: chat.streamId ? [chat.streamId] : [],
          streamNames: parsedMessage.streamNames,
          client: tx,
        });

      const userMessage = await tx.message.create({
        data: {
          chatId: chat.id,
          bodyMarkdown: dto.bodyMarkdown,
        },
      });

      await tx.note.create({
        data: {
          userId,
          ...buildNoteContentFields(parsedMessage.bodyMarkdown),
          fromMessageId: userMessage.id,
          ...(streamIds.length > 0 && {
            noteStreams: {
              createMany: {
                data: streamIds.map((streamId) => ({ streamId })),
                skipDuplicates: true,
              },
            },
          }),
        },
        select: {
          id: true,
        },
      });

      if (createdStreamIds.length > 0) {
        await tx.stream.updateMany({
          where: {
            id: { in: createdStreamIds },
          },
          data: {
            fromMessageId: userMessage.id,
          },
        });
      }

      const message = await tx.message.findUniqueOrThrow({
        where: { id: userMessage.id },
        include: messageInclude,
      });

      await tx.chat.update({
        where: { id: chat.id },
        data: { updatedAt: new Date() },
      });

      return this.mapChatMessage(message);
    });
  }

  private mapChatMessages(messages: MessageWithRelations[]) {
    return messages.map((message) => this.mapChatMessage(message));
  }

  private mapChatMessage(message: MessageWithRelations) {
    const { notes, streams, ...messageFields } = message;
    const note = notes[0] ?? null;

    return {
      ...messageFields,
      role: ChatMessageRole.USER,
      replyToMessageId: null,
      result:
        note || streams.length > 0
          ? {
              note: note
                ? {
                    id: note.id,
                    previewText: note.previewText,
                    streamNames: note.noteStreams.map(
                      (noteStream) => noteStream.stream.name,
                    ),
                  }
                : null,
              streams: streams.map((stream) => ({
                id: stream.id,
                name: stream.name,
              })),
            }
          : null,
    };
  }

  private async getOwnedChatOrThrow(
    userId: string,
    id: string,
    client: PrismaClientLike = this.prisma,
  ) {
    try {
      return await client.chat.findFirstOrThrow({
        where: {
          id,
          OR: this.ownedChatConditions(userId, true),
        },
        select: {
          id: true,
          streamId: true,
        },
      });
    } catch (error: unknown) {
      this.throwChatNotFoundIfNeeded(error);
    }
  }

  private async findAvailableChat(
    userId: string,
    streamId: string | null,
    client: PrismaClientLike = this.prisma,
  ) {
    return await client.chat.findFirst({
      where: {
        streamId,
        OR: this.ownedChatConditions(userId),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
  }

  private async createChat(userId: string, streamId: string | null) {
    const chat = await this.prisma.chat.create({
      data: {
        streamId,
      },
    });

    return this.mapChat(chat, userId);
  }

  private async resolveOwnedStreamId(userId: string, dto: CreateChatDto) {
    const streamId = dto.streamId ?? null;

    if (streamId) {
      await this.getOwnedStreamOrThrow(userId, streamId);
    }

    return streamId;
  }

  private async ensureChatDoesNotExist(
    userId: string,
    streamId: string | null,
  ) {
    const existingChat = await this.findAvailableChat(userId, streamId);

    if (existingChat) {
      throw new ConflictException('Chat already exists');
    }
  }

  private async findAvailableChatAfterCreateConflict(
    error: unknown,
    userId: string,
    streamId: string | null,
  ) {
    if (!this.isUniqueConstraintError(error)) {
      throw error;
    }

    const chat = await this.findAvailableChat(userId, streamId);

    if (!chat) {
      throw error;
    }

    return this.mapChat(chat, userId);
  }

  private async getOwnedStreamOrThrow(userId: string, id: string) {
    try {
      return await this.prisma.stream.findFirstOrThrow({
        where: { id, userId },
        select: { id: true },
      });
    } catch (error: unknown) {
      this.throwStreamNotFoundIfNeeded(error);
    }
  }

  private throwInvalidCursorIfNeeded(error: unknown): never {
    if (error instanceof DecodeCursorError) {
      throw new BadRequestException('Invalid cursor');
    }

    throw error;
  }

  private throwChatNotFoundIfNeeded(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Chat not found');
    }

    throw error;
  }

  private throwChatConflictIfNeeded(error: unknown): never {
    if (this.isUniqueConstraintError(error)) {
      throw new ConflictException('Chat already exists');
    }

    throw error;
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private mapChat<
    T extends {
      id: string;
      streamId: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
  >(chat: T, userId: string) {
    return {
      ...chat,
      userId,
    };
  }

  private ownedChatConditions(
    userId: string,
    allowUnclaimedGeneralChat = false,
  ): Prisma.ChatWhereInput[] {
    const conditions: Prisma.ChatWhereInput[] = [
      {
        stream: {
          userId,
        },
      },
      {
        streamId: null,
        messages: {
          some: {
            notes: {
              some: {
                userId,
              },
            },
          },
        },
      },
    ];

    if (allowUnclaimedGeneralChat) {
      conditions.push({
        streamId: null,
        messages: {
          none: {},
        },
      });
    }

    return conditions;
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
}
