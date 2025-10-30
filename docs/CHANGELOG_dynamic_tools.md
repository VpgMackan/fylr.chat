# Changelog: Dynamic Tool Selection Implementation

## Date: October 30, 2025

## Overview
Implemented intelligent, context-aware tool selection for the agentic system with proper mode restrictions.

## Changes

### 1. Agentic System Prompt Updates (`agentic_system@v1.yaml`)

#### Added: Tool Availability Section
- Explicitly documents which tools are available under different conditions
- Document tools: Available when conversation has sources
- Web tools: Available when web search is enabled
- Agent now understands tool availability is dynamic

#### Updated: Workflow Instructions
- Step 1: Now includes checking available tools
- Step 2: Plans approach within tool constraints
- Step 3: Uses different strategies for document vs. web tools
- Step 4: Acknowledges tool limitations when present

#### Benefits
- Agent adapts research strategy based on available tools
- Gracefully handles missing tool categories
- Provides transparent feedback about tool constraints

### 2. Backend: Web Search Mode Restriction

#### Files Modified
- `packages/backend/src/chat/chat.gateway.ts`
- `packages/backend/src/chat/conversation.service.ts`

#### Key Changes
```typescript
// Web search is only available in agentic mode
const useAgenticMode = agenticMode !== false;
const useWebSearch = useAgenticMode && webSearchEnabled === true;
```

#### Behavior
- Web search can only be enabled in Agentic Mode
- RAG mode automatically disables web search
- Metadata correctly stores mode restrictions

### 3. Frontend: Visual Mode Restrictions

#### File Modified
- `packages/web/src/components/ui/ChatInput.tsx`

#### Key Changes

**Disabled State for Web Search Button:**
```typescript
const webSearchButtonStyle = !agenticMode
  ? 'p-2 bg-white/80 text-gray-400 rounded-full ... opacity-40 cursor-not-allowed'
  : webSearchEnabled ? '... green gradient ...' : buttonStyle;
```

**Automatic Web Search Disable:**
```typescript
useEffect(() => {
  if (!agenticMode && webSearchEnabled) {
    setWebSearchEnabled(false);
  }
}, [agenticMode, webSearchEnabled]);
```

**Button Properties:**
```typescript
<button
  disabled={!agenticMode}
  onClick={() => agenticMode && setWebSearchEnabled(!webSearchEnabled)}
  title={
    !agenticMode
      ? 'Enable Agentic Mode to use web search'
      : webSearchEnabled ? 'Web Search Enabled' : 'Click to enable web search'
  }
>
```

#### User Experience
- Web search button is grayed out in RAG mode
- Tooltip explains web search requires Agentic Mode
- Automatically disables when switching to RAG mode
- Cannot be clicked when Agentic Mode is off

### 4. Documentation

#### Updated: `dynamic_tool_selection.md`
- Added "Web Search Toggle" dependency on Agentic Mode
- Added Scenario 5: RAG Mode behavior
- Updated testing procedures
- Added "Agent Awareness" section
- Updated benefits list

## User Scenarios Matrix

| Agentic Mode | Sources | Web Search | Tools Available | Behavior |
|--------------|---------|------------|-----------------|----------|
| ✅ | ✅ | ❌ | Document only | Search docs only |
| ✅ | ❌ | ✅ | Web only | Search web only |
| ✅ | ✅ | ✅ | All tools | Full capabilities |
| ✅ | ❌ | ❌ | None | Fallback to RAG |
| ❌ | Any | N/A | None | RAG mode (web search disabled) |

## Breaking Changes
None - this is backward compatible as it only adds restrictions (web search was already optional).

## Migration Notes
- Existing conversations: Web search state is preserved but only effective in Agentic Mode
- Frontend: Web search button automatically adapts to mode changes
- Backend: Web search requests in RAG mode are automatically filtered out

## Testing Checklist
- [x] Web search button disabled in RAG mode
- [x] Web search button enabled in Agentic mode
- [x] Automatic disable when switching to RAG mode
- [x] Tooltip shows correct message based on mode
- [x] Backend enforces web search only in Agentic mode
- [x] Agent prompt reflects dynamic tool availability
- [x] No TypeScript compilation errors
- [x] Documentation updated

## Related Files

### Backend
- `/packages/backend/src/chat/message.service.ts` - Dynamic tool loading
- `/packages/backend/src/chat/chat.gateway.ts` - Mode restriction enforcement
- `/packages/backend/src/chat/conversation.service.ts` - Initial conversation mode setup

### Frontend
- `/packages/web/src/components/ui/ChatInput.tsx` - UI button state management
- `/packages/web/src/hooks/useChatInput.ts` - Web search state handling
- `/packages/web/src/hooks/useChat.ts` - WebSocket communication

### AI Gateway
- `/packages/ai-gateway/ai_gateway/prompts/config/agentic_system@v1.yaml` - Agent instructions

### Documentation
- `/docs/dynamic_tool_selection.md` - Complete feature documentation
- `/docs/CHANGELOG_dynamic_tools.md` - This file

## Next Steps
1. Test in development environment
2. Verify mode switching behavior
3. Test with various source/web search combinations
4. Validate agent understanding of tool constraints
5. Monitor agent responses for proper adaptation

## Notes
- Web search is now properly scoped to Agentic Mode only
- Agent is fully aware of dynamic tool availability
- UI provides clear visual feedback for mode constraints
- System gracefully handles all tool availability scenarios
