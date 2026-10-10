import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS_ORIGINS: comma-separated list of allowed frontend URLs, no trailing slash,
  // e.g. https://kosku.pages.dev. When unset (local development) every origin is allowed.
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins.length > 0 ? origins : true });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
