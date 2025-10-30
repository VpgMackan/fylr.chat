# Dynamic Tool Selection

## Overview

The agentic system now supports **dynamic tool selection** based on available sources and user preferences. This makes the system more intelligent by only providing relevant tools to the AI agent, and automatically falling back to RAG mode when no tools are needed.

## Features

### 1. **Context-Aware Tool Loading**

Tools are conditionally loaded based on conversation state:

- **Document Tools** (only when sources exist):
  - `search_documents` - Semantic search across conversation sources
  - `read_document_chunk` - Read specific document sections
  - `list_sources_in_library` - List available sources

- **Web Tools** (only when web search is enabled):
  - `web_search` - Search the internet via Brave API
  - `fetch_webpage` - Extract content from specific URLs

- **Special Tools** (always included when any tools are available):
  - `provide_final_answer` - Signal end of research phase

### 2. **Web Search Toggle**

Users can enable/disable web search functionality via the frontend:

- **UI Button**: Green glowing button when enabled, gray when disabled
- **Agentic Mode Dependency**: Web search is **only available in Agentic Mode**
  - Button is visually disabled (grayed out) when RAG mode is active
  - Automatically disables web search when switching from Agentic to RAG mode
  - Tooltip explains web search requires Agentic Mode
- **State Persistence**: Web search preference is stored in conversation metadata
- **Per-Message Control**: Each message can have different web search settings (within Agentic Mode)

### 3. **Automatic Fallback**

When no tools are available (no sources AND web search disabled), the system automatically falls back to **RAG mode** for direct answer generation without tool calling overhead.

## Implementation Details

### Frontend (TypeScript/React)

#### ChatInput Component
```typescript
// State management
const [webSearchEnabled, setWebSearchEnabled] = useState(false);

// Button with visual feedback
<button
  className={webSearchButtonStyle}
  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
  aria-label={webSearchEnabled ? 'Disable web search' : 'Enable web search'}
  title={webSearchEnabled ? 'Web Search Enabled' : 'Click to enable web search'}
>
  <Icon icon="mdi:web" width="18" height="18" />
</button>
```

#### useChatInput Hook
```typescript
export function useChatInput(
  onSend: (payload: {
    content: string;
    sourceIds?: string[];
    libraryIds?: string[];
    agenticMode?: boolean;
    webSearchEnabled?: boolean;
  }) => void,
  agenticMode: boolean = false,
  webSearchEnabled: boolean = false,
) {
  // Passes webSearchEnabled to the backend
  onSend({ content: xmlContent, libraryIds, agenticMode, webSearchEnabled });
}
```

#### useChat Hook
```typescript
// Sends webSearchEnabled via WebSocket
socketRef.current.emit('conversationAction', {
  action: 'sendMessage',
  conversationId: chatId,
  content: payload.content,
  sourceIds: payload.sourceIds,
  libraryIds: payload.libraryIds,
  agenticMode: payload.agenticMode,
  webSearchEnabled: payload.webSearchEnabled,
});
```

### Backend (NestJS/TypeScript)

#### chat.gateway.ts
```typescript
// Extract webSearchEnabled from payload
const { content, sourceIds, libraryIds, agenticMode, webSearchEnabled } = payload;

// Store in conversation and message metadata
await this.conversationService.updateConversation(
  {
    metadata: {
      agenticMode: useAgenticMode,
      webSearchEnabled: useWebSearch,
    },
  },
  conversationId,
  client.user.id,
);

const userMessage = await this.messageService.createMessage(
  {
    role: 'user',
    content: content,
    metadata: {
      agenticMode: useAgenticMode,
      webSearchEnabled: useWebSearch,
    },
  },
  conversationId,
);
```

#### message.service.ts
```typescript
// Determine which tools to load
const hasSources = conversation.sources.length > 0;
const userMetadata = userMessage.metadata as any;
const conversationMetadata = conversation.metadata as any;
const webSearchEnabled =
  userMetadata?.webSearchEnabled === true ||
  conversationMetadata?.webSearchEnabled === true;

const availableTools = this.getAvailableTools(hasSources, webSearchEnabled);

// Fallback to RAG mode if no tools available
if (availableTools.length === 0) {
  this.logger.log(
    `No tools available for conversation ${conversationId}, falling back to RAG mode`,
  );
  return this.generateAndStreamAiResponse(userMessage, server);
}

// Tool selection logic
private getAvailableTools(
  hasSources: boolean,
  webSearchEnabled: boolean,
): any[] {
  const tools: any[] = [];
  const allToolDefinitions = this.toolService.getAllToolDefinitions();

  // Document tools (only if sources exist)
  if (hasSources) {
    const documentTools = [
      'search_documents',
      'read_document_chunk',
      'list_sources_in_library',
    ];
    tools.push(
      ...allToolDefinitions.filter((tool) =>
        documentTools.includes(tool.function.name),
      ),
    );
  }

  // Web tools (only if web search is enabled)
  if (webSearchEnabled) {
    const webTools = ['web_search', 'fetch_webpage'];
    tools.push(
      ...allToolDefinitions.filter((tool) =>
        webTools.includes(tool.function.name),
      ),
    );
  }

  // Always add provide_final_answer when tools are available
  if (tools.length > 0) {
    tools.push(...specialTools);
  }

  return tools;
}
```

