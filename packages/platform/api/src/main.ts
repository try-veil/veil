import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: process.env.CORS_METHODS?.split(','),
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(','),
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Veil API')
    .setDescription('The Veil API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Remove default bucket/endpoints without tags
  const paths = document.paths;
  for (const path in paths) {
    for (const method in paths[path]) {
      const operation = paths[path][method];
      if (!operation.tags || operation.tags.includes('default')) {
        delete paths[path][method];
      }
    }
    // If no methods left for a path, remove the entire path
    if (Object.keys(paths[path]).length === 0) {
      delete paths[path];
    }
  }

  fs.writeFileSync('./docs.json', JSON.stringify(document, null, 2));
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
