import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({
    description: 'note content',
    example: 'new note',
    minLength: 1,
    maxLength: 32768,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(32768)
  bodyMarkdown!: string;

  @ApiPropertyOptional({
    description: 'existing stream ids to link with this note',
    type: [String],
    format: 'uuid',
    maxItems: 20,
    example: ['1a6b43f3-d064-4e83-a9ec-fba73453a49c'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  streamIds?: string[];

  // @ApiPropertyOptional({
  //   description:
  //     'stream names to link with this note; missing streams are created automatically',
  //   type: [String],
  //   maxItems: 20,
  //   minLength: 1,
  //   maxLength: 128,
  //   example: ['work', 'ideas'],
  // })
  // @IsOptional()
  // @IsArray()
  // @ArrayMaxSize(20)
  // @ArrayUnique()
  // @IsString({ each: true })
  // @MinLength(1, { each: true })
  // @MaxLength(128, { each: true })
  // streamNames?: string[];
}
