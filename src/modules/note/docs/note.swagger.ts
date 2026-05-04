import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
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
import { CreateNoteDto } from '../dto/create-note.dto';
import { FindSimilarNotesDto } from '../dto/find-similar-notes.dto';
import { NoteResponseDto } from '../dto/note-response.dto';
import {
  NoteListStreamResponseDto,
  NoteWithStreamsResponseDto,
} from '../dto/note-with-streams-response.dto';
import { UpdateNoteDto } from '../dto/update-note.dto';

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

function ApiNoteIdParam() {
  return ApiParam({
    name: 'id',
    description: 'Note id',
    type: String,
    format: 'uuid',
  });
}

export function ApiNoteController() {
  return applyDecorators(
    ApiTags('note'),
    ApiBearerAuth(),
    ApiExtraModels(
      NoteResponseDto,
      FindSimilarNotesDto,
      NoteWithStreamsResponseDto,
      NoteListStreamResponseDto,
    ),
    ApiUnauthorizedResponse({ description: 'User is not authorized' }),
  );
}

export function ApiCreateNote() {
  return applyDecorators(
    ApiOperation({
      summary: 'create note',
      description:
        'Creates a note for the authorized user. Optional streamIds link existing user streams, optional streamNames create missing streams automatically and link them. The service stores full content in bodyMarkdown, stores markdown-stripped text in bodyText, uses the first 20 plain-text characters as previewText, and sets sourceType to WEB.',
    }),
    ApiBody({ type: CreateNoteDto }),
    ApiCreatedResponse({
      description: 'Note was created',
      schema: booleanSuccessResponseSchema,
    }),
    ApiBadRequestResponse({ description: 'Validation errors' }),
    ApiNotFoundResponse({ description: 'Stream not found' }),
  );
}

export function ApiGetNotes() {
  return applyDecorators(
    ApiOperation({
      summary: 'get notes',
      description:
        'Returns authorized user note cards with linked stream ids and names ordered by createdAt desc. Optionally filters notes by linked streamId. Uses cursor pagination: pass page.nextCursor from the previous response as cursor to get the next page.',
    }),
    ApiQuery({
      name: 'streamId',
      required: false,
      description: 'Return only notes linked with this stream id.',
      type: String,
      format: 'uuid',
    }),
    ApiQuery({
      name: 'cursor',
      required: false,
      description:
        'Cursor from page.nextCursor. The cursor is a base64url-encoded JSON string with a note id.',
      type: String,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Maximum number of notes to return.',
      type: Number,
      schema: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 20,
      },
    }),
    ApiOkResponse({
      description: 'Paginated authorized user notes',
      schema: noteCursorPaginationResponseSchema,
    }),
    ApiBadRequestResponse({
      description: 'Validation errors or invalid cursor',
    }),
  );
}

export function ApiFindSimilarNotes() {
  return applyDecorators(
    ApiOperation({
      summary: 'find similar notes',
      description:
        'Returns up to 5 authorized user note cards ranked by content similarity to the query string. Ranking combines multilingual PostgreSQL full-text search and trigram word similarity.',
    }),
    ApiQuery({
      name: 'query',
      required: true,
      description: 'Text used to find the closest notes by content.',
      type: String,
      schema: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
      },
    }),
    ApiOkResponse({
      description: 'Closest authorized user notes',
      type: [NoteWithStreamsResponseDto],
    }),
    ApiBadRequestResponse({
      description: 'Validation errors',
    }),
  );
}

export function ApiGetNoteById() {
  return applyDecorators(
    ApiOperation({
      summary: 'get note by id',
      description: 'Returns one note by id.',
    }),
    ApiNoteIdParam(),
    ApiOkResponse({
      description: 'Note found',
      type: NoteResponseDto,
    }),
    ApiNotFoundResponse({ description: 'Note not found' }),
  );
}

export function ApiUpdateNote() {
  return applyDecorators(
    ApiOperation({
      summary: 'update note',
      description:
        'Updates note content. The service updates bodyMarkdown, bodyText, and previewText.',
    }),
    ApiNoteIdParam(),
    ApiBody({ type: UpdateNoteDto }),
    ApiOkResponse({
      description: 'Note was updated',
      schema: booleanSuccessResponseSchema,
    }),
    ApiBadRequestResponse({ description: 'Validation errors' }),
    ApiNotFoundResponse({ description: 'Note not found' }),
  );
}

export function ApiDeleteNote() {
  return applyDecorators(
    ApiOperation({
      summary: 'delete note',
      description: 'Deletes a note.',
    }),
    ApiNoteIdParam(),
    ApiOkResponse({
      description: 'Note was deleted',
      schema: booleanSuccessResponseSchema,
    }),
    ApiNotFoundResponse({ description: 'Note not found' }),
  );
}
