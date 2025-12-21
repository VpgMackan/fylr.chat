import { Injectable } from '@nestjs/common';
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
  getStrategy(mode: AgentMode): IAgentStrategy {
    switch (mode) {
      case AgentMode.FAST:
        return new FastStrategy();
      case AgentMode.THOROUGH:
        return new LoopStrategy(15);
      case AgentMode.AUTO:
        return new AutoStrategy();
      case AgentMode.NORMAL:
      default:
        return new LoopStrategy(5);
    }
  }
}
