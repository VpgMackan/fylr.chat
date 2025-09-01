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

  async getSummariesByPocketId(
    pocketId: string,
    userId: string,
    take: number,
    offset: number,
    searchTerm = '',
  ) {
    const summaries = await this.prisma.summary.findMany({
      where: {
        pocketId,
        pocket: { userId },
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
        pocket: { userId },
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
    pocketId: string,
    userId: string,
    createSummaryDto: CreateSummaryDto,
  ) {
    const pocket = await this.prisma.pocket.findUnique({
      where: { id: pocketId },
    });

    if (!pocket || pocket.userId !== userId) {
      throw new NotFoundException(
        `Pocket with ID "${pocketId}" not found or access denied.`,
      );
    }

    const { title, episodes } = createSummaryDto;

    const newSummary = await this.prisma.summary.create({
      data: {
        title,
        pocketId,
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
