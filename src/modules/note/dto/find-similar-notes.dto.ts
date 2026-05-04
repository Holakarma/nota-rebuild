import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class FindSimilarNotesDto {
  @ApiProperty({
    description: 'Text used to find the closest notes by content',
    minLength: 1,
    maxLength: 500,
    example: 'meeting notes about project deadlines',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  query!: string;
}
