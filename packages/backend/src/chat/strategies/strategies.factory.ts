import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { IAgentStrategy } from './strategy/agent.strategy';
import { FastStrategy } from './strategy/fast.strategy';
import { LoopStrategy } from './strategy/loop.strategy';
import { AutoStrategy } from './strategy/auto.strategy';

export enum AgentMode {
  AUTO = 'AUTO',
  FAST = 'FAST',
  NORMAL = 'NORMAL',
  THOROUGH = 'THOROUGH',
}

@Injectable()
export class AgentFactory {
  constructor(
    readonly server: Server,
    readonly conversationId: string,
  ) {}

  getStrategy(mode: AgentMode): IAgentStrategy {
    switch (mode) {
      case AgentMode.FAST:
        return new FastStrategy(this.server, this.conversationId);
      case AgentMode.THOROUGH:
        return new LoopStrategy(15, this.server, this.conversationId);
      case AgentMode.AUTO:
        return new AutoStrategy(this.server, this.conversationId);
      case AgentMode.NORMAL:
      default:
        return new LoopStrategy(5, this.server, this.conversationId);
    }
  }
}
