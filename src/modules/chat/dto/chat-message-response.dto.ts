import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChatMessageKind,
  ChatMessageRole,
} from '@core/prisma/generated/prisma/client';

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
    enum: ChatMessageKind,
    enumName: 'ChatMessageKind',
    example: ChatMessageKind.USER_INPUT,
  })
  kind!: ChatMessageKind;

  @ApiProperty({ example: ':work\nNeed to follow up with Alex tomorrow' })
  bodyMarkdown!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: null,
  })
  replyToMessageId!: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: '8e2d5c9a-2b19-4d2f-9a4e-7d1c2f6a9b10',
  })
  resultNoteId!: string | null;

  @ApiProperty({
    format: 'date-time',
    example: '2026-05-03T10:00:00.000Z',
  })
  createdAt!: Date;
}
