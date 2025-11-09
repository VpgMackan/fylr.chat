# Reranking Pro Feature Upsell Implementation

## Overview
This feature adds a minimalistic, non-disruptive upsell message for FREE users when they receive RAG (Retrieval-Augmented Generation) answers. The message contextualizes the Pro feature (AI-powered reranking) and encourages users to upgrade.

## User Experience

### When the Upsell Appears
The upsell message is shown **only** when:
1. The message is from the assistant (not a user message)
2. The answer includes related sources (RAG was used)
3. The user is on the FREE plan
4. Reranking was **not** used (because FREE users don't get reranking)

### Visual Design
- **Minimalistic**: Small banner below the source badges
- **Gradient background**: Purple-to-blue gradient with subtle border
- **Icon**: Star circle icon in purple to indicate premium feature
- **Text**: Brief explanation with inline "Learn more" link
- **Non-disruptive**: Doesn't block content or interfere with reading

### Message Content
> **Pro users** get higher-quality answers with AI-powered re-ranking. [Learn more](#)

The "Learn more" link navigates to the user's profile page where they can see subscription options.

## Technical Implementation

### Frontend Changes

#### File: `packages/web/src/components/ui/ChatBubble.tsx`

1. **Updated TypeScript Interfaces**:
   ```typescript
   interface MessageMetadata {
     relatedSources?: RelatedSource[];
     rerankingUsed?: boolean;
     userRole?: 'FREE' | 'PRO';
   }
   ```

2. **Added Logic to Show Upsell**:
   ```typescript
   const showRerankingUpsell = 
     !user && 
     relatedSources.length > 0 && 
     metadata?.userRole === 'FREE' && 
     metadata?.rerankingUsed === false;
   ```

3. **Added Upsell Component**:
   - Positioned below related sources
   - Gradient background: `from-purple-50 to-blue-50`
   - Purple accent colors for premium feel
   - Click-through to `/profile` page

### Backend Changes

#### File: `packages/backend/src/chat/message.service.ts`

1. **Enhanced `generateAndStreamAiResponse` Method** (RAG Mode):
   - Already included `rerankingUsed` and `userRole` in metadata (line ~355)
   - No changes needed here

2. **Enhanced `generateAndStreamAiResponseWithTools` Method** (Agentic Mode):
   - Updated conversation query to include `user.role`
   - Pass `userRole` to `synthesizeAndStreamFinalAnswer` method

3. **Updated `synthesizeAndStreamFinalAnswer` Method**:
   - Added `userRole?: UserRole` parameter
   - Include `rerankingUsed` and `userRole` in metadata for all messages
   - Apply metadata even when no sources are present

## How Reranking Works

### FREE Users
- Use basic vector similarity search
- Get top 5 results based on embedding distance
- No AI-powered reranking
- See upsell message in RAG answers

### PRO Users
- Use vector similarity search **plus** AI reranking
- Results are reranked using cross-encoder model (Jina Reranker)
- Get more accurate and relevant document chunks
- No upsell message shown

## Code Locations

### Frontend
- `/packages/web/src/components/ui/ChatBubble.tsx` - Main chat message bubble component

### Backend
- `/packages/backend/src/chat/message.service.ts` - Message generation and streaming logic
- `/packages/backend/src/ai/reranking.service.ts` - Reranking service (Pro feature)

## Testing Recommendations

### Manual Testing

1. **FREE User RAG Answer**:
   - Create conversation with sources
   - Ask a question that triggers RAG
   - Verify upsell appears below source badges
   - Click "Learn more" → should navigate to profile page

2. **PRO User RAG Answer**:
   - Upgrade to Pro plan
   - Create conversation with sources
   - Ask a question that triggers RAG
   - Verify NO upsell appears

3. **Agentic Mode (with sources)**:
   - Enable agentic mode
   - Use document search tool
   - Verify upsell appears for FREE users
   - Verify NO upsell for PRO users

4. **Conversational Mode (no sources)**:
   - Ask question without sources
   - Verify NO upsell appears (no RAG used)

5. **Edge Cases**:
   - User messages: No upsell (user bubbles)
   - Streaming messages: No upsell until finalized
   - Empty answers: No upsell

## Future Enhancements

1. **A/B Testing**: Test different message variations
2. **Analytics**: Track click-through rate on "Learn more"
3. **Dismissible**: Allow users to dismiss temporarily
4. **Animation**: Subtle fade-in animation
5. **Contextual Messages**: Different messages based on query type
6. **Upgrade CTA**: Direct upgrade button instead of just "Learn more"

## Related Features

- **Reranking Service**: `/packages/backend/src/ai/reranking.service.ts`
- **Permissions System**: `/packages/backend/src/auth/permissions.service.ts`
- **Subscription Management**: `/packages/backend/src/auth/subscription.service.ts`
- **Profile/Subscription UI**: `/packages/web/src/components/features/profile/SubscriptionManager.tsx`

## Changelog

### 2025-11-08
- ✅ Added `MessageMetadata` interface with `rerankingUsed` and `userRole`
- ✅ Updated `ChatBubble` component to show reranking upsell for FREE users
- ✅ Enhanced `synthesizeAndStreamFinalAnswer` to include metadata in agentic mode
- ✅ Updated conversation query to fetch user role
- ✅ Maintained consistency between RAG and Agentic modes
- ✅ Designed minimalistic, non-disruptive UI
