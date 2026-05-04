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
import { CreateStreamDto } from '../dto/create-stream.dto';
import { StreamResponseDto } from '../dto/stream-response.dto';
import { UpdateStreamDto } from '../dto/update-stream.dto';

const booleanSuccessResponseSchema = {
  type: 'boolean',
  example: true,
};

const streamCursorPaginationResponseSchema = {
  type: 'object',
  properties: {
    result: {
      type: 'array',
      items: { $ref: getSchemaPath(StreamResponseDto) },
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
          example: 'IjFhNmI0M2YzLWQwNjQtNGU4My1hOWVjLWZiYTczNDUzYTQ5YyI',
        },
      },
      required: ['hasNextPage', 'nextCursor'],
    },
  },
  required: ['result', 'page'],
};

function ApiStreamIdParam() {
  return ApiParam({
    name: 'id',
    description: 'Stream id',
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

export function ApiStreamController() {
  return applyDecorators(
    ApiTags('stream'),
    ApiBearerAuth(),
    ApiExtraModels(StreamResponseDto),
    ApiUnauthorizedResponse({ description: 'User is not authorized' }),
  );
}

export function ApiCreateStream() {
  return applyDecorators(
    ApiOperation({
      summary: 'create stream',
      description:
        'Creates a stream for the authorized user. Stream names are unique per user after normalization.',
    }),
    ApiBody({ type: CreateStreamDto }),
    ApiCreatedResponse({
      description: 'Stream was created',
      type: StreamResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Validation errors' }),
    ApiConflictResponse({
      description: 'Stream with this name already exists',
    }),
  );
}

export function ApiGetStreams() {
  return applyDecorators(
    ApiOperation({
      summary: 'get streams',
      description: 'Returns authorized user streams ordered by name.',
    }),
    ApiCursorPaginationQueries(
      'Cursor from page.nextCursor. The cursor is a base64url-encoded JSON string with a stream id.',
    ),
    ApiOkResponse({
      description: 'Paginated authorized user streams',
      schema: streamCursorPaginationResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'Validation errors or invalid cursor',
    }),
  );
}

export function ApiGetStreamById() {
  return applyDecorators(
    ApiOperation({
      summary: 'get stream by id',
      description: 'Returns one stream by id.',
    }),
    ApiStreamIdParam(),
    ApiOkResponse({
      description: 'Stream found',
      type: StreamResponseDto,
    }),
    ApiNotFoundResponse({ description: 'Stream not found' }),
  );
}

export function ApiUpdateStream() {
  return applyDecorators(
    ApiOperation({
      summary: 'update stream',
      description: 'Updates stream name.',
    }),
    ApiStreamIdParam(),
    ApiBody({ type: UpdateStreamDto }),
    ApiOkResponse({
      description: 'Stream was updated',
      type: StreamResponseDto,
    }),
    ApiBadRequestResponse({ description: 'Validation errors' }),
    ApiConflictResponse({
      description: 'Stream with this name already exists',
    }),
    ApiNotFoundResponse({ description: 'Stream not found' }),
  );
}

export function ApiDeleteStream() {
  return applyDecorators(
    ApiOperation({
      summary: 'delete stream',
      description:
        'Deletes a stream owned by the user. Notes are not deleted; only note-stream links are removed by the database relation.',
    }),
    ApiStreamIdParam(),
    ApiOkResponse({
      description: 'Stream was deleted',
      schema: booleanSuccessResponseSchema,
    }),
    ApiNotFoundResponse({ description: 'Stream not found' }),
  );
}
