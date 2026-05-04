import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { Authorized } from '@modules/auth/decorators/authorized.decorator';
import { Authorization } from '@modules/auth/decorators/authorization.decorator';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';
import {
  ApiAttachNoteToStream,
  ApiDetachNoteFromStream,
  ApiGetStreamNotes,
  ApiNoteStreamController,
} from './docs/note-stream.swagger';
import { NoteStreamService } from './note-stream.service';

@ApiNoteStreamController()
@Controller('stream/:streamId/notes')
export class NoteStreamController {
  constructor(private readonly noteStreamService: NoteStreamService) {}

  @ApiGetStreamNotes()
  @Authorization()
  @Get()
  async findNotes(
    @Authorized('id') userId: string,
    @Param('streamId') streamId: string,
    @Query() paginateDto: CursorPaginationDto,
  ) {
    return await this.noteStreamService.findNotes(
      userId,
      streamId,
      paginateDto,
    );
  }

  @ApiAttachNoteToStream()
  @Authorization()
  @Post(':noteId')
  async attachNote(
    @Authorized('id') userId: string,
    @Param('streamId') streamId: string,
    @Param('noteId') noteId: string,
  ) {
    return await this.noteStreamService.attachNote(userId, streamId, noteId);
  }

  @ApiDetachNoteFromStream()
  @Authorization()
  @Delete(':noteId')
  async detachNote(
    @Authorized('id') userId: string,
    @Param('streamId') streamId: string,
    @Param('noteId') noteId: string,
  ) {
    return await this.noteStreamService.detachNote(userId, streamId, noteId);
  }
}
