import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { SubscriptionService } from './subscription.service';
import { RequestWithUser } from './interfaces/request-with-user.interface';

@UseGuards(AuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  getSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.getSubscription(req.user.id);
  }

  @Post('activate')
  activateSubscription(
    @Request() req: RequestWithUser,
    @Body('days', ParseIntPipe) days: number,
  ) {
    return this.subscriptionService.activateSubscription(req.user.id, days);
  }

  @Post('pause')
  pauseSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.pauseSubscription(req.user.id);
  }

  @Post('resume')
  resumeSubscription(@Request() req: RequestWithUser) {
    return this.subscriptionService.resumeSubscription(req.user.id);
  }
}
