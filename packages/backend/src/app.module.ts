import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LibraryModule } from './library/library.module';
import { SourceModule } from './source/source.module';
import { EventsModule } from './events/events.module';
import { validate } from './config/config';
import { ChatModule } from './chat/chat.module';
import { SummaryModule } from './summary/summary.module';
import { PodcastModule } from './podcast/podcast.module';
import { GiftCardModule } from './gift-card/gift-card.module';
import { PosthogModule } from './posthog/posthog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    LibraryModule,
    SourceModule,
    EventsModule,
    ChatModule,
    SummaryModule,
    PodcastModule,
    GiftCardModule,
    PosthogModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
