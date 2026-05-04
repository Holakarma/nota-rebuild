import { ConfigService } from '@nestjs/config';

export const isDev = (config: ConfigService) =>
  config.getOrThrow('NODE_ENV') === 'development';
