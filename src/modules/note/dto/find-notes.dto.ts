import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';

export class FindNotesDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'filter notes by linked stream id',
    format: 'uuid',
    example: '1a6b43f3-d064-4e83-a9ec-fba73453a49c',
  })
  @IsOptional()
  @IsUUID()
  streamId?: string;
}
