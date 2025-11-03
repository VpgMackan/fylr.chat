import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionStatus, UserRole } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(userId: string) {
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: { userId },
      });
    }

    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.expiresAt &&
      subscription.expiresAt < new Date()
    ) {
      return this.expireSubscription(userId);
    }

    return subscription;
  }

  async activateSubscription(userId: string, days: number) {
    const subscription = await this.getSubscription(userId);

    let newExpiresAt: Date;

    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.expiresAt
    ) {
      newExpiresAt = new Date(
        subscription.expiresAt.getTime() + days * 24 * 60 * 60 * 1000,
      );
    } else {
      newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    const [updatedSubscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { userId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          expiresAt: newExpiresAt,
          remainingDurationOnPause: null,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.PRO },
      }),
    ]);

    return updatedSubscription;
  }

  async pauseSubscription(userId: string) {
    const subscription = await this.getSubscription(userId);

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException('Only active subscriptions can be paused.');
    }

    if (subscription.lastResumedAt) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (subscription.lastResumedAt > sevenDaysAgo) {
        throw new ForbiddenException(
          'You can only pause your subscription once per week.',
        );
      }
    }

    if (!subscription.expiresAt) {
      throw new NotFoundException('Subscription expiration date not found.');
    }
    const remainingMilliseconds =
      subscription.expiresAt.getTime() - new Date().getTime();
    if (remainingMilliseconds <= 0) {
      return this.expireSubscription(userId);
    }

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.PAUSED,
        remainingDurationOnPause: Math.floor(remainingMilliseconds / 1000), // store as seconds
        expiresAt: null,
        pausedAt: new Date(),
        user: {
          update: { role: UserRole.FREE },
        },
      },
    });
  }

  async resumeSubscription(userId: string) {
    const subscription = await this.getSubscription(userId);

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new ForbiddenException('Subscription is not paused.');
    }

    if (!subscription.remainingDurationOnPause) {
      throw new ForbiddenException('No remaining subscription time to resume.');
    }

    const newExpiresAt = new Date(
      Date.now() + subscription.remainingDurationOnPause * 1000,
    );

    return this.prisma.subscription.update({
      where: { userId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: newExpiresAt,
        remainingDurationOnPause: null,
        pausedAt: null,
        lastResumedAt: new Date(),
      },
    });
  }

  private async expireSubscription(userId: string) {
    const [updatedSubscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { userId },
        data: {
          status: SubscriptionStatus.EXPIRED,
          expiresAt: null,
          remainingDurationOnPause: null,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.FREE },
      }),
    ]);
    return updatedSubscription;
  }
}
