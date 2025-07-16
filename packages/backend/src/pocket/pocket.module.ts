import { Module } from '@nestjs/common';

import { AuthModule } from 'src/auth/auth.module';

import { PocketController } from './pocket.controller';
import { PocketService } from './pocket.service';


@Module({
  imports: [AuthModule],
  controllers: [PocketController],
  providers: [PocketService],
})
export class PocketModule {}
