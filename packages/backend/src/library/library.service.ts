import {
  BadRequestException,
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
import { AiVectorService } from 'src/ai/vector.service';
import { RabbitMQService } from 'src/utils/rabbitmq.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LibraryService {
  constructor(
    private prisma: PrismaService,
    private permissionsService: PermissionsService,
    private vectorService: AiVectorService,
    private readonly rabbitMQService: RabbitMQService,
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
    const newData = {
      defaultEmbeddingModel:
        await this.vectorService.getDefaultEmbeddingModel(),
      ...data,
    };

    if (!canCreate) {
      throw new ForbiddenException(
        'You have reached the maximum number of libraries for your plan. Please upgrade to create more.',
      );
    }
    return await this.prisma.library.create({ data: newData });
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

  async updateModel(id: string, userId: string) {
    const { library } = await this.findOneById(id, userId);
    const targetModel = await this.vectorService.getDefaultEmbeddingModel();

    if (library.defaultEmbeddingModel === targetModel) {
      throw new BadRequestException(
        'Library already uses the latest default embedding model.',
      );
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.library.update({
        where: { id: library.id },
        data: {
          migrationStatus: 'pending',
          reingestionStartedAt: now,
          defaultEmbeddingModel: targetModel,
        },
      });

      await tx.source.updateMany({
        where: { libraryId: library.id },
        data: {
          reingestionStatus: 'pending',
          reingestionStartedAt: now,
          reingestionCompletedAt: null,
        },
      });
    });

    const jobs = await Promise.all(
      library.sources.map(async (source) => {
        const jobKey = uuidv4();

        await this.rabbitMQService.publishReingestionJob({
          sourceId: source.id,
          jobKey,
          targetEmbeddingModel: targetModel,
        });

        return { sourceId: source.id, jobKey };
      }),
    );

    return {
      message: 'Library model update initiated.',
      libraryId: library.id,
      targetEmbeddingModel: targetModel,
      jobs,
    };
  }

  async getLibrariesRequiringMigration(userId: string) {
    const models = await this.vectorService.fetchModels();
    const modelMap = new Map(models.map((m) => [m.fullModel, m]));
    const defaultModel = models.find((m) => m.isDefault)?.fullModel;

    if (!defaultModel) {
      throw new BadRequestException('No default embedding model configured.');
    }

    const deprecatedSet = new Set(
      models.filter((m) => m.isDeprecated).map((m) => m.fullModel),
    );
    const knownModelSet = new Set(models.map((m) => m.fullModel));

    const libraries = await this.prisma.library.findMany({
      where: {
        userId,
        OR: [
          { defaultEmbeddingModel: { not: defaultModel } },
          { defaultEmbeddingModel: { in: Array.from(deprecatedSet) } },
          { defaultEmbeddingModel: { notIn: Array.from(knownModelSet) } },
        ],
      },
      select: {
        id: true,
        title: true,
        defaultEmbeddingModel: true,
      },
    });

    const deprecated: Array<{
      id: string;
      title: string;
      model: string;
      reason: 'deprecated' | 'unknown';
    }> = [];

    const nonDefault: Array<{
      id: string;
      title: string;
      model: string;
      reason: 'not-default';
    }> = [];

    libraries.forEach((library) => {
      const modelInfo = modelMap.get(library.defaultEmbeddingModel);
      const isDeprecated = modelInfo?.isDeprecated ?? !modelInfo;

      if (isDeprecated) {
        deprecated.push({
          id: library.id,
          title: library.title,
          model: library.defaultEmbeddingModel,
          reason: modelInfo ? 'deprecated' : 'unknown',
        });
        return;
      }

      if (library.defaultEmbeddingModel !== defaultModel) {
        nonDefault.push({
          id: library.id,
          title: library.title,
          model: library.defaultEmbeddingModel,
          reason: 'not-default',
        });
      }
    });

    return {
      defaultModel,
      deprecated,
      nonDefault,
    };
  }
}
