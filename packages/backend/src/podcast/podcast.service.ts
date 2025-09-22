import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePodcastDto } from '@fylr/types';
import { RabbitMQService } from 'src/utils/rabbitmq.service';
import { S3Service } from 'src/common/s3/s3.service';

@Injectable()
export class PodcastService {
  constructor(
    private prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async getPodcastsByPocketId(
    pocketId: string,
    userId: string,
    take: number,
    offset: number,
    searchTerm = '',
  ) {
    const podcasts = await this.prisma.podcast.findMany({
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

    return podcasts;
  }

  async getPodcastById(id: string, userId: string) {
    const podcast = await this.prisma.podcast.findFirst({
      where: {
        id,
        pocket: { userId },
      },
      include: { episodes: true },
    });
    if (!podcast) {
      throw new NotFoundException(
        `Podcast not found or you do not have permission to access it.`,
      );
    }
    return podcast;
  }

  async createPodcast(
    pocketId: string,
    userId: string,
    createPodcastDto: CreatePodcastDto,
  ) {
    const pocket = await this.prisma.pocket.findUnique({
      where: { id: pocketId },
    });

    if (!pocket || pocket.userId !== userId) {
      throw new NotFoundException(
        `Pocket with ID "${pocketId}" not found or access denied.`,
      );
    }

    const { title } = createPodcastDto;

    const newPodcast = await this.prisma.podcast.create({
      data: {
        title,
        pocketId,
        length: 0,
        generated: 'PENDING',
        episodes: {
          create: {
            title: title,
            focus: '',
            content: 'Generating...',
          },
        },
      },
    });

    await this.rabbitMQService.sendToQueue('podcast-generator', newPodcast.id);

    return newPodcast;
  }

  async streamPodcastAudio(podcastId: string, userId: string) {
    const podcast = await this.prisma.podcast.findFirst({
      where: {
        id: podcastId,
        pocket: { userId },
      },
      include: {
        episodes: true,
      },
    });

    if (!podcast) {
      throw new NotFoundException(
        `Podcast not found or you do not have permission to access it.`,
      );
    }

    if (podcast.episodes.length === 0) {
      throw new NotFoundException(`No episode found in this podcast.`);
    }

    const episode = podcast.episodes[0];
    if (!episode.audioKey) {
      throw new NotFoundException(`Audio not available for this podcast.`);
    }

    const bucket = this.configService.get<string>('S3_BUCKET_PODCAST_AUDIO');
    if (!bucket) {
      throw new Error('S3_BUCKET_PODCAST_AUDIO not configured');
    }

    return this.s3Service.getObject(bucket, episode.audioKey);
  }
}
