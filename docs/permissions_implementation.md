# Permissions Implementation Summary

## Overview
This document outlines the implementation of permissions checks across all services that require usage limits and access control based on user roles (FREE vs PRO).

## Changes Made

### 1. Source Service (`source.service.ts`)
**Permissions Checks Added:**
- **`canAddSourceToLibrary`**: Validates that the user hasn't exceeded the maximum number of sources per library
- **`authorizeFeatureUsage('SOURCE_UPLOAD_DAILY')`**: Enforces daily upload limit for FREE users

**Location:** `createSource` method
**Limits:**
- FREE: 5 sources per library, 10 uploads per day
- PRO: Unlimited

### 2. Summary Service (`summary.service.ts`)
**Permissions Checks Added:**
- **`authorizeFeatureUsage('SUMMARY_GENERATION_MONTHLY')`**: Enforces monthly summary generation limit

**Location:** `createSummary` method
**Limits:**
- FREE: 20 summaries per month
- PRO: Unlimited

### 3. Podcast Service (`podcast.service.ts`)
**Permissions Checks Added:**
- **`authorizeFeatureUsage('PODCATS_GENERATION_MONTHLY')`**: Enforces monthly podcast generation limit

**Location:** `createPodcast` method
**Limits:**
- FREE: 5 podcasts per month
- PRO: Unlimited

**Note:** The enum uses `PODCATS_GENERATION_MONTHLY` (typo in schema)

### 4. Message Service (`message.service.ts`)
**Permissions Checks Added:**
- **`authorizeFeatureUsage('CHAT_MESSAGES_DAILY')`**: Enforces daily chat message limit for regular (non-agentic) mode
- **`authorizeFeatureUsage('CHAT_AGENTIC_MESSAGES_DAILY')`**: Enforces daily chat message limit for agentic mode with tools

**Locations:** 
- `generateAndStreamAiResponse` (regular chat)
- `generateAndStreamAiResponseWithTools` (agentic chat)

**Limits:**
- FREE: 50 regular messages per day, 20 agentic messages per day
- PRO: Unlimited

### 5. Library Service (`library.service.ts`)
**Already Implemented:**
- **`canCreateLibrary`**: Validates maximum number of libraries per user

**Limits:**
- FREE: 3 libraries
- PRO: Unlimited

## Module Updates

The following modules were updated to inject `PermissionsService`:

1. **`source.module.ts`** - Added `PermissionsService` to providers
2. **`summary.module.ts`** - Added `PermissionsService` to providers
3. **`podcast.module.ts`** - Added `PermissionsService` to providers
4. **`chat.module.ts`** - Added `PermissionsService` to providers

## Permissions Service Fix

Fixed inconsistency in `permissions.service.ts`:
- Changed `PODCAST_GENERATION_MONTHLY` to `PODCATS_GENERATION_MONTHLY` in LIMITS object to match the enum in the Prisma schema

## Usage Record Features

The system tracks usage for the following features:

| Feature | Period | FREE Limit | PRO Limit |
|---------|--------|------------|-----------|
| `SUMMARY_GENERATION_MONTHLY` | Monthly | 20 | Unlimited |
| `PODCATS_GENERATION_MONTHLY` | Monthly | 5 | Unlimited |
| `CHAT_MESSAGES_DAILY` | Daily | 50 | Unlimited |
| `CHAT_AGENTIC_MESSAGES_DAILY` | Daily | 20 | Unlimited |
| `SOURCE_UPLOAD_DAILY` | Daily | 10 | Unlimited |

## Error Handling

When limits are exceeded, users receive a `ForbiddenException` with appropriate error messages directing them to upgrade to PRO.

Example messages:
- "You have reached your usage limit for this feature. Please upgrade to Pro."
- "You have reached the maximum number of sources for this library. Please upgrade to add more."
- "You have reached the maximum number of libraries for your plan. Please upgrade to create more."

## Implementation Details

### How `authorizeFeatureUsage` Works

1. **PRO Users**: Bypass all checks immediately
2. **FREE Users**: 
   - Retrieves or creates a `UsageRecord` for the user and feature
   - Checks if the current period has expired (daily/monthly)
   - If expired, resets the counter to 1 for the new period
   - If not expired, checks if limit is reached
   - If limit not reached, increments the counter
   - Throws `ForbiddenException` if limit is exceeded

### Period Calculation

- **Monthly**: Start of the current month (1st day at 00:00:00)
- **Daily**: Start of the current day (00:00:00)

## Testing Recommendations

1. Test FREE user limits for all features
2. Test PRO user unlimited access
3. Test period reset (daily and monthly)
4. Test error messages for exceeded limits
5. Test that usage records are properly created and updated
6. Test concurrent requests to ensure transaction safety

## Future Improvements

1. Consider fixing the typo in the Prisma schema: `PODCATS_GENERATION_MONTHLY` → `PODCAST_GENERATION_MONTHLY`
2. Add analytics dashboard for usage tracking
3. Add warnings when users are approaching their limits
4. Consider implementing soft limits with warnings before hard limits
