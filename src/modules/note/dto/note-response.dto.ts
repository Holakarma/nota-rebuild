import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NoteSourceType } from '../constants/note-source-type.constant';
import { NoteListStreamResponseDto } from './note-with-streams-response.dto';

export class NoteResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '8e2d5c9a-2b19-4d2f-9a4e-7d1c2f6a9b10',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    example: 'cecb38fb-dc6b-4b5f-9cf7-e733dbadbe7e',
  })
  userId!: string;

  @ApiProperty({ example: 'new note' })
  bodyMarkdown!: string;

  @ApiProperty({ example: 'new note' })
  bodyText!: string;

  @ApiProperty({ example: 'new note' })
  previewText!: string;

  @ApiProperty({
    description: 'streams linked with this note',
    type: () => [NoteListStreamResponseDto],
  })
  streams!: NoteListStreamResponseDto[];

  @ApiProperty({
    enum: NoteSourceType,
    enumName: 'NoteSourceType',
    example: NoteSourceType.WEB,
  })
  sourceType!: NoteSourceType;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  sourceMeta!: Record<string, unknown>;

  @ApiProperty({
    format: 'date-time',
    example: '2026-04-29T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    format: 'date-time',
    example: '2026-04-29T10:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
    example: null,
  })
  deletedAt!: Date | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: '5e6ab56f-205c-4fd1-9d6b-bdddfb816c39',
  })
  sourceMessageId!: string | null;
}
