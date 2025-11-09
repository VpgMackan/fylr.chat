import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { GiftCardService } from './gift-card.service';
import { Throttle } from '@nestjs/throttler';
import { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';

@UseGuards(AuthGuard)
@Controller('gift-card')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('/redeem')
  redeemGiftCard(@Request() req: RequestWithUser, @Body('code') code: string) {
    return this.giftCardService.redeem(req.user.id, code);
  }
}
