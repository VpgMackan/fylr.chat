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
    <div className="max-w-[85%] lg:max-w-[70%] mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2.5 w-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl px-4 py-2.5 hover:from-purple-100 hover:to-indigo-100 transition-all duration-150 text-left shadow-sm"
        aria-expanded={isExpanded}
      >
        <Icon
          icon={isExpanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}
          className="w-4 h-4 text-purple-600 flex-shrink-0 transition-transform duration-150"
        />
        <Icon
          icon="mdi:brain"
          className="w-5 h-5 text-purple-600 flex-shrink-0"
        />
        <span className="text-sm font-medium text-purple-700">
          {validThoughts.length} agent {thoughtsLabel}
        </span>
        {totalToolCalls > 0 && (
          <span className="ml-auto text-xs font-medium bg-purple-200 text-purple-800 px-2.5 py-1 rounded-full flex-shrink-0">
            {totalToolCalls} tool{totalToolCalls > 1 ? 's' : ''} used
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 bg-gradient-to-b from-purple-50 to-white border border-purple-200 rounded-xl p-4 space-y-4 shadow-sm">
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
                className="bg-white rounded-xl p-3 border border-purple-100 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-6 h-6 bg-purple-100 rounded-full">
                    <span className="text-xs font-bold text-purple-700">
                      {index + 1}
                    </span>
                  </span>
                  <Icon
                    icon="mdi:lightbulb-outline"
                    className="w-4 h-4 text-purple-500"
                  />
                  <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
                    Step {index + 1}
                  </span>
                </div>

                {hasReasoning && (
                  <div className="mb-3 pl-8">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {thought.reasoning}
                    </p>
                  </div>
                )}

                {hasToolCalls && (
                  <div className="space-y-2 pl-8">
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
                          className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-100"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon
                              icon="mdi:tools"
                              className="w-4 h-4 text-purple-600"
                            />
                            <span className="text-xs font-mono font-bold text-purple-900 bg-white px-2 py-0.5 rounded border border-purple-200">
                              {toolCall.function.name}
                            </span>
                          </div>
                          <div className="text-xs bg-white rounded-lg p-2.5 font-mono overflow-x-auto border border-purple-100">
                            <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-gray-700">
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
