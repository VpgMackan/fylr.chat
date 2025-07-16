import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PocketModule } from './pocket/pocket.module';
import { SourceModule } from './source/source.module';
import { EventsModule } from './events/events.module';
import { validate } from './config/config';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    PocketModule,
    SourceModule,
    EventsModule,
    ChatModule,
  ],
})
export class AppModule {}
