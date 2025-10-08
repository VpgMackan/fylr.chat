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

  async getPodcastsByLibraryId(
    libraryId: string,
    userId: string,
    take: number,
    offset: number,
    searchTerm = '',
  ) {
    const podcasts = await this.prisma.podcast.findMany({
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

    return podcasts;
  }

  async getPodcastById(id: string, userId: string) {
    const podcast = await this.prisma.podcast.findFirst({
      where: {
        id,
        library: { userId },
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
    libraryId: string,
    userId: string,
    createPodcastDto: CreatePodcastDto,
  ) {
    const library = await this.prisma.library.findUnique({
      where: { id: libraryId },
    });

    if (!library || library.userId !== userId) {
      throw new NotFoundException(
        `Library with ID "${libraryId}" not found or access denied.`,
      );
    }

    const { title } = createPodcastDto;

    const newPodcast = await this.prisma.podcast.create({
      data: {
        title,
        libraryId,
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

  async streamPodcastAudio(
    podcastId: string,
    episodeId: string,
    userId: string,
  ) {
    const podcast = await this.prisma.podcast.findFirst({
      where: {
        id: podcastId,
        library: { userId },
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
