import { Module } from '@nestjs/common';

import { AuthModule } from 'src/auth/auth.module';

import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
