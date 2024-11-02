import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'fatal', 'error', 'warn', 'debug'],
    });
  } catch (error) {
    console.error(error);
  }
}
bootstrap();
