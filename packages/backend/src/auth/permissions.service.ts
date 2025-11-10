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
          "You have reached your usage limit for this feature. Please upgrade to Pro.",
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
    const sourceUploadPeriodStart = this._getPeriodStart(
      UsageRecordFeatrue.SOURCE_UPLOAD_DAILY,
    );
    const dailyChatPeriodStart = this._getPeriodStart(
      UsageRecordFeatrue.CHAT_MESSAGES_DAILY,
    );
    const dailyAgenticPeriodStart = this._getPeriodStart(
      UsageRecordFeatrue.CHAT_AGENTIC_MESSAGES_DAILY,
    );

    const usageRecord = await this.prisma.usageRecord.findMany({
      where: {
        userId,
        OR: [
          { feature: UsageRecordFeatrue.SOURCE_UPLOAD_DAILY },
          { feature: UsageRecordFeatrue.CHAT_MESSAGES_DAILY },
          { feature: UsageRecordFeatrue.CHAT_AGENTIC_MESSAGES_DAILY },
        ],
      },
    });

    const dailyMessagesRecord = usageRecord.find(
      (r) => r.feature === UsageRecordFeatrue.CHAT_MESSAGES_DAILY,
    );
    const dailyAgenticMessagesRecord = usageRecord.find(
      (r) => r.feature === UsageRecordFeatrue.CHAT_AGENTIC_MESSAGES_DAILY,
    );
    const sourceUploadsRecord = usageRecord.find(
      (r) => r.feature === UsageRecordFeatrue.SOURCE_UPLOAD_DAILY,
    );

    const dailyMessagesUsed =
      dailyMessagesRecord &&
      dailyMessagesRecord.periodStart >= dailyChatPeriodStart
        ? dailyMessagesRecord.usageCount
        : 0;

    const dailyAgenticMessagesUsed =
      dailyAgenticMessagesRecord &&
      dailyAgenticMessagesRecord.periodStart >= dailyAgenticPeriodStart
        ? dailyAgenticMessagesRecord.usageCount
        : 0;

    const dailyUploadsUsed =
      sourceUploadsRecord &&
      sourceUploadsRecord.periodStart >= sourceUploadPeriodStart
        ? sourceUploadsRecord.usageCount
        : 0;

    return {
      role: user.role,
      limits: {
        libraries: limits.libraries,
        sourcesPerLibrary: limits.sourcesPerLibrary,
        dailySourceUploads: limits.SOURCE_UPLOAD_DAILY,
        dailyMessages: limits.CHAT_MESSAGES_DAILY,
        dailyAgenticMessages: limits.CHAT_AGENTIC_MESSAGES_DAILY,
      },
      usage: {
        dailySourceUploads: dailyUploadsUsed,
        dailyMessages: dailyMessagesUsed,
        dailyAgenticMessages: dailyAgenticMessagesUsed,
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
