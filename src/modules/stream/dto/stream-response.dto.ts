import { ApiProperty } from '@nestjs/swagger';

export class StreamResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '1a6b43f3-d064-4e83-a9ec-fba73453a49c',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    example: 'cecb38fb-dc6b-4b5f-9cf7-e733dbadbe7e',
  })
  userId!: string;

  @ApiProperty({ example: 'work' })
  name!: string;

  @ApiProperty({ example: 'work' })
  normalizedName!: string;

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
}
