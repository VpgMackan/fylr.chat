import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TypeOrmModule } from '@nestjs/typeorm';

import { MinioModule } from './minio/minio.module';

import { AppController } from './app.controller';
import { FileService } from './file.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PocketModule } from './pocket/pocket.module';

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
    MinioModule.registerAsync(),
    UsersModule,
    AuthModule,
    PocketModule,
  ],
  controllers: [AppController],
  providers: [FileService],
})
export class AppModule {}
