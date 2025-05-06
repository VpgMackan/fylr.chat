import { Logger } from '@nestjs/common';
import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class EventsGateway {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToJobUpdates')
  handleSubscription(
    @MessageBody() jobKey: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (!jobKey) {
      this.logger.warn(
        `Client ${client.id} tried to subscribe without a jobKey.`,
      );
      client.emit('subscriptionError', { message: 'jobKey is required.' });
      return;
    }

    this.logger.log(`Client ${client.id} subscribed to jobKey: ${jobKey}`);
    client.join(jobKey);
    client.emit('subscribed', {
      message: `Successfully subscribed to jobKey ${jobKey}`,
    });
  }

  /**
   * Method to be called by the Processor to send updates.
   * @param jobKey The unique key identifying the job and the socket.io room.
   * @param status A string indicating the current status (e.g., 'processing', 'completed', 'failed').
   * @param data Optional additional data (e.g., progress percentage, error message, final result).
   */
  sendJobUpdate(jobKey: string, status: string, data?: object) {
    this.logger.log(`Sending update for jobKey ${jobKey}: Status=${status}`);
    this.server.to(jobKey).emit('jobUpdate', {
      jobKey,
      status,
      ...data,
    });
  }

  @SubscribeMessage('unsubscribeFromJobUpdates')
  handleUnsubscription(
    @MessageBody() jobKey: string,
    @ConnectedSocket() client: Socket,
  ) {
    if (jobKey) {
      this.logger.log(
        `Client ${client.id} unsubscribed from jobKey: ${jobKey}`,
      );
      client.leave(jobKey);
      client.emit('unsubscribed', {
        message: `Successfully unsubscribed from jobKey ${jobKey}`,
      });
    }
  }
}
