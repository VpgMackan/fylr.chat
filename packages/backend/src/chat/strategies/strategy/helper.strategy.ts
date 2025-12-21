import { Server } from 'socket.io';

export class HelperStrategy {
  constructor(
    readonly server: Server,
    readonly conversationId: string,
  ) {}
  
  emitToolProgress(toolName: string, message: string) {
    this.server.to(this.conversationId).emit('conversationAction', {
      action: 'toolProgress',
      conversationId: this.conversationId,
      data: { toolName, message },
    });
  }
}
