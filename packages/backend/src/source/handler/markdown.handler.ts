import { Injectable, Logger } from '@nestjs/common';
import { ContentHandler } from './content-handler.interface';

@Injectable()
export class MarkdownHandler implements ContentHandler {
  readonly supportedMimeTypes = ['text/plain', 'text/markdown'];
  private readonly logger = new Logger(MarkdownHandler.name);

  async handle(buffer: Buffer, jobKey: string): Promise<void> {
    this.logger.log(`Chunking & vectorizing markdown for job ${jobKey}`);
    // …split into chunks, convert to vectors, persist…
  }
}
