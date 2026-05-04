import { ApiProperty } from '@nestjs/swagger';

export class AuthResponse {
  @ApiProperty({
    description: 'JWT access token',
    example: 'etrf7AG7iFA78FAdsfaF...',
  })
  accessToken!: string;
}
