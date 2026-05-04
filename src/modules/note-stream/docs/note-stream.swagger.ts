import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import {
  NoteListStreamResponseDto,
  NoteWithStreamsResponseDto,
} from '@modules/note/dto/note-with-streams-response.dto';

const booleanSuccessResponseSchema = {
  type: 'boolean',
  example: true,
};

const noteCursorPaginationResponseSchema = {
  type: 'object',
  properties: {
    result: {
      type: 'array',
      items: { $ref: getSchemaPath(NoteWithStreamsResponseDto) },
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
          example: 'IjhlMmQ1YzlhLTJiMTktNGQyZi05YTRlLTdkMWMyZjZhOWIxMCI',
        },
      },
      required: ['hasNextPage', 'nextCursor'],
    },
  },
  required: ['result', 'page'],
};

function ApiStreamIdParam() {
  return ApiParam({
    name: 'streamId',
    description: 'Stream id',
    type: String,
    format: 'uuid',
  });
}

function ApiNoteIdParam() {
  return ApiParam({
    name: 'noteId',
    description: 'Note id',
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

export function ApiNoteStreamController() {
  return applyDecorators(
    ApiTags('note-stream'),
    ApiBearerAuth(),
    ApiExtraModels(NoteWithStreamsResponseDto, NoteListStreamResponseDto),
    ApiUnauthorizedResponse({ description: 'User is not authorized' }),
  );
}

export function ApiGetStreamNotes() {
  return applyDecorators(
    ApiOperation({
      summary: 'get stream notes',
      description: 'Returns note cards linked to the stream.',
    }),
    ApiStreamIdParam(),
    ApiCursorPaginationQueries(
      'Cursor from page.nextCursor. The cursor is a base64url-encoded JSON string with a note id.',
    ),
    ApiOkResponse({
      description: 'Paginated stream notes',
      schema: noteCursorPaginationResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'Validation errors or invalid cursor',
    }),
    ApiNotFoundResponse({ description: 'Stream not found' }),
  );
}

export function ApiAttachNoteToStream() {
  return applyDecorators(
    ApiOperation({
      summary: 'attach note to stream',
      description:
        'Links a user note to a user stream. Existing links are kept idempotently.',
    }),
    ApiStreamIdParam(),
    ApiNoteIdParam(),
    ApiCreatedResponse({
      description: 'Note was attached to stream',
      schema: booleanSuccessResponseSchema,
    }),
    ApiNotFoundResponse({ description: 'Stream or note not found' }),
  );
}

export function ApiDetachNoteFromStream() {
  return applyDecorators(
    ApiOperation({
      summary: 'detach note from stream',
      description:
        'Removes only the note-stream link. If the note has no streams after that, it remains a note without stream.',
    }),
    ApiStreamIdParam(),
    ApiNoteIdParam(),
    ApiOkResponse({
      description: 'Note was detached from stream',
      schema: booleanSuccessResponseSchema,
    }),
    ApiNotFoundResponse({ description: 'Stream, note, or link not found' }),
  );
}
