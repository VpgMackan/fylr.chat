import { Module } from '@nestjs/common';

import { PdfHandler } from './pdf.handler';
import { MarkdownHandler } from './markdown.handler';
import { ContentHandler } from './content-handler.interface';

@Module({
  providers: [
    {
      provide: 'CONTENT_HANDLERS',
      useFactory: (pdf: PdfHandler, md: MarkdownHandler) => {
        const map = new Map<string, ContentHandler>();
        for (const h of [pdf, md]) {
          for (const type of h.supportedMimeTypes) {
            map.set(type, h);
          }
        }
        return map;
      },
      inject: [PdfHandler, MarkdownHandler],
    },
  ],
})
export class ContentModule {}
