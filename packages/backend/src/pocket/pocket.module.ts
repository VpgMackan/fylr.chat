import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from 'src/auth/auth.module';

import { PocketController } from './pocket.controller';
import { PocketService } from './pocket.service';

import { Pocket } from './pocket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pocket]), AuthModule],
  controllers: [PocketController],
  providers: [PocketService],
})
export class PocketModule {}
