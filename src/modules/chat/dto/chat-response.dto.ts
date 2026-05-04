import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '2d203a13-3e78-4fcb-a31d-6dcbdf9ec88e',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    example: 'cecb38fb-dc6b-4b5f-9cf7-e733dbadbe7e',
  })
  userId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    example: '1a6b43f3-d064-4e83-a9ec-fba73453a49c',
  })
  streamId!: string | null;

  @ApiProperty({
    format: 'date-time',
    example: '2026-05-03T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    format: 'date-time',
    example: '2026-05-03T10:00:00.000Z',
  })
  updatedAt!: Date;
}
