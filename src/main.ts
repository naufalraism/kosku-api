import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Do not advertise which framework runs the API.
  app.disable('x-powered-by');
  app.use((_req: unknown, res: { setHeader(name: string, value: string): void }, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // CORS_ORIGINS: comma-separated list of allowed frontend URLs, no trailing slash.
  // When unset (local development) every origin is allowed.
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins.length > 0 ? origins : true });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();