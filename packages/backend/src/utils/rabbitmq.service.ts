import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Channel } from 'amqplib';
import * as amqp from 'amqp-connection-manager';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.AmqpConnectionManager;
  private channel: amqp.ChannelWrapper;

  async onModuleInit() {
    try {
      this.connection = amqp.connect([
        process.env.RABBITMQ_URL || 'amqp://localhost',
      ]);
      this.channel = this.connection.createChannel({
        json: false,
        setup: async (channel: Channel) => {},
      });
    } catch (error) {
      console.error('RabbitMQ connection/channel error:', error);
      throw error;
    }
  }

  async sendToQueue(queue: string, data: any) {
    try {
      const queueOptions: any = { durable: true };

      if (queue === 'file-processing') {
        queueOptions.arguments = {
          'x-dead-letter-exchange': 'fylr-dlx',
          'x-dead-letter-routing-key': 'file-processing',
        };
      } else if (queue === 'summary-generator') {
        queueOptions.arguments = {
          'x-dead-letter-exchange': 'fylr-dlx',
          'x-dead-letter-routing-key': 'summary-generator',
        };
      }

      await this.channel.assertQueue(queue, queueOptions);
      await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
        persistent: true,
      });
    } catch (error) {
      console.error(`Error sending to queue "${queue}":`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
    } catch (error) {
      console.error(`Error closing connection and / or channel`);
      throw error;
    }
  }
}
