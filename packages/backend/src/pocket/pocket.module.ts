import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PocketController } from './pocket.controller';
import { PocketService } from './pocket.service';

import { Pocket } from './pocket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pocket])],
  controllers: [PocketController],
  providers: [PocketService],
})
export class PocketModule {}
