import { Module } from '@nestjs/common';
import { NoteStreamController } from './note-stream.controller';
import { NoteStreamService } from './note-stream.service';

@Module({
  controllers: [NoteStreamController],
  providers: [NoteStreamService],
  exports: [NoteStreamService],
})
export class NoteStreamModule {}
