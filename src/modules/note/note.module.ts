import { Module } from '@nestjs/common';
import { NoteStreamModule } from '@modules/note-stream/note-stream.module';
import { NoteRepository } from './note.repository';
import { NoteService } from './note.service';
import { NoteController } from './note.controller';

@Module({
  imports: [NoteStreamModule],
  controllers: [NoteController],
  providers: [NoteService, NoteRepository],
})
export class NoteModule {}
