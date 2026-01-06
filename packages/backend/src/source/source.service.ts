import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from 'src/common/s3/s3.service';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from 'src/utils/rabbitmq.service';
import { PermissionsService } from 'src/auth/permissions.service';
import * as fs from 'fs/promises';
import { VectorSearchResult } from 'src/ai/reranking.service';
import { PosthogService } from 'src/posthog/posthog.service';

@Injectable()
export class SourceService {
  private readonly s3Bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly permissionsService: PermissionsService,
    private readonly posthogService: PosthogService,
  ) {
    const bucket = this.configService.get('S3_BUCKET_USER_FILE');
    if (!bucket) {
      throw new Error('S3_BUCKET_USER_FILE is not set in config');
    }
    this.s3Bucket = bucket;
  }

  async createSource(
    file: Express.Multer.File,
    libraryId: string,
    userId: string,
  ) {
    // Use transaction to prevent race conditions when checking source limits
    return await this.prisma.$transaction(
      async (tx) => {
        const library = await tx.library.findFirst({
          where: { id: libraryId, userId },
        });

        if (!library) {
          await fs.unlink(file.path);
          throw new NotFoundException(
            `Libary with ID "${libraryId}" not found or you do not have permission to access it.`,
          );
        }

        // Get user to check role
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          await fs.unlink(file.path);
          throw new NotFoundException('User not found.');
        }

        // Check source count limit within transaction to prevent race conditions
        const currentCount = await tx.source.count({ where: { libraryId } });
        const limit = user.role === 'PRO' ? Infinity : 50; // FREE users: 50 sources per library

        if (currentCount >= limit) {
          await fs.unlink(file.path);
          throw new ForbiddenException(
            'You have reached the maximum number of sources for this library. Please upgrade to add more.',
          );
        }

        // Check daily upload limit - if exceeded, allow deferred ingestion
        let shouldDeferIngestion = false;
        try {
          await this.permissionsService.authorizeFeatureUsage(
            userId,
            'SOURCE_UPLOAD_DAILY',
          );
        } catch (error) {
          if (error instanceof ForbiddenException) {
            // Allow upload but defer ingestion
            shouldDeferIngestion = true;
          } else {
            throw error;
          }
        }

        const jobKey = uuidv4();
        const s3Key = file.filename || file.originalname;

        try {
          const buffer = await fs.readFile(file.path);
          await this.s3Service.upload(this.s3Bucket, s3Key, buffer, {
            'Content-Type': file.mimetype,
          });
        } catch (error) {
          await fs.unlink(file.path);
          throw error;
        }

        await fs.unlink(file.path);

        const data: Prisma.SourceCreateInput = {
          library: { connect: { id: libraryId } },
          name: file.originalname,
          mimeType: file.mimetype,
          url: s3Key,
          size: file.size,
          jobKey,
          status: shouldDeferIngestion ? 'PENDING' : 'QUEUED',
          pendingIngestion: shouldDeferIngestion,
        };

        const entry = await tx.source.create({ data });

        // Capture PostHog event for source upload
        this.posthogService.capture(userId, 'source_uploaded', {
          sourceId: entry.id,
          libraryId,
          mimeType: file.mimetype,
          fileSize: file.size,
          deferred: shouldDeferIngestion,
        });

        // Only queue for processing if not deferred
        if (!shouldDeferIngestion) {
          await this.rabbitMQService.publishFileProcessingJob({
            sourceId: entry.id,
            s3Key,
            jobKey,
            embeddingModel: library.defaultEmbeddingModel,
          });
        }

        return {
          message: shouldDeferIngestion
            ? 'File uploaded successfully. Processing will start when your daily limit resets or you can manually trigger ingestion.'
            : 'File uploaded successfully and queued for processing.',
          jobKey,
          database: entry,
          deferred: shouldDeferIngestion,
        };
      },
      {
        timeout: 30000,
      },
    );
  }

  async deleteSource(sourceId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const source = await tx.source.findFirst({
        where: { id: sourceId, library: { userId } },
      });

      if (!source) {
        throw new NotFoundException('Source not found or not accessible');
      }

      await tx.vector.deleteMany({
        where: { fileId: sourceId },
      });

      // Delete the source record
      await tx.source.delete({
        where: { id: sourceId },
      });

      try {
        await this.s3Service.deleteObject(this.s3Bucket, source.url);
      } catch (error) {
        console.error('Failed to delete file from S3:', error);
      }

      return { message: 'Source deleted successfully' };
    });
  }

  async updateSource(
    sourceId: string,
    updateData: { name?: string },
    userId: string,
  ) {
    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, library: { userId } },
    });

    if (!source) {
      throw new NotFoundException('Source not found or not accessible');
    }

    return await this.prisma.source.update({
      where: { id: sourceId },
      data: updateData,
    });
  }

  async getSourcesByLibraryId(libraryId: string, userId: string) {
    return await this.prisma.source.findMany({
      where: { libraryId, library: { userId } },
      orderBy: { uploadTime: 'desc' },
    });
  }

  async getSourcesByLibraryIds(libraryIds: string[], userId: string) {
    return await this.prisma.source.findMany({
      where: {
        libraryId: { in: libraryIds },
        library: { userId },
      },
      orderBy: { uploadTime: 'desc' },
    });
  }

  async getSourcesByConversationId(conversationId: string, userId: string) {
    // Verify user has access to this conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        sources: {
          select: { id: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found or not accessible');
    }

    // Get the IDs of sources currently associated with this conversation
    const conversationSourceIds = new Set(
      conversation.sources.map((s) => s.id),
    );

    // Get all sources from user's libraries
    const allSources = await this.prisma.source.findMany({
      where: {
        library: { userId },
      },
      orderBy: { uploadTime: 'desc' },
    });

    // Map sources with isActive flag
    return allSources.map((source) => ({
      ...source,
      isActive: conversationSourceIds.has(source.id),
    }));
  }

  async findByVector(
    vector: number[],
    sourceIds: string[],
    limit = 5,
  ): Promise<VectorSearchResult[]> {
    if (sourceIds.length === 0) {
      return [];
    }

    const vectorSql = `[${vector.join(',')}]`;
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        v.id,
        v.file_id AS "fileId",
        v.content,
        v.chunk_index as "chunkIndex",
        s.id AS "source.id",
        s.library_id AS "source.libraryId",
        s.name AS "source.name"
      FROM "Vectors" v
      INNER JOIN "Sources" s ON s.id = v.file_id
      WHERE s.id IN (${Prisma.join(sourceIds)})
      ORDER BY v.embedding <-> ${vectorSql}::vector
      LIMIT ${limit}
    `;

    return result.map((item) => ({
      id: item.id,
      fileId: item.fileId,
      content: item.content,
      chunkIndex: item.chunkIndex,
      source: {
        id: item['source.id'],
        libraryId: item['source.libraryId'],
        name: item['source.name'],
      },
    }));
  }

  async getSourceURL(sourceId: string, userId: string) {
    return this.prisma.source.findFirst({
      where: { id: sourceId, library: { userId } },
    });
  }

  async getFileStreamForUser(fileId: string, userId: string) {
    const source = await this.prisma.source.findFirst({
      where: {
        id: fileId,
        library: {
          userId: userId,
        },
      },
    });
    if (!source) return null;

    const stream = await this.s3Service.getObject(this.s3Bucket, source.url);
    return {
      stream,
      contentType: source.mimeType,
      filename: source.name,
    };
  }

  async getVectorsBySourceId(sourceId: string, userId: string) {
    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, library: { userId } },
    });
    if (!source) {
      throw new NotFoundException('Source not found or not accessible');
    }
    return await this.prisma.vector.findMany({
      where: { fileId: sourceId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  async requeueSource(sourceId: string, userId: string) {
    const source = await this.prisma.source.findFirst({
      where: { id: sourceId, library: { userId } },
      include: { library: true },
    });

    if (!source) {
      throw new NotFoundException('Source not found or not accessible');
    }

    const newJobKey = uuidv4();

    // Update the source with new job key and reset status
    const updatedSource = await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        jobKey: newJobKey,
        status: 'QUEUED',
      },
    });

    // Publish new processing job
    await this.rabbitMQService.publishFileProcessingJob({
      sourceId: source.id,
      s3Key: source.url,
      jobKey: newJobKey,
      embeddingModel: source.library.defaultEmbeddingModel,
    });

    return {
      message: 'Source re-queued for processing successfully.',
      jobKey: newJobKey,
      source: updatedSource,
    };
  }

  async getPendingIngestionSources(userId: string) {
    return await this.prisma.source.findMany({
      where: {
        library: { userId },
        pendingIngestion: true,
        status: 'PENDING',
      },
      include: {
        library: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { uploadTime: 'desc' },
    });
  }

  async triggerIngestion(sourceId: string, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const source = await tx.source.findFirst({
        where: { id: sourceId, library: { userId }, pendingIngestion: true },
        include: { library: true },
      });

      if (!source) {
        throw new NotFoundException(
          'Pending source not found or not accessible',
        );
      }

      // Check daily upload limit
      await this.permissionsService.authorizeFeatureUsage(
        userId,
        'SOURCE_UPLOAD_DAILY',
      );

      const newJobKey = uuidv4();

      // Update the source to mark it as no longer pending
      const updatedSource = await tx.source.update({
        where: { id: sourceId },
        data: {
          jobKey: newJobKey,
          status: 'QUEUED',
          pendingIngestion: false,
        },
      });

      // Publish processing job
      await this.rabbitMQService.publishFileProcessingJob({
        sourceId: source.id,
        s3Key: source.url,
        jobKey: newJobKey,
        embeddingModel: source.library.defaultEmbeddingModel,
      });

      return {
        message: 'Source ingestion triggered successfully.',
        jobKey: newJobKey,
        source: updatedSource,
      };
    });
  }
}
