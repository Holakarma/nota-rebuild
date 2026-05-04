import { DocumentBuilder } from '@nestjs/swagger';

export function getSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle('Nota API')
    .setDescription('Nota backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
}
