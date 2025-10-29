import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { MentionsInput, Mention } from 'react-mentions';
import type { SuggestionDataItem } from 'react-mentions';
import SourceMenu from './SourceMenu';
import { useChatInput } from '@/hooks/useChatInput';
import type { SourceApiResponseWithIsActive } from '@fylr/types';

interface ChatInputProps {
  onSend: (payload: {
    content: string;
    sourceIds?: string[];
    libraryIds?: string[];
    agenticMode?: boolean;
  }) => void;
  className?: string;
  showSourceMenu?: boolean;
  conversationSources?: SourceApiResponseWithIsActive[];
  disabled?: boolean;
  initialAgenticMode?: boolean;
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

export default function ChatInput({
  onSend,
  className = '',
  showSourceMenu = false,
  conversationSources = [],
  disabled = false,
  initialAgenticMode = true,
}: ChatInputProps) {
  const [agenticMode, setAgenticMode] = useState(initialAgenticMode);

  // Update local state when initialAgenticMode changes
  useEffect(() => {
    setAgenticMode(initialAgenticMode);
  }, [initialAgenticMode]);

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
  } = useChatInput(onSend, agenticMode);

  const getConversationSourceIds = (): Set<string> => {
    const sourceIds = new Set<string>();
    conversationSources
      .filter((source) => source.isActive)
      .forEach((source) => sourceIds.add(source.id));
    return sourceIds;
  };

  const buttonStyle =
    'p-2 bg-white/80 text-gray-600 rounded-full hover:bg-blue-200 hover:text-blue-600 transition-all duration-150 shadow-sm hover:shadow active:scale-95';

  const agenticButtonStyle = agenticMode
    ? 'p-2 px-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium rounded-full hover:from-purple-600 hover:to-indigo-600 transition-all duration-150 shadow-sm hover:shadow-md active:scale-95 flex items-center gap-1.5'
    : 'p-2 px-3 bg-white/80 text-gray-600 text-sm font-medium rounded-full hover:bg-purple-100 hover:text-purple-600 transition-all duration-150 shadow-sm hover:shadow active:scale-95 flex items-center gap-1.5';

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

          <div className="flex items-center justify-between pt-2 px-1 border-t border-blue-200/50 mt-1">
            <div className="flex gap-1.5">
              <button
                className={agenticButtonStyle}
                onClick={() => setAgenticMode(!agenticMode)}
                aria-label={
                  agenticMode ? 'Disable agentic mode' : 'Enable agentic mode'
                }
                title={
                  agenticMode
                    ? 'Using Agentic Mode (Tools & Reasoning)'
                    : 'Using RAG Mode (Vector Search)'
                }
              >
                <Icon icon="mdi:robot" width="16" height="16" />
                <span>Agentic Mode</span>
              </button>
              <button className={buttonStyle} aria-label="Add attachment">
                <Icon icon="mdi:plus" width="18" height="18" />
              </button>
              <button className={buttonStyle} aria-label="Add web source">
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
