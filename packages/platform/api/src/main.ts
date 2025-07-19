import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3001', // Your frontend URL
      'http://localhost:3000', // Your API URL (for development)
      'http://localhost:3002', // Additional frontend ports if needed
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
