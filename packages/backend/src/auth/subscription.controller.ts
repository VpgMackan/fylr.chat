import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { SubscriptionService } from './subscription.service';
import { RequestWithUser } from './interfaces/request-with-user.interface';
import { Throttle } from '@nestjs/throttler';

@UseGuards(AuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  getSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.getSubscription(req.user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('pause')
  pauseSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.pauseSubscription(req.user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('resume')
  resumeSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.resumeSubscription(req.user.id);
  }
}
