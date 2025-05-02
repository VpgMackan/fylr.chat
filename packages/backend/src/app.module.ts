import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PocketModule } from './pocket/pocket.module';
import { SourceModule } from './source/source.module';
import { EventsModule } from './events/events.module';
import { AiModule } from './aiService/aiService.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_URL'),
          port: configService.get('REDIS_PORT'),
        },
      }),
    }),
    UsersModule,
    AuthModule,
    PocketModule,
    SourceModule,
    EventsModule,
    AiModule,
  ],
})
export class AppModule {}
