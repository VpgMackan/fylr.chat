'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { MessageApiResponse } from '@fylr/types';

interface AgentThoughtsProps {
  thoughts: MessageApiResponse[];
}

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export default function AgentThoughts({ thoughts }: AgentThoughtsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out empty thoughts
  const validThoughts = thoughts.filter((thought) => {
    const hasReasoning = Boolean(
      thought.reasoning &&
        typeof thought.reasoning === 'string' &&
        thought.reasoning.trim().length > 0,
    );
    const hasToolCalls = Boolean(
      thought.toolCalls &&
        Array.isArray(thought.toolCalls) &&
        thought.toolCalls.length > 0,
    );
    return hasReasoning || hasToolCalls;
  });

  if (validThoughts.length === 0) {
    return null;
  }

  // Count total tool calls
  const totalToolCalls = validThoughts.reduce((acc, thought) => {
    return (
      acc + (Array.isArray(thought.toolCalls) ? thought.toolCalls.length : 0)
    );
  }, 0);

  const thoughtsLabel = validThoughts.length === 1 ? 'thought' : 'thoughts';

  return (
    <div className="max-w-[70%] mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 hover:bg-purple-100 transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <Icon
          icon={isExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
          className="w-4 h-4 text-purple-600 flex-shrink-0"
        />
        <Icon
          icon="mdi:brain"
          className="w-4 h-4 text-purple-600 flex-shrink-0"
        />
        <span className="text-xs font-medium text-purple-700">
          {validThoughts.length} agent {thoughtsLabel}
        </span>
        {totalToolCalls > 0 && (
          <span className="ml-auto text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full flex-shrink-0">
            {totalToolCalls} tool{totalToolCalls > 1 ? 's' : ''}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-1 bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
          {validThoughts.map((thought, index) => {
            const hasReasoning = Boolean(
              thought.reasoning &&
                typeof thought.reasoning === 'string' &&
                thought.reasoning.trim().length > 0,
            );
            const hasToolCalls = Boolean(
              thought.toolCalls &&
                Array.isArray(thought.toolCalls) &&
                thought.toolCalls.length > 0,
            );

            return (
              <div
                key={thought.id || index}
                className="bg-white rounded-lg p-2.5 border border-purple-100"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon
                    icon="mdi:lightbulb-outline"
                    className="w-3.5 h-3.5 text-purple-600"
                  />
                  <span className="text-xs font-semibold text-purple-800">
                    Step {index + 1}
                  </span>
                </div>

                {hasReasoning && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {thought.reasoning}
                    </p>
                  </div>
                )}

                {hasToolCalls && (
                  <div className="space-y-1.5">
                    {(thought.toolCalls as ToolCall[]).map((toolCall) => {
                      let parsedArgs: any = {};
                      try {
                        parsedArgs = JSON.parse(toolCall.function.arguments);
                      } catch (e) {
                        parsedArgs = { raw: toolCall.function.arguments };
                      }

                      return (
                        <div
                          key={toolCall.id}
                          className="bg-purple-50 rounded p-2"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Icon
                              icon="mdi:tools"
                              className="w-3 h-3 text-purple-600"
                            />
                            <span className="text-xs font-mono font-semibold text-purple-900">
                              {toolCall.function.name}
                            </span>
                          </div>
                          <div className="text-xs bg-white rounded p-1.5 font-mono overflow-x-auto border border-purple-100">
                            <pre className="whitespace-pre-wrap break-words text-[10px] leading-tight">
                              {JSON.stringify(parsedArgs, null, 2)}
                            </pre>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
