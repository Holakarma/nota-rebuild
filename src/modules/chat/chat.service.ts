import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatMessageKind,
  ChatMessageRole,
  NoteSourceType,
  Prisma,
} from '@core/prisma/generated/prisma/client';
import { PrismaService } from '@core/prisma/prisma.service';
import { NoteStreamService } from '@modules/note-stream/note-stream.service';
import { buildNoteContentFields } from '@modules/note/utils/note-content.util';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';
import { PaginationService } from '@shared/pagination/pagination.service';
import { DecodeCursorError } from '@shared/pagination/utils/codec.util';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { CreateChatDto } from './dto/create-chat.dto';
import { parseChatMessageForNote } from './utils/chat-message-parser.util';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

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
      return existingChat;
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
        where: { userId },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        ...this.pagination.toPrismaCursorArgs<Prisma.ChatWhereUniqueInput>(
          paginateDto,
          (id) => ({ id }),
        ),
      });

      return this.pagination.toCursorPage(
        chats,
        paginateDto,
        (chat) => chat.id,
      );
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
      const messages = await this.prisma.chatMessage.findMany({
        where: { chatId: chat.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...this.pagination.toPrismaCursorArgs<Prisma.ChatMessageWhereUniqueInput>(
          paginateDto,
          (id) => ({ id }),
        ),
      });

      return this.pagination.toCursorPage(
        messages,
        paginateDto,
        (message) => message.id,
      );
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
      const userMessage = await tx.chatMessage.create({
        data: {
          chatId: chat.id,
          role: ChatMessageRole.USER,
          kind: ChatMessageKind.USER_INPUT,
          bodyMarkdown: dto.bodyMarkdown,
        },
      });
      const streamIds = await this.noteStreamService.resolveStreamIdsForNote(
        userId,
        {
          streamIds: chat.streamId ? [chat.streamId] : [],
          streamNames: parsedMessage.streamNames,
          client: tx,
        },
      );
      const note = await tx.note.create({
        data: {
          userId,
          ...buildNoteContentFields(parsedMessage.bodyMarkdown),
          sourceType: NoteSourceType.WEB,
          sourceMessageId: userMessage.id,
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
      const systemMessage = await tx.chatMessage.create({
        data: {
          chatId: chat.id,
          role: ChatMessageRole.SYSTEM,
          kind: ChatMessageKind.NOTE_CREATED,
          bodyMarkdown: 'Создана заметка',
          replyToMessageId: userMessage.id,
          resultNoteId: note.id,
        },
      });

      await tx.chat.update({
        where: { id: chat.id },
        data: { updatedAt: new Date() },
      });

      return {
        userMessage,
        systemMessage,
      };
    });
  }

  private async getOwnedChatOrThrow(
    userId: string,
    id: string,
    client: PrismaClientLike = this.prisma,
  ) {
    try {
      return await client.chat.findFirstOrThrow({
        where: { id, userId },
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
      where: { userId, streamId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
  }

  private async createChat(userId: string, streamId: string | null) {
    return await this.prisma.chat.create({
      data: {
        userId,
        streamId,
      },
    });
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

    return chat;
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
