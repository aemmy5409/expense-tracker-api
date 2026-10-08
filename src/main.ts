import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';
import { SuccessResponseInterceptor } from './common/interceptor/success-response.interceptor.js';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  // Lets BullMQ workers and Redis connections close cleanly on SIGTERM
  // (e.g. a Railway redeploy) instead of leaving jobs stalled.
  // app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Expense Tracker API Reference')
    .setDescription('API for Expense Tracker via Scalar')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // 2. Generate the OpenAPI spec document object
  const document = SwaggerModule.createDocument(app, config);

  // 3. Serve the interactive Scalar UI on your desired route (e.g., /docs)
  app.use(
    '/docs',
    apiReference({
      spec: {
        content: document,
      },
    }),
  );

  app.useGlobalInterceptors(new SuccessResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const origins: string[] = ['http://localhost:5713'];
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'X-Requested-With',
      'Access-Control-Allow-Origin',
      'x-auth-token',
      'x-auth-refresh-token',
    ],
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Server running on port ${port}`);
}
bootstrap();
