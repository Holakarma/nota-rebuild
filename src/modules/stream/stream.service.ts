import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Stream } from '@core/prisma/generated/prisma/client';
import { PrismaService } from '@core/prisma/prisma.service';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';
import { PaginationService } from '@shared/pagination/pagination.service';
import { DecodeCursorError } from '@shared/pagination/utils/codec.util';
import { SIMILAR_SEARCH_DEFAULT_LIMIT } from '@shared/similar-search/similar-search.constants';
import { CreateStreamDto } from './dto/create-stream.dto';
import { FindSimilarStreamsDto } from './dto/find-similar-streams.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { prepareStreamName } from './utils/prepare-stream-name.util';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

const SIMILAR_STREAMS_MIN_SCORE = 0.12;

@Injectable()
export class StreamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pagination: PaginationService,
  ) {}

  async create(userId: string, dto: CreateStreamDto) {
    const name = prepareStreamName(dto.name);

    try {
      await this.prisma.stream.create({
        data: {
          userId,
          name: name.name,
          normalizedName: name.normalizedName,
        },
      });

      return true;
    } catch (error: unknown) {
      this.throwStreamConflictIfNeeded(error);
    }
  }

  async findAll(userId: string, paginateDto: CursorPaginationDto) {
    try {
      const streams = await this.prisma.stream.findMany({
        where: { userId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        ...this.pagination.toPrismaCursorArgs<Prisma.StreamWhereUniqueInput>(
          paginateDto,
          (id) => ({ id }),
        ),
      });

      return this.pagination.toCursorPage(
        streams,
        paginateDto,
        (stream) => stream.id,
      );
    } catch (error: unknown) {
      this.throwInvalidCursorIfNeeded(error);
    }
  }

  async findSimilar(userId: string, dto: FindSimilarStreamsDto) {
    const limit = dto.limit ?? SIMILAR_SEARCH_DEFAULT_LIMIT;

    return await this.prisma.$queryRaw<Stream[]>`
      WITH "search" AS (
        SELECT
          (
            websearch_to_tsquery('pg_catalog.russian', ${dto.query}) ||
            websearch_to_tsquery('pg_catalog.english', ${dto.query}) ||
            websearch_to_tsquery('pg_catalog.simple', ${dto.query})
          ) AS "tsQuery",
          ${dto.query}::text AS "textQuery",
          lower(${dto.query}::text) AS "normalizedTextQuery"
      ),
      "scoredStreams" AS (
        SELECT
          "stream"."id",
          "stream"."user_id" AS "userId",
          "stream"."name",
          "stream"."normalized_name" AS "normalizedName",
          "stream"."created_at" AS "createdAt",
          "stream"."updated_at" AS "updatedAt",
          CASE
            WHEN numnode("search"."tsQuery") > 0
              THEN ts_rank_cd(
                (
                  setweight(to_tsvector('pg_catalog.russian', "stream"."name"), 'A') ||
                  setweight(to_tsvector('pg_catalog.english', "stream"."name"), 'A') ||
                  setweight(to_tsvector('pg_catalog.simple', "stream"."normalized_name"), 'D')
                ),
                "search"."tsQuery",
                32
              )
            ELSE 0
          END
          + greatest(
            coalesce(word_similarity("search"."textQuery", "stream"."name"), 0),
            coalesce(
              word_similarity(
                "search"."normalizedTextQuery",
                "stream"."normalized_name"
              ),
              0
            )
          ) AS "similarityScore"
        FROM "streams" AS "stream"
        CROSS JOIN "search"
        WHERE "stream"."user_id" = ${userId}::uuid
      )
      SELECT
        "id",
        "userId",
        "name",
        "normalizedName",
        "createdAt",
        "updatedAt"
      FROM "scoredStreams"
      WHERE "similarityScore" >= ${SIMILAR_STREAMS_MIN_SCORE}
      ORDER BY
        "similarityScore" DESC,
        "updatedAt" DESC,
        "id" DESC
      LIMIT ${limit}
    `;
  }

  async findOne(userId: string, id: string) {
    return await this.getOwnedStreamOrThrow(userId, id);
  }

  async update(userId: string, id: string, dto: UpdateStreamDto) {
    const name = prepareStreamName(dto.name);

    try {
      const stream = await this.getOwnedStreamOrThrow(userId, id);

      return await this.prisma.stream.update({
        where: { id: stream.id },
        data: {
          name: name.name,
          normalizedName: name.normalizedName,
        },
      });
    } catch (error: unknown) {
      this.throwStreamMutationError(error);
    }
  }

  async remove(userId: string, id: string) {
    try {
      const stream = await this.getOwnedStreamOrThrow(userId, id);

      await this.prisma.stream.delete({ where: { id: stream.id } });
    } catch (error: unknown) {
      this.throwStreamNotFoundIfNeeded(error);
    }

    return true;
  }

  private async getOwnedStreamOrThrow(
    userId: string,
    id: string,
    client: PrismaClientLike = this.prisma,
  ) {
    try {
      return await client.stream.findFirstOrThrow({
        where: { id, userId },
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

  private throwStreamConflictIfNeeded(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Stream with this name already exists');
    }

    throw error;
  }

  private throwStreamMutationError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Stream with this name already exists');
    }

    this.throwStreamNotFoundIfNeeded(error);
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
