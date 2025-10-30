import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Get,
  Param,
  Res,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SourceService } from './source.service';
import { AuthGuard } from 'src/auth/auth.guard';

import { CreateSourceDto } from '@fylr/types';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

const allowedExtensions = [
  '.pdf',
  '.txt',
  '.md',
  '.markdown',
  '.docx',
  '.pptx',
];

export const fileFilter = (_req, file, cb) => {
  const extension = file.originalname.toLowerCase().split('.').pop();
  const extensionWithDot = `.${extension}`;

  if (allowedExtensions.includes(extensionWithDot)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        `Invalid file type. Allowed extensions: ${allowedExtensions.join(
          ', ',
        )}. Received: ${file.originalname}`,
      ),
      false,
    );
  }
};

@UseGuards(AuthGuard)
@Controller('source')
export class SourceController {
  constructor(private readonly sourceService: SourceService) {}

  @Post('')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file', { fileFilter }))
  async createSource(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateSourceDto,
    @Request() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file provided. Ensure you are sending multipart/form-data with a field named "file".',
      );
    }

    if (!file.size || file.size === 0) {
      throw new BadRequestException(
        `File is empty or size could not be determined. File details: ${JSON.stringify(
          {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          },
        )}`,
      );
    }

    return this.sourceService.createSource(file, body.libraryId, req.user.id);
  }

  @Get('library/:libraryId')
  async getSourcesByLibraryId(
    @Param('libraryId') libraryId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.sourceService.getSourcesByLibraryId(libraryId, req.user.id);
  }

  @Get('access/:sourceId')
  async getSourceURL(
    @Param('sourceId') sourceId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.sourceService.getSourceURL(sourceId, req.user.id);
  }

  @Get('file/:fileId')
  async serveFile(
    @Param('fileId') fileId: string,
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const fileStreamData = await this.sourceService.getFileStreamForUser(
      fileId,
      req.user.id,
    );
    if (!fileStreamData) {
      throw new BadRequestException('File not found.');
    }
    res.setHeader('Content-Type', fileStreamData.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${fileStreamData.filename}"`,
    );
    fileStreamData.stream.pipe(res);
  }

  @Get(':sourceId/vectors')
  async getVectors(
    @Param('sourceId') sourceId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.sourceService.getVectorsBySourceId(sourceId, req.user.id);
  }

  @Post(':sourceId/requeue')
  @HttpCode(HttpStatus.ACCEPTED)
  async requeueSource(
    @Param('sourceId') sourceId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.sourceService.requeueSource(sourceId, req.user.id);
  }
}
