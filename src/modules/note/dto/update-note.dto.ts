import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateNoteDto {
  @ApiProperty({
    description: 'note new content',
    example: 'note new content',
    minLength: 1,
    maxLength: 32768,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32768)
  bodyMarkdown!: string;
}
