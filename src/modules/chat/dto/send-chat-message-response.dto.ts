import { ApiProperty } from '@nestjs/swagger';
import { ChatMessageResponseDto } from './chat-message-response.dto';

export class SendChatMessageResponseDto {
  @ApiProperty({ type: () => ChatMessageResponseDto })
  userMessage!: ChatMessageResponseDto;

  @ApiProperty({ type: () => ChatMessageResponseDto })
  systemMessage!: ChatMessageResponseDto;
}
