import {
  Logger,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as amqp from 'amqp-connection-manager';
import { Channel, ConsumeMessage } from 'amqplib';
import { UserPayload } from '@fylr/types';

interface ClientConnectionInfo {
  userId: string;
  queueName: string;
  consumerTag: string;
}

@Injectable()
@WSGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class WebSocketGateway
  implements
    OnModuleInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private amqpConnection: amqp.AmqpConnectionManager;
  private amqpChannel: amqp.ChannelWrapper;
  private readonly exchangeName = 'fylr-events';

  private clientConnections = new Map<string, ClientConnectionInfo>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.initializeRabbitMQ();
  }

  async onModuleDestroy() {
    this.logger.log('Closing RabbitMQ connections...');
    await this.amqpConnection?.close();
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        throw new Error('No authentication token provided.');
      }
      const payload: UserPayload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      const userId = payload.id;

      this.logger.log(`Client connected: ${client.id}, UserID: ${userId}`);

      const queueName = `ws.user.${userId}.${client.id}`;
      await this.amqpChannel.assertQueue(queueName, {
        exclusive: true,
        autoDelete: true,
      });

      await this.amqpChannel.bindQueue(
        queueName,
        this.exchangeName,
        `user.${userId}.#`,
      );
      await this.amqpChannel.bindQueue(
        queueName,
        this.exchangeName,
        "broadcast.#",
      );

      const { consumerTag } = await this.amqpChannel.consume(queueName, (msg) =>
        this.forwardMessageToClient(client, msg),
      );

      this.clientConnections.set(client.id, { userId, queueName, consumerTag });
      client.emit('connected', {
        message: 'Successfully connected to gateway.',
      });
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}: ${error.message}`,
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const connectionInfo = this.clientConnections.get(client.id);

    if (connectionInfo) {
      try {
        await this.amqpChannel.cancel(connectionInfo.consumerTag);
        this.logger.log(
          `Cancelled consumer and cleaned up queue for ${client.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Error during disconnect cleanup for ${client.id}:`,
          error,
        );
      } finally {
        this.clientConnections.delete(client.id);
      }
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscription(
    @MessageBody() topic: string,
    @ConnectedSocket() client: Socket,
  ) {
    const connectionInfo = this.clientConnections.get(client.id);
    if (!connectionInfo) {
      return { error: 'Client not properly initialized.' };
    }

    if (!topic || !/^[a-zA-Z0-9-]+\..+$/.test(topic)) {
      return { error: `Invalid topic format: ${topic}` };
    }

    try {
      await this.amqpChannel.bindQueue(
        connectionInfo.queueName,
        this.exchangeName,
        topic,
      );
      this.logger.log(`Client ${client.id} subscribed to topic: ${topic}`);
      return { status: 'subscribed', topic };
    } catch (error) {
      this.logger.error(
        `Failed to subscribe client ${client.id} to ${topic}:`,
        error,
      );
      return { error: `Failed to subscribe to topic ${topic}` };
    }
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscription(
    @MessageBody() topic: string,
    @ConnectedSocket() client: Socket,
  ) {
    const connectionInfo = this.clientConnections.get(client.id);
    if (connectionInfo && topic) {
      await this.amqpChannel.unbindQueue(
        connectionInfo.queueName,
        this.exchangeName,
        topic,
      );
      this.logger.log(`Client ${client.id} unsubscribed from topic: ${topic}`);
      return { status: 'unsubscribed', topic };
    }
  }

  private async initializeRabbitMQ() {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');
    if (!rabbitmqUrl) {
      this.logger.error(
        'RABBITMQ_URL not configured. Gateway will not connect.',
      );
      return;
    }

    this.amqpConnection = amqp.connect([rabbitmqUrl]);
    this.amqpChannel = this.amqpConnection.createChannel({
      setup: async (channel: Channel) => {
        return channel.assertExchange(this.exchangeName, 'topic', {
          durable: true,
        });
      },
    });

    this.logger.log('RabbitMQ connection manager initialized.');
  }

  private forwardMessageToClient(client: Socket, msg: ConsumeMessage | null) {
    if (!msg) return;

    try {
      const messageContent = JSON.parse(msg.content.toString());
      client.emit(msg.fields.routingKey, messageContent);
    } catch (error) {
      this.logger.error(
        'Could not parse and forward message:',
        msg.content.toString(),
      );
    } finally {
      this.amqpChannel.ack(msg);
    }
  }
}
