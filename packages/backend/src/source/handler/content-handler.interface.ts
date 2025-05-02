export interface ContentHandler {
  supportedMimeTypes: string[];
  handle(buffer: Buffer, jobKey: string): Promise<void>;
}
