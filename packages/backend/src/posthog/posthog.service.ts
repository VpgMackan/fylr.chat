import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class PosthogService implements OnModuleDestroy {
  private client: PostHog | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('POSTHOG_API_KEY');
    const host = this.configService.get<string>(
      'POSTHOG_HOST',
      'https://eu.i.posthog.com',
    );

    if (apiKey) {
      this.client = new PostHog(apiKey, { host });
    }
  }

  capture(
    distinctId: string,
    event: string,
    properties?: Record<string, unknown>,
  ) {
    if (!this.client) {
      return;
    }

    this.client.capture({
      distinctId,
      event,
      properties,
    });
  }

  identify(distinctId: string, properties?: Record<string, unknown>) {
    if (!this.client) {
      return;
    }

    this.client.identify({
      distinctId,
      properties,
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.shutdown();
    }
  }
}
