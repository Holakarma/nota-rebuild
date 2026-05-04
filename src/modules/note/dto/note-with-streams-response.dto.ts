import { ApiProperty } from '@nestjs/swagger';

export class NoteListStreamResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '1a6b43f3-d064-4e83-a9ec-fba73453a49c',
  })
  id!: string;

  @ApiProperty({ example: 'work' })
  name!: string;
}

export class NoteWithStreamsResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '8e2d5c9a-2b19-4d2f-9a4e-7d1c2f6a9b10',
  })
  id!: string;

  @ApiProperty({ example: 'new note' })
  previewText!: string;

  @ApiProperty({
    description: 'streams linked with this note',
    type: () => [NoteListStreamResponseDto],
  })
  streams!: NoteListStreamResponseDto[];

  @ApiProperty({
    format: 'date-time',
    example: '2026-04-29T10:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    format: 'date-time',
    example: '2026-04-29T10:00:00.000Z',
  })
  createdAt!: Date;
}
