import { Module } from '@nestjs/common';
import { GiftCardController } from './gift-card.controller';
import { GiftCardService } from './gift-card.service';
import { AuthModule } from 'src/auth/auth.module';
import { SubscriptionService } from 'src/auth/subscription.service';

@Module({
  imports: [AuthModule],
  controllers: [GiftCardController],
  providers: [GiftCardService, SubscriptionService],
})
export class GiftCardModule {}
