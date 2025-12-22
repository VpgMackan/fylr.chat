import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { MentionsInput, Mention } from 'react-mentions';
import type { SuggestionDataItem } from 'react-mentions';
import SourceMenu from './SourceMenu';
import { useChatInput } from '@/hooks/useChatInput';
import { useUsageStats } from '@/hooks/useUsageStats';
import type { SourceApiResponseWithIsActive } from '@fylr/types';
import Link from 'next/link';

interface ChatInputProps {
  onSend: (payload: {
    content: string;
    sourceIds?: string[];
    libraryIds?: string[];
    agentMode: string;
    webSearchEnabled?: boolean;
  }) => void;
  className?: string;
  showSourceMenu?: boolean;
  conversationSources?: SourceApiResponseWithIsActive[];
  disabled?: boolean;
  initialAgentMode?: string;
}

const mentionsInputStyle = {
  control: {
    backgroundColor: 'transparent',
    fontSize: '0.95rem',
    fontWeight: 'normal' as const,
    wordBreak: 'break-word' as const,
  },
  '&multiLine': {
    control: {
      minHeight: '2.5rem',
    },
    highlighter: {
      padding: '0.5rem',
      border: 'none',
    },
    input: {
      padding: '0.5rem',
      border: 'none',
      outline: 'none',
      color: '#1f2937',
      lineHeight: '1.5',
      spellCheck: 'false',
    },
  },
  suggestions: {
    borderRadius: '9999px',
    list: {
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      boxShadow:
        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      fontSize: '0.9rem',
      maxHeight: '200px',
      overflowY: 'auto' as const,
      padding: '0.5rem',
    },
    item: {
      padding: '0.625rem 0.875rem',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      '&focused': {
        backgroundColor: '#dbeafe',
        color: '#1e40af',
      },
    },
  },
};

const mentionStyle = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
};

type AgentMode = 'FAST' | 'NORMAL' | 'THOROUGH' | 'AUTO';

