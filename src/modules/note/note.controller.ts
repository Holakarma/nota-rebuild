import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { NoteService } from './note.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Authorized } from '@modules/auth/decorators/authorized.decorator';
import { Authorization } from '@modules/auth/decorators/authorization.decorator';
import {
  ApiCreateNote,
  ApiDeleteNote,
  ApiFindSimilarNotes,
  ApiGetNoteById,
  ApiGetNotes,
  ApiNoteController,
  ApiUpdateNote,
} from './docs/note.swagger';
import { FindNotesDto } from './dto/find-notes.dto';
import { FindSimilarNotesDto } from './dto/find-similar-notes.dto';

@ApiNoteController()
@Controller('note')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @ApiCreateNote()
  @Authorization()
  @Post()
  async create(
    @Authorized('id') userId: string,
    @Body() createNoteDto: CreateNoteDto,
  ) {
    return await this.noteService.create(userId, createNoteDto);
  }

  @ApiGetNotes()
  @Authorization()
  @Get()
  async findAll(
    @Authorized('id') userId: string,
    @Query() paginateDto: FindNotesDto,
  ) {
    return await this.noteService.findAll(userId, paginateDto);
  }

  @ApiFindSimilarNotes()
  @Authorization()
  @Get('similar')
  async findSimilar(
    @Authorized('id') userId: string,
    @Query() dto: FindSimilarNotesDto,
  ) {
    return await this.noteService.findSimilar(userId, dto);
  }

  @ApiGetNoteById()
  @Authorization()
  @Get(':id')
  async findOne(@Authorized('id') userId: string, @Param('id') id: string) {
    return await this.noteService.findOne(userId, id);
  }

  @ApiUpdateNote()
  @Authorization()
  @Patch(':id')
  async update(
    @Authorized('id') userId: string,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdateNoteDto,
  ) {
    return await this.noteService.update(userId, id, updateNoteDto);
  }

  @ApiDeleteNote()
  @Authorization()
  @Delete(':id')
  async remove(@Authorized('id') userId: string, @Param('id') id: string) {
    return await this.noteService.remove(userId, id);
  }
}
