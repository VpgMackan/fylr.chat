import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionService } from 'src/auth/subscription.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { validateGiftCardCode } from './gift-card.validator';

@Injectable()
export class GiftCardService {
  private readonly logger = new Logger(GiftCardService.name);
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async redeem(userId: string, code: string) {
    // Validate gift card code format before hitting the database
    if (!validateGiftCardCode(code)) {
      throw new BadRequestException('Invalid gift card code format');
    }

    const updatedSubscription = await this.prisma.$transaction(async (tx) => {
      const giftCard = await tx.giftCard.findFirst({ where: { code } });
      if (!giftCard || giftCard.status !== 'AVAILABLE')
        throw new NotFoundException('Gift card not available');

      await tx.giftCard.update({
        where: { code },
        data: {
          status: 'REDEEMED',
          redeemedByUserId: userId,
          redeemedAt: new Date(),
        },
      });

      return await this.subscriptionService.activateSubscription(
        userId,
        giftCard.days,
      );
    });

    this.logger.log(`User ${userId} redeemed gift card ${code}`);
    return updatedSubscription;
  }
}
