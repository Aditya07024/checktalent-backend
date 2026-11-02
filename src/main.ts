import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('CheckTalentAPI');
  const app = await NestFactory.create(AppModule);

  // Global API Prefix
  app.setGlobalPrefix('api');

  // CORS Configuration: allow all local origins (localhost, 127.0.0.1, LAN IPs) with credentials
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'RSC',
      'Next-Router-State-Tree',
      'Next-Router-Prefetch',
      'Next-Url',
    ],
  });

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`CheckTalent Backend API is running on http://localhost:${port}/api`);
  logger.log(`Health endpoint available at: http://localhost:${port}/api/health`);
}

await bootstrap();
