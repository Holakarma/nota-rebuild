import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatMessageDto {
  @ApiProperty({
    description: 'full user message markdown, including optional stream lines',
    example: ':work\nNeed to follow up with Alex tomorrow',
    minLength: 1,
    maxLength: 32768,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32768)
  bodyMarkdown!: string;
}
