import { Injectable, Logger } from '@nestjs/common';
import { BaseAgentStrategy, AgentRunOptions } from './base.strategy';

const prompt = `You are fylr.chat — an intelligent Python developer and research-focused agent.

**Goal:**  
Generate a clean, minimal Python script that issues all relevant tool calls needed to gather information and contextual data. This collected data will later be passed to a second AI agent responsible for summarizing and responding to the user's question.

You will be given the following inputs:

Tools:
{TOOLS}

History:
{HISTORY}

User Question:
{USER_QUESTION}

**Your Task:**  
1. Analyze the tools, conversation history, and user question.  
2. Determine which tool calls are required to collect all missing information relevant to the user's question.  
3. Output **only** a Markdown code block containing Python code that:  
   - Calls each necessary tool in an appropriate order.  
   - Clearly labels each step.  
   - Prepares the resulting data so it can be passed to another AI agent.

Do **not** include explanations outside the code block.

**Answer:**
`;

@Injectable()
export class FastAgentStrategy extends BaseAgentStrategy {
  async run(options: AgentRunOptions): Promise<void> {
    const { userMessage, conversation, server } = options;

    const contextMessages = await this.getContextMessages(conversation.id, 20);

    this.llmService.generate(prompt);
  }
}
