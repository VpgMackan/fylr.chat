import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PermissionsService } from './permissions.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';

@Module({
  imports: [UsersModule, JwtModule.register({})],
  providers: [AuthService, PermissionsService, SubscriptionService],
  controllers: [AuthController, SubscriptionController],
  exports: [AuthService, JwtModule, PermissionsService],
})
export class AuthModule {}
