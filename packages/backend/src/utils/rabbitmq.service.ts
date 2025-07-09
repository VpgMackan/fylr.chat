import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Channel } from 'amqplib';
import * as amqp from 'amqp-connection-manager';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.AmqpConnectionManager;
  private channel: amqp.ChannelWrapper;

  async onModuleInit() {
    this.connection = amqp.connect([
      process.env.RABBITMQ_URL || 'amqp://localhost',
    ]);
    this.channel = this.connection.createChannel({
      json: false,
      setup: async (channel: Channel) => {
        // No-op, queues can be asserted on send
      },
    });
  }

  async sendToQueue(queue: string, data: any) {
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}
