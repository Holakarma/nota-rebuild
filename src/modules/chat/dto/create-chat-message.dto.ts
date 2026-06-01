import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateChatMessageDto {
  @ApiProperty({
    description:
      'Full user message markdown. Non-blank leading and trailing lines that start with ":" are parsed as stream names and excluded from the created note body.',
    example: ':work\nNeed to follow up with Alex tomorrow',
    minLength: 1,
    maxLength: 32768,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32768)
  bodyMarkdown!: string;
}
