import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './core/app.module';
import cookieParser from 'cookie-parser';
import { setupSwagger } from './core/swagger/swagger.util';

export const GLOBAL_PREFIX = 'api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch(console.error);
