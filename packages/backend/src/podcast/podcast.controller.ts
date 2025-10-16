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
  Patch,
  Delete,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

import { PodcastService } from './podcast.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreatePodcastDto, UpdatePodcastDto } from '@fylr/types';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

@UseGuards(AuthGuard)
@Controller('podcast')
export class PodcastController {
  constructor(private podcastService: PodcastService) {}

  @Get('/')
  getPodcastsByLibraryId(
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
    @Query('searchTerm', new DefaultValuePipe('')) searchTerm: string,
    @Request() req: RequestWithUser,
  ) {
    return this.podcastService.getPodcastsByUserId(
      req.user.id,
      take,
      offset,
      searchTerm,
    );
  }

  @Post('/')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  createPodcast(
    @Body() createPodcastDto: CreatePodcastDto,
    @Request() req: RequestWithUser,
  ) {
    return this.podcastService.createPodcast(req.user.id, createPodcastDto);
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

  @Patch('/:podcastId')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  updatePodcast(
    @Param('podcastId') podcastId: string,
    @Body() updatePodcastDto: UpdatePodcastDto,
    @Request() req: RequestWithUser,
  ) {
    return this.podcastService.updatePodcast(
      podcastId,
      req.user.id,
      updatePodcastDto.title,
    );
  }

  @Delete('/:podcastId')
  deletePodcast(
    @Param('podcastId') podcastId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.podcastService.deletePodcast(podcastId, req.user.id);
  }
}
