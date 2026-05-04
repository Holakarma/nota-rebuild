import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@core/prisma/generated/prisma/client';
import { PrismaService } from '@core/prisma/prisma.service';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';
import { PaginationService } from '@shared/pagination/pagination.service';
import { DecodeCursorError } from '@shared/pagination/utils/codec.util';
import { CreateStreamDto } from './dto/create-stream.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { prepareStreamName } from './utils/prepare-stream-name.util';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

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
