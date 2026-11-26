import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { EnvVars } from './config/env.validation';
import { parseTrustProxy } from './config/trust-proxy';

/**
 * HTTP-level configuration, shared by main.ts and the e2e tests so the tests
 * run against the same setup as the real server.
 */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService<EnvVars, true>);

  // So req.ip (and the login rate limit) is the PC on the LAN, not Nginx.
  (app as NestExpressApplication).set(
    'trust proxy',
    parseTrustProxy(
      config.get('TRUST_PROXY', { infer: true }),
      config.get('NODE_ENV', { infer: true }),
    ),
  );

  app.use(helmet());
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API docs are a development aid only.
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Office Registry API')
      .setDescription('Internal Police Office API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }
}
