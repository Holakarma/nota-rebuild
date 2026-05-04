import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ChatMessageResponseDto } from '../dto/chat-message-response.dto';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { CreateChatMessageDto } from '../dto/create-chat-message.dto';
import { CreateChatDto } from '../dto/create-chat.dto';
import { SendChatMessageResponseDto } from '../dto/send-chat-message-response.dto';

const chatCursorPaginationResponseSchema = {
  type: 'object',
  properties: {
    result: {
      type: 'array',
      items: { $ref: getSchemaPath(ChatResponseDto) },
    },
    page: {
      type: 'object',
      properties: {
        hasNextPage: {
          type: 'boolean',
          example: true,
        },
        nextCursor: {
          type: 'string',
          nullable: true,
          example: 'IjJkMjAzYTEzLTNlNzgtNGZjYi1hMzFkLTZkY2JkZjllYzg4ZSI',
        },
      },
      required: ['hasNextPage', 'nextCursor'],
    },
  },
  required: ['result', 'page'],
};

const messageCursorPaginationResponseSchema = {
  type: 'object',
  properties: {
    result: {
      type: 'array',
      items: { $ref: getSchemaPath(ChatMessageResponseDto) },
    },
    page: {
      type: 'object',
      properties: {
        hasNextPage: {
          type: 'boolean',
          example: true,
        },
        nextCursor: {
          type: 'string',
          nullable: true,
          example: 'IjVlNmFiNTZmLTIwNWMtNGZkMS05ZDZiLWJkZGRmYjgxNmMzOSI',
        },
      },
      required: ['hasNextPage', 'nextCursor'],
    },
  },
  required: ['result', 'page'],
};

function ApiChatIdParam() {
  return ApiParam({
    name: 'chatId',
    description: 'Chat id',
    type: String,
    format: 'uuid',
  });
}

function ApiCursorPaginationQueries(description: string) {
  return applyDecorators(
    ApiQuery({
      name: 'cursor',
      required: false,
      description,
      type: String,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Maximum number of items to return.',
      type: Number,
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
    }),
  );
}

export function ApiChatController() {
  return applyDecorators(
    ApiTags('chat'),
    ApiBearerAuth(),
    ApiExtraModels(
      ChatResponseDto,
      ChatMessageResponseDto,
      SendChatMessageResponseDto,
    ),
    ApiUnauthorizedResponse({ description: 'User is not authorized' }),
  );
}

export function ApiCreateChat() {
  return applyDecorators(
    ApiOperation({
      summary: 'create chat',
      description:
        'Creates a chat for the authorized user and optional streamId. Optional streamId must belong to the user. Returns conflict if this chat already exists.',
    }),
    ApiBody({ type: CreateChatDto }),
    ApiCreatedResponse({
      description: 'Chat was created',
      type: ChatResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Validation errors' }),
    ApiConflictResponse({ description: 'Chat already exists' }),
    ApiNotFoundResponse({ description: 'Stream not found' }),
  );
}

export function ApiEnsureChat() {
  return applyDecorators(
    ApiOperation({
      summary: 'ensure chat',
      description:
        'Creates or returns the single chat for the authorized user and optional streamId. Optional streamId must belong to the user.',
    }),
    ApiBody({ type: CreateChatDto }),
    ApiOkResponse({
      description: 'Existing or newly created chat',
      type: ChatResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Validation errors' }),
    ApiNotFoundResponse({ description: 'Stream not found' }),
  );
}

export function ApiGetChats() {
  return applyDecorators(
    ApiOperation({
      summary: 'get chats',
      description:
        'Returns authorized user chats ordered by updatedAt desc. Uses cursor pagination.',
    }),
    ApiCursorPaginationQueries(
      'Cursor from page.nextCursor. The cursor is a base64url-encoded JSON string with a chat id.',
    ),
    ApiOkResponse({
      description: 'Paginated authorized user chats',
      schema: chatCursorPaginationResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'Validation errors or invalid cursor',
    }),
  );
}

export function ApiGetChatMessages() {
  return applyDecorators(
    ApiOperation({
      summary: 'get chat messages',
      description:
        'Returns messages of one authorized user chat ordered by createdAt desc.',
    }),
    ApiChatIdParam(),
    ApiCursorPaginationQueries(
      'Cursor from page.nextCursor. The cursor is a base64url-encoded JSON string with a chat message id.',
    ),
    ApiOkResponse({
      description: 'Paginated chat messages',
      schema: messageCursorPaginationResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'Validation errors or invalid cursor',
    }),
    ApiNotFoundResponse({ description: 'Chat not found' }),
  );
}

export function ApiCreateChatMessage() {
  return applyDecorators(
    ApiOperation({
      summary: 'send chat message',
      description:
        'Creates a USER_INPUT message, one note from cleaned text, and a NOTE_CREATED system message in a single transaction.',
    }),
    ApiChatIdParam(),
    ApiBody({ type: CreateChatMessageDto }),
    ApiCreatedResponse({
      description: 'Chat message was processed',
      type: SendChatMessageResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'Validation errors or empty note body after stream lines',
    }),
    ApiNotFoundResponse({ description: 'Chat not found' }),
  );
}
