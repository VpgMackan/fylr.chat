import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  StreamableFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

import { v4 as uuidv4 } from 'uuid';

import { FileService } from './file.service';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly fileSvc: FileService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const fileId = uuidv4() + '.' + file.originalname.split('.').pop();
    await this.fileSvc.upload('user-files', fileId, file.buffer, {
      'Content-Type': file.mimetype,
    });
    return { message: 'Uploaded successfully', fileId: fileId };
  }

  @Get(':id')
  async getFIle(
    @Param('id') id: string, // Directly get the id parameter
    @Res({ passthrough: true }) res: Response, // Inject Response and set passthrough
  ): Promise<StreamableFile> {
    try {
      // Get object stats first to check existence and get metadata
      const stat = await this.fileSvc.statObject('user-files', id);
      const stream = await this.fileSvc.getObject('user-files', id);

      // Set headers
      res.set({
        'Content-Type':
          stat.metaData['content-type'] || 'application/octet-stream', // Use stored mime type or default
        'Content-Disposition': 'inline', // Change 'attachment' to 'inline'
        'Content-Length': stat.size,
      });

      // Return streamable file
      return new StreamableFile(stream);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`File with id '${id}' not found.`);
      }
      // Re-throw other errors for NestJS default handling
      throw error;
    }
  }
}
