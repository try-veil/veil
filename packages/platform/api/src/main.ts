import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as session from 'express-session';

async function bootstrap() {
  // Create a new logger instance
  const logger = new Logger('Application');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.use(
    session({
      secret: process.env.JWT_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60000 * 30, // 30 minutes
      },
    }),
  );

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  app.useLogger(logger);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Veil API')
    .setDescription('The Veil API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT || 3000);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
