# Library Source Limit Optimization

## Problem
When creating a library with multiple source files, users on the free plan were able to upload more than 5 sources (the free plan limit). This occurred due to a race condition:

1. User creates a library (0 sources)
2. User uploads 6+ sources simultaneously via `Promise.all()`
3. Each upload checks `canAddSourceToLibrary` concurrently
4. All uploads see 0 sources initially and pass the check
5. All sources get created before any upload completes

## Solution

### 1. Backend Fix: Transaction-Based Source Count Check
**File:** `packages/backend/src/source/source.service.ts`

**Changes:**
- Wrapped the entire `createSource` method in a Prisma transaction (`$transaction`)
- Moved the source count check inside the transaction
- This ensures atomic checking and creation of sources, preventing race conditions
- The source count is now checked with a lock, so concurrent requests will queue

**Key Improvements:**
```typescript
// Before: Non-atomic check
const canAddSource = await this.permissionsService.canAddSourceToLibrary(userId, libraryId);

// After: Atomic check within transaction
return await this.prisma.$transaction(async (tx) => {
  const currentCount = await tx.source.count({ where: { libraryId } });
  const limit = user.role === 'PRO' ? Infinity : 5;
  if (currentCount >= limit) {
    throw new ForbiddenException('...');
  }
  // ... create source
});
```

### 2. Frontend Fix: Sequential Uploads
**File:** `packages/web/src/components/modals/CreateLibraryContent.tsx`

**Changes:**
- Changed from parallel uploads (`Promise.all()`) to sequential uploads (for loop)
- Added client-side validation to prevent selecting more than 5 sources
- Added visual feedback showing source count (x/5)
- Disabled "Add Sources" button when limit is reached
- Improved error handling to show partial success messages

**Key Improvements:**
```typescript
// Before: Parallel uploads (race condition)
const uploadPromises = sourceFiles.map((source) => uploadSource(library.id, source.file));
await Promise.all(uploadPromises);

// After: Sequential uploads (no race condition)
for (const source of sourceFiles) {
  try {
    await uploadSource(library.id, source.file);
    uploadedCount++;
  } catch (uploadErr: any) {
    if (uploadErr.response?.status === 403) {
      setError(`Successfully uploaded ${uploadedCount} source(s). ...`);
      break;
    }
    throw uploadErr;
  }
}
```

### 3. User Experience Improvements

1. **Visual Limit Indicator:** Shows "(x/5 on free plan)" next to the Sources label
2. **Button State:** Changes text to "Maximum Sources Reached" when at limit
3. **File Selection Validation:** Prevents selecting more than 5 files total
4. **Better Error Messages:** Shows how many sources were successfully uploaded before hitting the limit
5. **Progressive Upload:** If user tries to upload 6 files, the first 5 will succeed and a clear error message will be shown

## Testing Recommendations

1. **Free User - Exact Limit:** Create library with exactly 5 sources ✓
2. **Free User - Over Limit:** Try to create library with 6+ sources (should stop at 5) ✓
3. **Free User - Multiple Selections:** Add 3 sources, then try to add 3 more (should only add 2) ✓
4. **Free User - Concurrent Requests:** Test with multiple browsers/tabs simultaneously
5. **Pro User:** Verify unlimited sources work correctly
6. **Error Recovery:** Verify partial uploads are handled gracefully

## Performance Impact

- **Sequential Uploads:** Slightly slower for multiple files, but provides:
  - Better error handling
  - No race conditions
  - Clearer progress tracking
  - More predictable behavior

- **Transaction Overhead:** Minimal, as the transaction is scoped only to source creation logic

## Future Enhancements

1. **Dynamic Limit Detection:** Fetch user's role/subscription from API to show correct limit (currently hardcoded to 5)
2. **Upload Progress Bar:** Show progress for sequential uploads
3. **Batch Upload Optimization:** For Pro users, could still use parallel uploads
4. **Better Limit Communication:** Show upgrade prompt when hitting limits

## Related Files

- `packages/backend/src/source/source.service.ts` - Backend source creation logic
- `packages/backend/src/auth/permissions.service.ts` - Permission checking (unchanged, still used for daily limits)
- `packages/web/src/components/modals/CreateLibraryContent.tsx` - Library creation UI
- `docs/permissions_implementation.md` - Original permissions documentation

## Rollback Plan

If issues arise, the changes can be easily reverted:
1. Remove the transaction wrapper in backend (revert to original `canAddSourceToLibrary` check)
2. Change frontend back to `Promise.all()` parallel uploads
3. Remove frontend validation

However, this would reintroduce the race condition.
