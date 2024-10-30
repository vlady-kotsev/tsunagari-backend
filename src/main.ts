import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SeederService } from './seeder/seeder.service';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'fatal', 'error', 'warn', 'debug'],
    });
    const configService = app.get(ConfigService);

    if (configService.get('db.seed')) {
      const seederService = app.get(SeederService);
      await seederService.seed();
    }

    await app.listen(configService.get('app.port') ?? 3000);
  } catch (error) {
    console.error(error);
  }
}
bootstrap();
