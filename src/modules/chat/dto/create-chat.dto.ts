import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateChatDto {
  @ApiPropertyOptional({
    description: 'existing stream id to bind this chat to',
    format: 'uuid',
    example: '1a6b43f3-d064-4e83-a9ec-fba73453a49c',
  })
  @IsOptional()
  @IsUUID()
  streamId?: string;
}
