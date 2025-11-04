import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole, UsageRecordFeatrue } from '@prisma/client';

const PERIOD_START = {
  SUMMARY_GENERATION_MONTHLY: 'month',
  PODCATS_GENERATION_MONTHLY: 'month',
  CHAT_MESSAGES_DAILY: 'daily',
  CHAT_AGENTIC_MESSAGES_DAILY: 'daily',
  SOURCE_UPLOAD_DAILY: 'dailty',
};

const LIMITS = {
  FREE: {
    libraries: 10,
    sourcesPerLibrary: 50,
    SUMMARY_GENERATION_MONTHLY: 20,
    PODCAST_GENERATION_MONTHLY: 5,
    CHAT_MESSAGES_DAILY: 50,
    CHAT_AGENTIC_MESSAGES_DAILY: 20,
    SOURCE_UPLOAD_DAILY: 10,
  },
  PRO: {
    libraries: Infinity,
    sourcesPerLibrary: Infinity,
    SUMMARY_GENERATION_MONTHLY: Infinity,
    PODCAST_GENERATION_MONTHLY: Infinity,
    CHAT_MESSAGES_DAILY: Infinity,
    CHAT_AGENTIC_MESSAGES_DAILY: Infinity,
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

      if (user.role === UserRole.PRO) {
        return;
      }

      const limit = LIMITS.FREE[feature];
      const currentPeriodStart = this._getPeriodStart(feature);

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
          `You have reached your usage limit for this feature. Please upgrade to Pro.`,
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

    const limits = LIMITS[user.role];
    const currentPeriodStart = this._getPeriodStart(
      UsageRecordFeatrue.SOURCE_UPLOAD_DAILY,
    );

    const usageRecord = await this.prisma.usageRecord.findUnique({
      where: {
        userId_feature: {
          userId,
          feature: UsageRecordFeatrue.SOURCE_UPLOAD_DAILY,
        },
      },
    });

    let dailyUploadsUsed = 0;
    if (usageRecord && usageRecord.periodStart >= currentPeriodStart) {
      dailyUploadsUsed = usageRecord.usageCount;
    }

    return {
      role: user.role,
      limits: {
        libraries: limits.libraries,
        sourcesPerLibrary: limits.sourcesPerLibrary,
        dailySourceUploads: limits.SOURCE_UPLOAD_DAILY,
      },
      usage: {
        dailySourceUploads: dailyUploadsUsed,
      },
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