## User Scenarios

### Scenario 1: Document Search Only (Agentic Mode)
**State**: Agentic mode enabled, conversation has sources, web search disabled  
**Result**: Agent gets document tools only  
**Tools Available**: `search_documents`, `read_document_chunk`, `list_sources_in_library`, `provide_final_answer`

### Scenario 2: Web Search Only (Agentic Mode)
**State**: Agentic mode enabled, no sources, web search enabled  
**Result**: Agent gets web tools only  
**Tools Available**: `web_search`, `fetch_webpage`, `provide_final_answer`

### Scenario 3: Full Toolset (Agentic Mode)
**State**: Agentic mode enabled, has sources AND web search enabled  
**Result**: Agent gets all tools  
**Tools Available**: All document tools + all web tools + `provide_final_answer`

### Scenario 4: No Tools in Agentic Mode
**State**: Agentic mode enabled, no sources AND web search disabled  
**Result**: Automatic fallback to RAG mode  
**Tools Available**: None (falls back to vector search + synthesis)

### Scenario 5: RAG Mode (Non-Agentic)
**State**: Agentic mode disabled (RAG mode active)  
**Result**: Web search automatically disabled, no tool calling  
**Behavior**: Direct vector search + synthesis, web search button is disabled
**Note**: Web search is **only available in Agentic Mode**

## Agent Awareness

The agentic system prompt has been updated to make the AI agent aware of dynamic tool availability:

### Key Prompt Updates

1. **Tool Availability Section**: Explicitly informs the agent that not all tools are always available
2. **Context-Based Planning**: Agent is instructed to check available tools before planning research strategy
3. **Graceful Degradation**: Agent knows to acknowledge tool limitations when critical tools are missing
4. **Adaptive Workflow**: Different strategies for document-only, web-only, or combined tool access

### Example Agent Behavior

**With Document Tools Only:**
```
Query Analysis: User is asking about [topic]
Available Tools: search_documents, read_document_chunk, list_sources_in_library
Strategy: Will search local documents for information
Limitation: Cannot verify current information from the web
```

**With Web Tools Only:**
```
Query Analysis: User is asking about [current event]
Available Tools: web_search, fetch_webpage
Strategy: Will search internet for latest information
Limitation: Cannot access conversation-specific documents
```

**No Tools Available (RAG Fallback):**
```
System automatically switches to RAG mode
No tool calling overhead
Direct vector search + synthesis
```

## Benefits

1. **Reduced Token Usage**: Only relevant tool definitions are sent to the LLM
2. **Faster Responses**: Less overhead from unnecessary tool availability
3. **Better UX**: Clear visual feedback for web search state and mode constraints
4. **Intelligent Fallback**: Automatic mode switching when appropriate
5. **Flexible Control**: Per-conversation and per-message web search settings
6. **Agent Awareness**: AI understands its tool constraints and adapts accordingly
7. **Mode Consistency**: Web search is properly scoped to Agentic Mode only

## Testing

To test the implementation:

1. **Agentic Mode with No Sources, No Web Search**: Should fall back to RAG mode
2. **Agentic Mode with Sources, No Web Search**: Should only show document tools
3. **Agentic Mode with No Sources, Web Search Enabled**: Should only show web tools
4. **Agentic Mode with Sources, Web Search Enabled**: Should show all tools
5. **Toggle Web Search Button**: Should change from gray to green and vice versa
6. **Toggle Agentic Mode Off**: Web search button should automatically disable and gray out
7. **RAG Mode (Agentic Off)**: Web search button should be disabled with tooltip explaining it requires Agentic Mode
8. **Toggle Agentic Mode On**: Web search button should become enabled again

## Future Enhancements

1. **More Tool Categories**: Add support for other tool types (calculator, weather, etc.)
2. **User Preferences**: Save default web search preference per user
3. **Smart Tool Suggestions**: Analyze query to suggest enabling web search
4. **Tool Usage Analytics**: Track which tools are most useful
5. **Custom Tool Sets**: Allow users to create custom tool combinations

## Related Files

**Frontend**:
- `/packages/web/src/components/ui/ChatInput.tsx`
- `/packages/web/src/hooks/useChatInput.ts`
- `/packages/web/src/hooks/useChat.ts`
- `/packages/web/src/services/api/chat.api.ts`

**Backend**:
- `/packages/backend/src/chat/message.service.ts`
- `/packages/backend/src/chat/chat.gateway.ts`
- `/packages/backend/src/chat/chat.controller.ts`
- `/packages/backend/src/chat/conversation.service.ts`
- `/packages/backend/src/chat/tools/tool.service.ts`

## Conclusion

Dynamic tool selection makes the agentic system more intelligent and efficient by providing only relevant tools based on context. The web search toggle gives users explicit control over internet access, while the automatic RAG fallback ensures smooth operation even when no tools are needed.
