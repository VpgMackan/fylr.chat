import { Controller, Get } from '@nestjs/common';
import { PocketsService } from './pockets.service';
import { Pocket } from 'src/common/interfaces/pocket.interface';

@Controller('pockets')
export class PocketsController {
  constructor(private readonly pocketsService: PocketsService) {}

  @Get()
  getHello(): Pocket[] {
    return this.pocketsService.getPockets();
  }
}
