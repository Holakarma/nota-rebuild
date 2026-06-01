import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatMessageRole } from '../constants/chat-message-role.constant';

export class ChatMessageStreamResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '1a6b43f3-d064-4e83-a9ec-fba73453a49c',
  })
  id!: string;

  @ApiProperty({ example: 'work' })
  name!: string;
}

export class ChatMessageResultNoteResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '8e2d5c9a-2b19-4d2f-9a4e-7d1c2f6a9b10',
  })
  id!: string;

  @ApiProperty({
    description: 'markdown-stripped preview text of the created note',
    example: 'Need to follow up with Alex tomorrow',
  })
  previewText!: string;

  @ApiProperty({
    description: 'names of all streams linked to the created note',
    type: [String],
    example: ['work'],
  })
  streamNames!: string[];
}

export class ChatMessageResultResponseDto {
  @ApiProperty({
    description: 'note created from this message',
    type: () => ChatMessageResultNoteResponseDto,
    nullable: true,
  })
  note!: ChatMessageResultNoteResponseDto | null;

  @ApiProperty({
    description: 'streams newly created while processing this message',
    type: () => [ChatMessageStreamResponseDto],
  })
  streams!: ChatMessageStreamResponseDto[];
}

export class ChatMessageResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '5e6ab56f-205c-4fd1-9d6b-bdddfb816c39',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    example: '2d203a13-3e78-4fcb-a31d-6dcbdf9ec88e',
  })
  chatId!: string;

  @ApiProperty({
    enum: ChatMessageRole,
    enumName: 'ChatMessageRole',
    example: ChatMessageRole.USER,
  })
  role!: ChatMessageRole;

  @ApiProperty({
    description: 'original user message markdown',
    example: ':work\nNeed to follow up with Alex tomorrow',
  })
  bodyMarkdown!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: null,
  })
  replyToMessageId!: string | null;

  @ApiProperty({
    description: 'message processing result',
    type: () => ChatMessageResultResponseDto,
    nullable: true,
  })
  result!: ChatMessageResultResponseDto | null;

  @ApiProperty({
    format: 'date-time',
    example: '2026-05-03T10:00:00.000Z',
  })
  createdAt!: Date;
}
