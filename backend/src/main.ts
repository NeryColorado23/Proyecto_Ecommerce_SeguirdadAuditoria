import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

function parseAllowedOrigins(): string[] {
  const raw = process.env.FRONTEND_URL ?? 'http://localhost:4300';
  return raw.split(',').map((origin) => origin.trim());
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Render (y la mayoría de PaaS) ponen la app detrás de un proxy inverso.
  // Sin esto, req.ip siempre sería la IP interna del proxy: rompería tanto
  // la IP real en la bitácora de auditoría como el rate limiting por IP.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.enableCors({
    origin: parseAllowedOrigins(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
