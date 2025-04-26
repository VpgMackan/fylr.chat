import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Request,
  UseGuards,
  BadRequestException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { AuthGuard } from 'src/auth/auth.guard';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

import { PocketService } from './pocket.service';

@Controller('pocket')
export class PocketController {
  constructor(private pocketService: PocketService) {}

  @UseGuards(AuthGuard)
  @Get()
  getPockets(@Request() req: RequestWithUser) {
    return this.pocketService.findMultipleByUserId(req.user.id);
  }
}
