import { Injectable } from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/prisma/client';
import { PrismaService } from '@core/prisma/prisma.service';
import { PaginationService } from '@shared/pagination/pagination.service';
import { SIMILAR_SEARCH_DEFAULT_LIMIT } from '@shared/similar-search/similar-search.constants';
import { FindNotesDto } from './dto/find-notes.dto';
import { buildNoteContentFields } from './utils/note-content.util';
import {
  type NoteListItem,
  noteListItemSelect,
} from './utils/note-list-item.util';

const SIMILAR_NOTES_MIN_SCORE = 0.12;

export const noteWithSourceMessageSelect = {
  id: true,
  userId: true,
  bodyMarkdown: true,
  bodyText: true,
  previewText: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  messageResults: {
    select: {
      messageId: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 1,
  },
} as const satisfies Prisma.NoteSelect;

export type NoteWithSourceMessage = Prisma.NoteGetPayload<{
  select: typeof noteWithSourceMessageSelect;
}>;

type ResolveNoteStreamIds = (
  client: Prisma.TransactionClient,
) => Promise<string[]>;

export class NoteNotFoundError extends Error {
  constructor() {
    super('Note not found');
  }
}

@Injectable()
export class NoteRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
  ) {}

  async create(
    userId: string,
    bodyMarkdown: string,
    resolveStreamIds: ResolveNoteStreamIds,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const streamIds = await resolveStreamIds(tx);

      await tx.note.create({
        data: {
          userId,
          ...buildNoteContentFields(bodyMarkdown),
          ...(streamIds.length > 0 && {
            noteStreams: {
              createMany: {
                data: streamIds.map((streamId) => ({ streamId })),
                skipDuplicates: true,
              },
            },
          }),
        },
      });
    });
  }

  async findAll(userId: string, dto: FindNotesDto): Promise<NoteListItem[]> {
    const where: Prisma.NoteWhereInput = {
      userId,
      deletedAt: null,
      ...(dto.streamId && {
        noteStreams: {
          some: {
            streamId: dto.streamId,
            stream: {
              userId,
            },
          },
        },
      }),
    };

    return await this.prisma.note.findMany({
      where,
      select: noteListItemSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...this.pagination.toPrismaCursorArgs<Prisma.NoteWhereUniqueInput>(
        dto,
        (id) => ({ id }),
      ),
    });
  }

  async findSimilar(
    userId: string,
    query: string,
    limit = SIMILAR_SEARCH_DEFAULT_LIMIT,
  ): Promise<NoteListItem[]> {
    return await this.prisma.$queryRaw<NoteListItem[]>`
      WITH "search" AS (
        SELECT
          (
            websearch_to_tsquery('pg_catalog.russian', ${query}) ||
            websearch_to_tsquery('pg_catalog.english', ${query}) ||
            websearch_to_tsquery('pg_catalog.simple', ${query})
          ) AS "tsQuery",
          ${query}::text AS "textQuery"
      ),
      "scoredNotes" AS (
        SELECT
          "note"."id",
          "note"."preview_text" AS "previewText",
          "note"."updated_at" AS "updatedAt",
          "note"."created_at" AS "createdAt",
          CASE
            WHEN numnode("search"."tsQuery") > 0
              THEN coalesce(
                ts_rank_cd("note"."search_vector", "search"."tsQuery", 32),
                0
              )
            ELSE 0
          END
          + coalesce(
            word_similarity("search"."textQuery", "note"."body_text"),
            0
          ) AS "similarityScore"
        FROM "notes" AS "note"
        CROSS JOIN "search"
        WHERE
          "note"."user_id" = ${userId}::uuid
          AND "note"."deleted_at" IS NULL
      )
      SELECT
        "id",
        "previewText",
        "updatedAt",
        "createdAt"
      FROM "scoredNotes"
      WHERE "similarityScore" >= ${SIMILAR_NOTES_MIN_SCORE}
      ORDER BY
        "similarityScore" DESC,
        "updatedAt" DESC,
        "id" DESC
      LIMIT ${limit}
    `;
  }

  async findOwnedById(userId: string, id: string) {
    try {
      return await this.prisma.note.findFirstOrThrow({
        where: { id, userId },
        select: noteWithSourceMessageSelect,
      });
    } catch (error: unknown) {
      this.throwNoteNotFoundIfNeeded(error);
    }
  }

  async updateOwnedContent(userId: string, id: string, bodyMarkdown: string) {
    try {
      const note = await this.findOwnedById(userId, id);

      return await this.prisma.note.update({
        where: {
          id: note.id,
        },
        data: buildNoteContentFields(bodyMarkdown),
        select: noteWithSourceMessageSelect,
      });
    } catch (error: unknown) {
      this.throwNoteNotFoundIfNeeded(error);
    }
  }

  async deleteOwned(userId: string, id: string) {
    try {
      const note = await this.findOwnedById(userId, id);

      await this.prisma.note.delete({ where: { id: note.id } });
    } catch (error: unknown) {
      this.throwNoteNotFoundIfNeeded(error);
    }
  }

  private throwNoteNotFoundIfNeeded(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NoteNotFoundError();
    }

    throw error;
  }
}
