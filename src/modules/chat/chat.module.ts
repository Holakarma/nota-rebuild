import { Module } from '@nestjs/common';
import { NoteStreamModule } from '@modules/note-stream/note-stream.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [NoteStreamModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
