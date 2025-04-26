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
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { v4 as uuidv4 } from 'uuid';
import { SourceService } from './source.service';

@Controller('source')
export class SourceController {
  /*private readonly userFilesBucket: string;

  constructor(
    private readonly sourceService: SourceService,
    private readonly configService: ConfigService,
  ) {
    this.userFilesBucket = this.configService.getOrThrow<string>(
      'MINIO_BUCKET_USER_FILE',
    );
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const fileId = uuidv4();
    const originalName = file.originalname;
    const fileExtension = originalName.split('.').pop() || '';
    const objectName = fileExtension ? `${fileId}.${fileExtension}` : fileId;

    await this.fileSvc.upload(this.userFilesBucket, objectName, file.buffer, {
      'Content-Type': file.mimetype,
      'Original-Filename': originalName,
    });
    return { message: 'Uploaded successfully', fileId: objectName };
  }

  @Get('/file/:id')
  async getFile(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    try {
      const stat = await this.fileSvc.statObject(this.userFilesBucket, id);
      const stream = await this.fileSvc.getObject(this.userFilesBucket, id);

      // Set headers
      res.set({
        'Content-Type':
          stat.metaData['content-type'] || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Content-Length': stat.size,
      });

      return new StreamableFile(stream);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`File with id '${id}' not found.`);
      }
      throw error;
    }
  }*/
}
