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
        setup: async (channel: Channel) => {
          // Declare the file-processing exchange for ingestors
          await channel.assertExchange('file-processing-exchange', 'topic', {
            durable: true,
          });
          // Declare the events exchange for status updates
          await channel.assertExchange('fylr-events', 'topic', {
            durable: true,
          });
        },
      });
    } catch (error) {
      console.error('RabbitMQ connection/channel error:', error);
      throw error;
    }
  }

  /**
   * Maps MIME types to routing keys for the file-processing-exchange.
   * This determines which ingestor will process the file.
   */
  private getRoutingKeyForMimeType(mimeType: string): string {
    const mimeToRoutingKey: { [key: string]: string } = {
      'application/pdf': 'pdf.v1',
      'text/markdown': 'markdown.v1',
      'text/plain': 'text.v1',
      'application/x-markdown': 'markdown.v1',
    };

    const routingKey = mimeToRoutingKey[mimeType];
    if (!routingKey) {
      console.warn(
        `No routing key found for MIME type: ${mimeType}, using text.v1 as fallback`,
      );
      return 'text.v1';
    }

    return routingKey;
  }

  /**
   * Publishes a file processing job to the file-processing-exchange.
   * The routing key is determined based on the file's MIME type.
   */
  async publishFileProcessingJob(data: {
    sourceId: string;
    s3Key: string;
    mimeType: string;
    jobKey: string;
    embeddingModel: string;
  }) {
    try {
      const routingKey = this.getRoutingKeyForMimeType(data.mimeType);

      await this.channel.publish(
        'file-processing-exchange',
        routingKey,
        Buffer.from(JSON.stringify(data)),
        {
          persistent: true,
        },
      );

      console.log(
        `[RabbitMQ] Published file processing job to exchange 'file-processing-exchange' with routing key '${routingKey}'`,
      );
    } catch (error) {
      console.error(
        `Error publishing to file-processing-exchange with routing key:`,
        error,
      );
      throw error;
    }
  }

  async sendToQueue(queue: string, data: any) {
    try {
      const queueOptions: any = { durable: true };

      if (queue === 'summary-generator') {
        queueOptions.arguments = {
          'x-dead-letter-exchange': 'fylr-dlx',
          'x-dead-letter-routing-key': 'summary-generator',
        };
      } else if (queue === 'podcast-generator') {
        queueOptions.arguments = {
          'x-dead-letter-exchange': 'fylr-dlx',
          'x-dead-letter-routing-key': 'podcast-generator',
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
