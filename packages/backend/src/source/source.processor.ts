import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Inject, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { Repository } from 'typeorm';

import { EventsGateway } from '../events/events.gateway';
import { S3Service } from './s3/s3.service';

import { ContentHandler } from './handler/content-handler.interface';
import { InjectRepository } from '@nestjs/typeorm';

import { Source } from './source.entity';

@Processor('file-processing')
export class SourceProcessor extends WorkerHost {
  private readonly logger = new Logger(SourceProcessor.name);

  constructor(
    private readonly events: EventsGateway,
    private readonly S3: S3Service,
    private readonly config: ConfigService,
    @Inject('CONTENT_HANDLERS')
    private readonly handlers: Map<string, ContentHandler>,
    @InjectRepository(Source)
    private sourceRepository: Repository<Source>,
  ) {
    super();
  }

  async process(job: Job): Promise<{ status: string; fileId?: string }> {
    if (job.name !== 'process-file')
      throw new Error(`Unknown job name: ${job.name}`);
    return this.processJob(job);
  }

  private async processJob(job: Job) {
    const { id, name, type, url, jobKey } = job.data;
    const notify = (s: string, m: string) =>
      this.events.sendJobUpdate(jobKey, s, { message: m });

    this.logger.log(`Starting job ${job.id} (${name})`);
    notify('processing', 'Validating file…');

    let buffer: Buffer;
    try {
      await SourceProcessor.ensureExists(url);
      buffer = await SourceProcessor.readFile(url);
      await this.upload(id, type, buffer);
      await this.handleContent(type, buffer, jobKey, id);
      await this.sourceRepository.update(id, {
        url: id,
        status: '-',
      });
      notify('completed', 'Done!');
      this.logger.log(`Completed job ${job.id}`);
      return { status: 'completed', fileId: id };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      notify('failed', error.message);
      throw error;
    } finally {
      await this.cleanup(url);
    }
  }

  private static ensureExists(path: string) {
    return fs.access(path);
  }

  private static readFile(path: string) {
    return fs.readFile(path);
  }

  private upload(id: string, type: string, buffer: Buffer) {
    const bucket = this.config.getOrThrow('S3_BUCKET_USER_FILE');
    return this.S3.upload(bucket, id, buffer, { 'Content-Type': type });
  }

  private async handleContent(
    type: string,
    buffer: Buffer,
    jobKey: string,
    fileId: string,
  ) {
    const handler = this.handlers.get(type);
    if (!handler) {
      this.logger.warn(
        `No handler for type ${type}, skipping content processing.`,
      );
      return;
    }
    return handler.handle(buffer, jobKey, fileId);
  }

  private async cleanup(path: string) {
    try {
      await fs.unlink(path);
      this.logger.log(`Cleaned up ${path}`);
    } catch {
      /* swallow */
    }
  }
}
