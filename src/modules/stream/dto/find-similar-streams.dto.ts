import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  SIMILAR_SEARCH_DEFAULT_LIMIT,
  SIMILAR_SEARCH_MAX_LIMIT,
  SIMILAR_SEARCH_MIN_LIMIT,
} from '@shared/similar-search/similar-search.constants';

export class FindSimilarStreamsDto {
  @ApiProperty({
    description: 'Text used to find the closest streams by name',
    minLength: 1,
    maxLength: 500,
    example: 'work projects',
  })
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  query!: string;

  @ApiPropertyOptional({
    description: 'Maximum number of similar streams to return',
    minimum: SIMILAR_SEARCH_MIN_LIMIT,
    maximum: SIMILAR_SEARCH_MAX_LIMIT,
    default: SIMILAR_SEARCH_DEFAULT_LIMIT,
    example: SIMILAR_SEARCH_DEFAULT_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(SIMILAR_SEARCH_MIN_LIMIT)
  @Max(SIMILAR_SEARCH_MAX_LIMIT)
  limit = SIMILAR_SEARCH_DEFAULT_LIMIT;
}
