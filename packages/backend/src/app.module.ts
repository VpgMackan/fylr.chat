import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PocketsController } from './pockets/pockets.controller';
import { PocketsService } from './pockets/pockets.service';

@Module({
  imports: [],
  controllers: [AppController, PocketsController],
  providers: [AppService, PocketsService],
})
export class AppModule {}
