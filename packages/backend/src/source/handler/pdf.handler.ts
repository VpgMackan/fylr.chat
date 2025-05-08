import { Injectable, Logger } from '@nestjs/common';
import { ContentHandler } from './content-handler.interface';

@Injectable()
export class PdfHandler implements ContentHandler {
  readonly supportedMimeTypes = ['application/pdf'];
  private readonly logger = new Logger(PdfHandler.name);

  async handle(buffer: Buffer, jobKey: string, fileId: string): Promise<void> {
    this.logger.log(
      `Extracting PDF → markdown for job ${jobKey} ${buffer} ${fileId}`,
    );
    // …extract pdf, produce markdown…
    // then pass to MdHandler or inline MD logic
  }
}
