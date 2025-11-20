import { Injectable, Logger } from '@nestjs/common';
import { BaseAgentStrategy, AgentRunOptions } from './base.strategy';

@Injectable()
export class FastAgentStrategy extends BaseAgentStrategy {
  async run(options: AgentRunOptions): Promise<void> {
    const { userMessage, conversation, server } = options;

    const contextMessages = await this.getContextMessages(
      conversation.id,
      20,
    );
  }
}
