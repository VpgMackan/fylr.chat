import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
  Request,
  Response,
  StreamableFile,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

import { PodcastService } from './podcast.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreatePodcastDto } from '@fylr/types';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

@UseGuards(AuthGuard)
@Controller('podcast')
export class PodcastController {
  constructor(private podcastService: PodcastService) {}

  @Get('library/:libraryId')
  getPodcastsByLibraryId(
    @Param('libraryId') libraryId: string,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('searchTerm', new DefaultValuePipe('')) searchTerm: string,
    @Request() req: RequestWithUser,
  ) {
    return this.podcastService.getPodcastsByLibraryId(
      libraryId,
      req.user.id,
      take,
      offset,
      searchTerm,
    );
  }

  @Post('library/:libraryId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createPodcast(
    @Param('libraryId') libraryId: string,
    @Body() createPodcastDto: CreatePodcastDto,
    @Request() req: RequestWithUser,
  ) {
    return this.podcastService.createPodcast(
      libraryId,
      req.user.id,
      createPodcastDto,
    );
  }

  @Get('/:podcastId')
  getPodcastById(
    @Param('podcastId') podcastId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.podcastService.getPodcastById(podcastId, req.user.id);
  }

  @Get('/:podcastId/audio')
  async streamPodcastAudio(
    @Param('podcastId') podcastId: string,
    @Query('episodeId') episodeId: string,
    @Request() req: RequestWithUser,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const audioStream = await this.podcastService.streamPodcastAudio(
      podcastId,
      episodeId,
      req.user.id,
    );

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': 'inline',
    });

    return new StreamableFile(audioStream);
  }
}
