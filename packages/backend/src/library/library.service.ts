import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionsService } from 'src/auth/permissions.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateLibraryDto,
  LibraryApiResponse,
  UpdateLibraryDto,
} from '@fylr/types';

@Injectable()
export class LibraryService {
  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
  ) {}

  async findMultipleByUserId(
    id: string,
    take = 10,
    offset = 0,
    searchTerm = '',
  ): Promise<LibraryApiResponse[]> {
    const libraries = await this.prisma.library.findMany({
      where: {
        userId: id,
        ...(searchTerm && {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { tags: { hasSome: [searchTerm] } },
          ],
        }),
      },
      include: { sources: true },
      orderBy: { createdAt: 'desc' },
      take,
      skip: offset,
    });

    if (!libraries || libraries.length === 0)
      throw new NotFoundException(
        `Libraries owned by user ID "${id}" could not be located in database`,
      );

    return libraries.map((p) => {
      const { createdAt, sources, ...rest } = p;
      return {
        ...rest,
        createdAt: createdAt.toISOString(),
        sources: sources.map((s) => ({
          ...s,
          size: s.size.toString(),
          uploadTime: s.uploadTime.toISOString(),
        })),
      };
    });
  }

  async listUserLibraries(userId: string) {
    return this.prisma.library.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneById(id: string, userId: string) {
    const library = await this.prisma.library.findFirst({
      where: { id, userId },
      include: { sources: true },
    });
    if (!library)
      throw new NotFoundException(
        `library with the ID "${id}" could not be located in database`,
      );

    return { library };
  }

  async createLibrary(data: CreateLibraryDto) {
    const canCreate = await this.permissionsService.canCreateLibrary(
      data.userId,
    );

    if (!canCreate) {
      throw new ForbiddenException(
        'You have reached the maximum number of libraries for your plan. Please upgrade to create more.',
      );
    }
    return await this.prisma.library.create({ data });
  }

  async updateLibrary(
    id: string,
    updateData: UpdateLibraryDto,
    userId: string,
  ) {
    return await this.prisma.library.update({
      where: { id, userId },
      data: updateData,
    });
  }

  async deleteLibrary(id: string, userId: string) {
    await this.findOneById(id, userId);
    return await this.prisma.library.delete({
      where: { id },
    });
  }
}
