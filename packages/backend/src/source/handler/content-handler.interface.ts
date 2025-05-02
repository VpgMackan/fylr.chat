export interface ContentHandler {
  supportedMimeTypes: string[];
  handle(buffer: Buffer, jobKey: string, fileId: string): Promise<void>;
}
