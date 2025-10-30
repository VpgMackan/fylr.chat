import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

const LIMITS = {
  FREE: {
    libraries: 3,
    sourcesPerLibrary: 5,
  },
  PRO: {
    libraries: Infinity,
    sourcesPerLibrary: Infinity,
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
}
