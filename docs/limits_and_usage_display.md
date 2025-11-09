# Limits and Usage Display Implementation

## Overview
This implementation provides comprehensive visibility into user limits and usage, with support for deferred ingestion when daily limits are reached.

## Features Implemented

### A. Backend Changes

#### 1. Usage Statistics Endpoint
- **Location**: `packages/backend/src/auth/auth.controller.ts` and `permissions.service.ts`
- **Endpoint**: `GET /auth/usage-stats`
- **Returns**:
  - User role (FREE/PRO)
  - Limits for libraries, sources per library, and daily source uploads
  - Current usage for daily source uploads

#### 2. Deferred Ingestion Support
- **Database Schema**: Added `pendingIngestion` field to `Source` model
- **Service Logic**: Modified `createSource()` in `source.service.ts` to:
  - Allow file uploads even when daily limit is reached
  - Mark files as `pendingIngestion: true` and `status: 'PENDING'`
  - Skip immediate RabbitMQ job queueing for pending files
  
#### 3. Manual Ingestion Trigger
- **New Endpoints**:
  - `GET /source/pending-ingestion` - List all pending sources
  - `POST /source/:sourceId/trigger-ingestion` - Manually trigger ingestion
- **Logic**: Checks daily limits before allowing manual trigger

### B. Frontend Changes

#### 1. Usage Stats Hook
- **Location**: `packages/web/src/hooks/useUsageStats.ts`
- **Features**:
  - Fetches and caches usage statistics
  - Provides computed values: `hasReachedDailyLimit`, `canUploadMore`, `remainingUploads`
  - Auto-refetch capability

#### 2. CreateLibraryContent Modal
- **Location**: `packages/web/src/components/modals/CreateLibraryContent.tsx`
- **Updates**:
  - Displays daily upload usage: "Daily uploads: X/Y"
  - Shows "Upgrade to Pro" link for FREE users
  - Warning message when limit is reached explaining deferred ingestion
  - Tracks and reports deferred file count after upload
  - Refetches stats after uploads

#### 3. LibrarySourceSelector Component
- **Location**: `packages/web/src/components/shared/LibrarySourceSelector.tsx`
- **Updates**:
  - Displays daily usage counter in header
  - Shows "Upgrade" link for FREE users
  - Compact display suitable for summary/podcast creation modals

#### 4. Pending Sources Page
- **Location**: `packages/web/src/app/(app)/pending-sources/page.tsx`
- **Component**: `packages/web/src/components/features/library/PendingSourcesView.tsx`
- **Features**:
  - Lists all files waiting for ingestion
  - Shows file details: name, library, size, upload time
  - "Process Now" button for each file (disabled when limit reached)
  - Usage stats card with upgrade option
  - Helpful messages about limit reset timing
  - Refresh functionality

#### 5. Sidebar Notification
- **Location**: `packages/web/src/components/sidebar/SidebarActions.tsx`
- **Updates**:
  - Notification badge showing count of pending sources
  - Links to pending sources page
  - Auto-refreshes every 30 seconds

## User Experience Flow

### When Under Daily Limit
1. User sees "Daily uploads: 5/10" in upload UI
2. Files are uploaded and immediately queued for processing
3. No pending sources exist

### When At/Over Daily Limit
1. User sees "Daily uploads: 10/10" with red highlight
2. Warning message explains deferred ingestion option
3. User can still upload files - they're saved but marked pending
4. Sidebar shows notification badge with pending count
5. User can visit `/pending-sources` to see all waiting files
6. User can manually trigger ingestion when limit resets or upgrade to Pro

### For Pro Users
1. User sees "Daily uploads: unlimited" or "∞"
2. All uploads are immediately processed
3. No deferred ingestion occurs

## Database Migration

Run this migration to add the `pendingIngestion` field:

```bash
cd packages/backend
npx prisma migrate dev --name add_pending_ingestion_to_source
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/usage-stats` | Get user's current limits and usage |
| POST | `/source` | Upload file (supports deferred ingestion) |
| GET | `/source/pending-ingestion` | List all pending sources |
| POST | `/source/:id/trigger-ingestion` | Manually trigger ingestion |

## Configuration

All limits are configured in `packages/backend/src/auth/permissions.service.ts`:

```typescript
const LIMITS = {
  FREE: {
    SOURCE_UPLOAD_DAILY: 10,
    // ...
  },
  PRO: {
    SOURCE_UPLOAD_DAILY: Infinity,
    // ...
  },
};
```

## Benefits

1. **Transparency**: Users always know their current usage and limits
2. **No Data Loss**: Files can be uploaded even when limits are reached
3. **Flexibility**: Manual control over when to process pending files
4. **Upgrade Incentive**: Clear "Upgrade to Pro" CTAs throughout
5. **Better UX**: No hard blocks, just deferred processing
