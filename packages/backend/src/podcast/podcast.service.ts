import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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

  async getPodcastsByUserId(
    userId: string,
    take: number,
    offset: number,
    searchTerm = '',
  ) {
    const podcasts = await this.prisma.podcast.findMany({
      where: {
        userId,
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
        userId,
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

  async createPodcast(userId: string, createPodcastDto: CreatePodcastDto) {
    const { title, libraryIds = [], sourceIds = [] } = createPodcastDto;

    if (libraryIds.length === 0 && sourceIds.length === 0) {
      throw new BadRequestException(
        'Either libraryIds or sourceIds must be provided.',
      );
    }

    const allSourceIds = new Set<string>(sourceIds);

    if (libraryIds.length > 0) {
      const libraries = await this.prisma.library.findMany({
        where: { id: { in: libraryIds }, userId },
        include: { sources: { select: { id: true } } },
      });

      if (libraries.length !== libraryIds.length) {
        throw new ForbiddenException('You do not own all specified libraries.');
      }

      libraries.forEach((lib) =>
        lib.sources.forEach((src) => allSourceIds.add(src.id)),
      );
    }

    if (sourceIds.length > 0) {
      const sources = await this.prisma.source.findMany({
        where: { id: { in: sourceIds }, library: { userId } },
      });
      if (sources.length !== sourceIds.length) {
        throw new ForbiddenException('You do not own all specified sources.');
      }
    }

    const newPodcast = await this.prisma.podcast.create({
      data: {
        title,
        userId,
        length: 0,
        generated: 'PENDING',
        episodes: {
          create: {
            title: title,
            focus: '',
            content: 'Generating...',
          },
        },
        sources: {
          connect: Array.from(allSourceIds).map((id) => ({ id })),
        },
      },
    });

    await this.rabbitMQService.sendToQueue('podcast-generator', newPodcast.id);

    return newPodcast;
  }

  async streamPodcastAudio(
    podcastId: string,
    episodeId: string,
    userId: string,
  ) {
    const podcast = await this.prisma.podcast.findFirst({
      where: {
        id: podcastId,
        userId,
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

    const episode = podcast.episodes.find((ep) => ep.id === episodeId);
    if (!episode) {
      throw new NotFoundException(
        `Episode with ID "${episodeId}" not found in this podcast.`,
      );
    }

    if (!episode.audioKey) {
      throw new NotFoundException(`Audio not available for this episode.`);
    }

    const bucket = this.configService.get<string>('S3_BUCKET_PODCAST_AUDIO');
    if (!bucket) {
      throw new Error('S3_BUCKET_PODCAST_AUDIO not configured');
    }

    return this.s3Service.getObject(bucket, episode.audioKey);
  }
}
