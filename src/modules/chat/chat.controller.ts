import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Authorization } from '@modules/auth/decorators/authorization.decorator';
import { Authorized } from '@modules/auth/decorators/authorized.decorator';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';
import { ChatService } from './chat.service';
import {
  ApiChatController,
  ApiCreateChat,
  ApiCreateChatMessage,
  ApiEnsureChat,
  ApiGetChatMessages,
  ApiGetChats,
} from './docs/chat.swagger';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { CreateChatDto } from './dto/create-chat.dto';

@ApiChatController()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @ApiCreateChat()
  @Authorization()
  @Post()
  async create(
    @Authorized('id') userId: string,
    @Body() createChatDto: CreateChatDto,
  ) {
    return await this.chatService.create(userId, createChatDto);
  }

  @ApiEnsureChat()
  @Authorization()
  @Put()
  async ensure(
    @Authorized('id') userId: string,
    @Body() createChatDto: CreateChatDto,
  ) {
    return await this.chatService.findOrCreate(userId, createChatDto);
  }

  @ApiGetChats()
  @Authorization()
  @Get()
  async findAll(
    @Authorized('id') userId: string,
    @Query() paginateDto: CursorPaginationDto,
  ) {
    return await this.chatService.findAll(userId, paginateDto);
  }

  @ApiGetChatMessages()
  @Authorization()
  @Get(':chatId/messages')
  async findMessages(
    @Authorized('id') userId: string,
    @Param('chatId') chatId: string,
    @Query() paginateDto: CursorPaginationDto,
  ) {
    return await this.chatService.findMessages(userId, chatId, paginateDto);
  }

  @ApiCreateChatMessage()
  @Authorization()
  @Post(':chatId/messages')
  async createMessage(
    @Authorized('id') userId: string,
    @Param('chatId') chatId: string,
    @Body() createChatMessageDto: CreateChatMessageDto,
  ) {
    return await this.chatService.createMessage(
      userId,
      chatId,
      createChatMessageDto,
    );
  }
}
