import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSummaryDto } from '@fylr/types';
import { RabbitMQService } from 'src/utils/rabbitmq.service';

@Injectable()
export class SummaryService {
  constructor(
    private prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async getSummariesByLibraryId(
    libraryId: string,
    userId: string,
    take: number,
    offset: number,
    searchTerm = '',
  ) {
    const summaries = await this.prisma.summary.findMany({
      where: {
        libraryId,
        library: { userId },
        ...(searchTerm && {
          title: { contains: searchTerm, mode: 'insensitive' },
        }),
      },
      take,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    return summaries;
  }

  async getSummaryById(id: string, userId: string) {
    const summary = await this.prisma.summary.findFirst({
      where: {
        id,
        library: { userId },
      },
      include: { episodes: true },
    });
    if (!summary) {
      throw new NotFoundException(
        `Summary not found or you do not have permission to access it.`,
      );
    }
    return summary;
  }

  async createSummary(
    libraryId: string,
    userId: string,
    createSummaryDto: CreateSummaryDto,
  ) {
    const library = await this.prisma.library.findUnique({
      where: { id: libraryId },
    });

    if (!library || library.userId !== userId) {
      throw new NotFoundException(
        `Library with ID "${libraryId}" not found or access denied.`,
      );
    }

    const { title, episodes } = createSummaryDto;

    const newSummary = await this.prisma.summary.create({
      data: {
        title,
        libraryId,
        length: 0,
        generated: 'PENDING',
        episodes: {
          create: episodes.map((episode) => ({
            title: episode.title,
            focus: episode.focus,
            content: 'Generating...',
          })),
        },
      },
    });

    await this.rabbitMQService.sendToQueue('summary-generator', newSummary.id);

    return newSummary;
  }
}
