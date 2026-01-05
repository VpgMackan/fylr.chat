import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole, UsageRecordFeatrue } from '@prisma/client';

const LIMITS = {
  FREE: {
    libraries: 10,
    sourcesPerLibrary: 50,
    SUMMARY_GENERATION_MONTHLY: 20,
    PODCAST_GENERATION_MONTHLY: 5,
    CHAT_AUTO_MESSAGES_DAILY: 20,
    CHAT_FAST_MESSAGES_DAILY: 20,
    CHAT_NORMAL_MESSAGES_DAILY: 10,
    CHAT_THOROUGH_MESSAGES_DAILY: 5,
    SOURCE_UPLOAD_DAILY: 10,
  },
  PRO: {
    libraries: Infinity,
    sourcesPerLibrary: Infinity,
    SUMMARY_GENERATION_MONTHLY: Infinity,
    PODCAST_GENERATION_MONTHLY: Infinity,
    CHAT_AUTO_MESSAGES_DAILY: 100,
    CHAT_FAST_MESSAGES_DAILY: 100,
    CHAT_NORMAL_MESSAGES_DAILY: 50,
    CHAT_THOROUGH_MESSAGES_DAILY: 25,
    SOURCE_UPLOAD_DAILY: Infinity,
  },
};

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async canCreateLibrary(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    const currentCount = await this.prisma.library.count({ where: { userId } });
    const limit = LIMITS[user.role].libraries;

    return currentCount < limit;
  }

  async canAddSourceToLibrary(
    userId: string,
    libraryId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return false;

    const currentCount = await this.prisma.source.count({
      where: { libraryId },
    });
    const limit = LIMITS[user.role].sourcesPerLibrary;

    return currentCount < limit;
  }

  canUseAdvancedTool(userRole: UserRole): boolean {
    return userRole === 'PRO';
  }

  async authorizeFeatureUsage(
    userId: string,
    feature: UsageRecordFeatrue,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found.');
      }

      const limit = LIMITS[user.role][feature];
      const currentPeriodStart = this._getPeriodStart(feature);

      if (user.role === UserRole.PRO) {
        // For PRO users, increment usage but don't enforce limits
        const usageRecord = await tx.usageRecord.findUnique({
          where: { userId_feature: { userId, feature } },
        });

        if (!usageRecord) {
          await tx.usageRecord.create({
            data: {
              userId,
              feature,
              usageCount: 1,
              periodStart: currentPeriodStart,
            },
          });
        } else {
          if (usageRecord.periodStart < currentPeriodStart) {
            await tx.usageRecord.update({
              where: { id: usageRecord.id },
              data: { usageCount: 1, periodStart: currentPeriodStart },
            });
          } else {
            await tx.usageRecord.update({
              where: { id: usageRecord.id },
              data: { usageCount: { increment: 1 } },
            });
          }
        }
        return;
      }

      const usageRecord = await tx.usageRecord.findUnique({
        where: { userId_feature: { userId, feature } },
      });

      if (!usageRecord) {
        await tx.usageRecord.create({
          data: {
            userId,
            feature,
            usageCount: 1,
            periodStart: currentPeriodStart,
          },
        });
        return;
      }

      if (usageRecord.periodStart < currentPeriodStart) {
        await tx.usageRecord.update({
          where: { id: usageRecord.id },
          data: { usageCount: 1, periodStart: currentPeriodStart },
        });
        return;
      }

      if (usageRecord.usageCount >= limit) {
        throw new ForbiddenException(
          'You have reached your usage limit for this feature. Please upgrade to Pro.',
        );
      }

      await tx.usageRecord.update({
        where: { id: usageRecord.id },
        data: { usageCount: { increment: 1 } },
      });
    });
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const roleLimits = LIMITS[user.role];
    const featureKeys = Object.keys(roleLimits).filter(
      (k) => k.endsWith('_DAILY') || k.endsWith('_MONTHLY'),
    ) as Array<UsageRecordFeatrue>;

    const periodStartByFeature: Record<UsageRecordFeatrue, Date> =
      Object.fromEntries(
        featureKeys.map((f) => [f, this._getPeriodStart(f)]),
      ) as Record<UsageRecordFeatrue, Date>;

    const usageRecords = await this.prisma.usageRecord.findMany({
      where: {
        userId,
        feature: { in: featureKeys },
      },
      select: { feature: true, usageCount: true, periodStart: true },
    });

    const recordByFeature = new Map(usageRecords.map((r) => [r.feature, r]));

    const { usageByFeature, limitsByFeature } = featureKeys.reduce(
      (
        acc,
        feature,
      ): {
        usageByFeature: Record<UsageRecordFeatrue, number>;
        limitsByFeature: Record<UsageRecordFeatrue, number>;
      } => {
        const record = recordByFeature.get(feature);
        acc.usageByFeature[feature] =
          record && record.periodStart >= periodStartByFeature[feature]
            ? record.usageCount
            : 0;
        acc.limitsByFeature[feature] = roleLimits[
          feature as keyof typeof roleLimits
        ] as number;
        return acc;
      },
      {
        usageByFeature: {} as Record<UsageRecordFeatrue, number>,
        limitsByFeature: {} as Record<UsageRecordFeatrue, number>,
      },
    );

    return {
      role: user.role,
      limits: {
        libraries: roleLimits.libraries,
        sourcesPerLibrary: roleLimits.sourcesPerLibrary,
        features: limitsByFeature,
      },
      usage: usageByFeature,
    };
  }

  /**
   * Helper to get the start of the current period for a given feature.
   */
  private _getPeriodStart(feature: UsageRecordFeatrue): Date {
    const now = new Date();
    if (feature.endsWith('_MONTHLY')) {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    if (feature.endsWith('_DAILY')) {
      return new Date(now.setHours(0, 0, 0, 0));
    }
    throw new Error(`Invalid feature period definition for ${feature}`);
  }
}
