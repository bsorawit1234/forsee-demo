import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

export async function createApp() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: ['health/{*path}'] });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use((request: { headers: Record<string, string | string[] | undefined>; id?: string }, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    const header = request.headers['x-request-id'];
    const requestId = typeof header === 'string' && header.length <= 100 ? header : randomUUID();
    request.id = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  });
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Foresee Reservation API')
    .setDescription('Booking and operations API for Foresee Corporation')
    .setVersion('1.0')
    .addCookieAuth('session')
    .addTag('health')
    .addTag('bookings')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'openapi.json' });
  app.getHttpAdapter().getInstance().forseeOpenapiDocument = document;

  return app;
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(Number(process.env.API_PORT ?? 3000), '0.0.0.0');
}

if (process.env.NODE_ENV !== 'test' || process.env.START_SERVER === 'true') {
  void bootstrap();
}
