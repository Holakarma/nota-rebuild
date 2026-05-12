import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { FindSimilarNotesDto } from './dto/find-similar-notes.dto';
import { FindNotesDto } from './dto/find-notes.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteStreamService } from '@modules/note-stream/note-stream.service';
import { PaginationService } from '@shared/pagination/pagination.service';
import { DecodeCursorError } from '@shared/pagination/utils/codec.util';
import { NoteNotFoundError, NoteRepository } from './note.repository';
import { mapNoteListItemsWithStreams } from './utils/note-list-item.util';

@Injectable()
export class NoteService {
  constructor(
    private readonly noteRepository: NoteRepository,
    private readonly pagination: PaginationService,
    private readonly noteStreamService: NoteStreamService,
  ) {}

  async create(userId: string, dto: CreateNoteDto) {
    await this.noteRepository.create(userId, dto.bodyMarkdown, (tx) =>
      this.noteStreamService.resolveStreamIdsForNote(userId, {
        streamIds: dto.streamIds,
        client: tx,
      }),
    );

    return true;
  }

  async findAll(userId: string, dto: FindNotesDto) {
    try {
      const notes = await this.noteRepository.findAll(userId, dto);
      const page = this.pagination.toCursorPage(notes, dto, (note) => note.id);
      const streamsByNoteId = await this.noteStreamService.findStreamsByNoteIds(
        userId,
        page.result.map((note) => note.id),
      );

      return {
        ...page,
        result: mapNoteListItemsWithStreams(page.result, streamsByNoteId),
      };
    } catch (e: unknown) {
      if (e instanceof DecodeCursorError) {
        throw new BadRequestException('Invalid cursor');
      } else {
        throw e;
      }
    }
  }

  async findSimilar(userId: string, dto: FindSimilarNotesDto) {
    const notes = await this.noteRepository.findSimilar(userId, dto.query);
    const streamsByNoteId = await this.noteStreamService.findStreamsByNoteIds(
      userId,
      notes.map((note) => note.id),
    );

    return mapNoteListItemsWithStreams(notes, streamsByNoteId);
  }

  async findOne(userId: string, id: string) {
    try {
      const note = await this.noteRepository.findOwnedById(userId, id);

      return await this.mapNoteWithStreams(userId, note);
    } catch (error: unknown) {
      this.throwNoteNotFoundIfNeeded(error);
    }
  }

  async update(userId: string, id: string, dto: UpdateNoteDto) {
    try {
      const note = await this.noteRepository.updateOwnedContent(
        userId,
        id,
        dto.bodyMarkdown,
      );

      return await this.mapNoteWithStreams(userId, note);
    } catch (error: unknown) {
      this.throwNoteNotFoundIfNeeded(error);
    }
  }

  async remove(userId: string, id: string) {
    try {
      await this.noteRepository.deleteOwned(userId, id);

      return true;
    } catch (error: unknown) {
      this.throwNoteNotFoundIfNeeded(error);
    }
  }

  private throwNoteNotFoundIfNeeded(error: unknown): never {
    if (error instanceof NoteNotFoundError) {
      throw new NotFoundException('Note not found');
    }

    throw error;
  }

  private async mapNoteWithStreams<T extends { id: string }>(
    userId: string,
    note: T,
  ) {
    const streamsByNoteId = await this.noteStreamService.findStreamsByNoteIds(
      userId,
      [note.id],
    );

    return {
      ...note,
      streams: streamsByNoteId.get(note.id) ?? [],
    };
  }
}