export default function ChatInput({
  onSend,
  className = '',
  showSourceMenu = false,
  conversationSources = [],
  disabled = false,
  initialAgentMode = 'AUTO',
}: ChatInputProps) {
  const [agentMode, setAgentMode] = useState<AgentMode>(
    initialAgentMode as AgentMode,
  );
  const [showAgentModeMenu, setShowAgentModeMenu] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const { stats, hasReachedAgenticLimit } = useUsageStats();
  const agentModeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAgentMode(initialAgentMode as AgentMode);
  }, [initialAgentMode]);

  useEffect(() => {
    if (hasReachedAgenticLimit) {
      setAgentMode('AUTO');
    }
  }, [hasReachedAgenticLimit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        agentModeMenuRef.current &&
        !agentModeMenuRef.current.contains(event.target as Node)
      ) {
        setShowAgentModeMenu(false);
      }
    };

    if (showAgentModeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAgentModeMenu]);

  const {
    value,
    textareaRef,
    isSourceMenuOpen,
    librariesWithSources,
    expandedLibraries,
    handleSend,
    handleChange,
    toggleSourceMenu,
    toggleLibrary,
    getSelectedSourceIds,
    isLibrarySelected,
    libraryData,
    plainText,
  } = useChatInput(onSend, agentMode, webSearchEnabled);

  const getConversationSourceIds = (): Set<string> => {
    const sourceIds = new Set<string>();
    conversationSources
      .filter((source) => source.isActive)
      .forEach((source) => sourceIds.add(source.id));
    return sourceIds;
  };

  const buttonStyle =
    'p-2 bg-white/80 text-gray-600 rounded-full hover:bg-blue-200 hover:text-blue-600 transition-all duration-150 shadow-sm hover:shadow active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/80 disabled:hover:text-gray-600';

  const getAgentModeColor = () => {
    switch (agentMode) {
      case 'FAST':
        return 'from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600';
      case 'NORMAL':
        return 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600';
      case 'THOROUGH':
        return 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
      case 'AUTO':
        return 'from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600';
    }
  };

  const getAgentModeIcon = () => {
    switch (agentMode) {
      case 'FAST':
        return 'mdi:lightning-bolt';
      case 'NORMAL':
        return 'mdi:robot';
      case 'THOROUGH':
        return 'mdi:brain';
      case 'AUTO':
        return 'mdi:auto-fix';
    }
  };

  const agenticButtonStyle = `p-2 px-3 bg-gradient-to-r ${getAgentModeColor()} text-white text-sm font-medium rounded-full transition-all duration-150 shadow-sm hover:shadow-md active:scale-95 flex items-center gap-1.5 relative`;

  const webSearchButtonStyle = webSearchEnabled
    ? 'p-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 transition-all duration-150 shadow-sm hover:shadow-md active:scale-95'
    : buttonStyle;

  return (
    <div className={`w-full relative ${className}`}>
      {showSourceMenu && (
        <SourceMenu
          toggleSourceMenu={toggleSourceMenu}
          isSourceMenuOpen={isSourceMenuOpen}
          librariesWithSources={librariesWithSources}
          getConversationSourceIds={getConversationSourceIds}
          getSelectedSourceIds={getSelectedSourceIds}
          isLibrarySelected={isLibrarySelected}
          toggleLibrary={toggleLibrary}
          expandedLibraries={expandedLibraries}
        />
      )}
      <div
        className={`relative ${showSourceMenu ? 'rounded-l-2xl rounded-bl-2xl' : 'rounded-2xl'} p-[2px]`}
        style={{
          background:
            'linear-gradient(90deg, #60a5fa, #a78bfa, #ec4899, #60a5fa)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 8s ease infinite',
        }}
      >
        <div
          className={`flex flex-col bg-gradient-to-br from-blue-50 to-blue-100 ${
            showSourceMenu
              ? 'rounded-l-[14px] rounded-bl-[14px]'
              : 'rounded-[14px]'
          } shadow-lg hover:shadow-xl transition-shadow duration-200 p-3`}
        >
          <div className="flex items-center flex-wrap px-2 py-1 relative min-h-[2.5rem]">
            <MentionsInput
              inputRef={textareaRef}
              singleLine={false}
              className="flex-1 mentions-input"
              style={mentionsInputStyle}
              placeholder={
                disabled
                  ? 'Connecting...'
                  : 'Ask anything, or type @ to select a library...'
              }
              value={value}
              onChange={handleChange}
              forceSuggestionsAboveCursor
              disabled={disabled}
            >
              <Mention
                trigger="@"
                data={libraryData}
                markup="@@@____id__^^^____display__@@@^^^"
                displayTransform={(_, display) => ` @${display} `}
                style={mentionStyle}
                appendSpaceOnAdd
                renderSuggestion={(suggestion: SuggestionDataItem) => (
                  <span className="font-medium">{suggestion.display}</span>
                )}
              />
            </MentionsInput>
          </div>
          {hasReachedAgenticLimit && (
            <div className="text-center text-xs text-purple-700 bg-purple-100 p-2 rounded-md mb-2 flex items-center justify-center gap-2">
              <Icon icon="mdi:lock-outline" />
              <span>
                Agentic Mode is disabled for today.{' '}
                <Link href="/profile" className="font-bold underline">
                  Upgrade to Pro
                </Link>{' '}
                for unlimited use.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 px-1 border-t border-blue-200/50 mt-1">
            <div className="flex gap-1.5 relative">
              <div className="relative" ref={agentModeMenuRef}>
                <button
                  className={agenticButtonStyle}
                  onClick={() => setShowAgentModeMenu(!showAgentModeMenu)}
                  disabled={hasReachedAgenticLimit}
                  title={
                    hasReachedAgenticLimit
                      ? 'You have used all your Agentic Mode messages for today.'
                      : `Current mode: ${agentMode}`
                  }
                >
                  <Icon icon={getAgentModeIcon()} width="16" height="16" />
                  <span>{agentMode}</span>
                  <Icon icon="mdi:chevron-down" width="14" height="14" />
                </button>

                {showAgentModeMenu && !hasReachedAgenticLimit && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[200px]">
                    {(
                      ['FAST', 'NORMAL', 'THOROUGH', 'AUTO'] as AgentMode[]
                    ).map((mode) => (
                      <button
                        key={mode}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                          agentMode === mode
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700'
                        }`}
                        onClick={() => {
                          setAgentMode(mode);
                          setShowAgentModeMenu(false);
                        }}
                      >
                        <Icon
                          icon={
                            mode === 'FAST'
                              ? 'mdi:lightning-bolt'
                              : mode === 'NORMAL'
                                ? 'mdi:robot'
                                : mode === 'THOROUGH'
                                  ? 'mdi:brain'
                                  : 'mdi:auto-fix'
                          }
                          width="16"
                          height="16"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{mode}</div>
                          <div className="text-xs text-gray-500">
                            {mode === 'FAST' && 'Quick responses'}
                            {mode === 'NORMAL' && 'Balanced approach'}
                            {mode === 'THOROUGH' && 'Deep reasoning'}
                            {mode === 'AUTO' && 'Automatic selection'}
                          </div>
                        </div>
                        {agentMode === mode && (
                          <Icon
                            icon="mdi:check"
                            width="16"
                            height="16"
                            className="text-blue-600"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {stats && stats.role === 'FREE' && (
                <div className="flex items-center text-xs text-gray-500 bg-white/60 px-2 rounded-full">
                  <span>
                    {stats.usage[`CHAT_${agentMode}_MESSAGES_DAILY`] ?? 0}/
                    {stats.limits.features[
                      `CHAT_${agentMode}_MESSAGES_DAILY`
                    ] ?? 0}{' '}
                    {agentMode.toLowerCase()}
                  </span>
                </div>
              )}
              <button className={buttonStyle} aria-label="Add attachment">
                <Icon icon="mdi:plus" width="18" height="18" />
              </button>
              <button
                className={webSearchButtonStyle}
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                aria-label={
                  webSearchEnabled ? 'Disable web search' : 'Enable web search'
                }
                title={
                  webSearchEnabled
                    ? 'Web Search Enabled'
                    : 'Click to enable web search'
                }
              >
                <Icon icon="mdi:web" width="18" height="18" />
              </button>
              <button className={buttonStyle} aria-label="More options">
                <Icon icon="mdi:dots-horizontal" width="18" height="18" />
              </button>
            </div>

            <div className="flex gap-2">
              <button className={buttonStyle} aria-label="Voice input">
                <Icon icon="mdi:microphone" width="20" height="20" />
              </button>
              <button
                className="p-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-150 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSend}
                disabled={disabled || !plainText.trim()}
                aria-label="Send message"
              >
                <Icon icon="mdi:arrow-up" width="20" height="20" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
