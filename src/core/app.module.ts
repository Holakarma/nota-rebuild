import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@modules/auth/auth.module';
import { ChatModule } from '@modules/chat/chat.module';
import { NoteModule } from '@modules/note/note.module';
import { NoteStreamModule } from '@modules/note-stream/note-stream.module';
import { StreamModule } from '@modules/stream/stream.module';
import { PaginationModule } from '@shared/pagination/pagination.module';
import { validateEnv } from './config/env.config';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    AuthModule,
    PaginationModule,
    StreamModule,
    NoteStreamModule,
    NoteModule,
    ChatModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
