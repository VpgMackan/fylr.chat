# Fix: PRO Users Source Limit Issue

## Problem
After implementing the library source limit optimization, PRO users were incorrectly limited to 5 sources per library. The frontend was hardcoded to enforce a 5-source limit for all users, regardless of their subscription plan.

## Root Cause
1. Frontend `CreateLibraryContent.tsx` had a hardcoded limit of 5 sources
2. The `/auth/profile` endpoint only returned JWT payload data (id, email, name) without the user's role
3. No mechanism existed to fetch and use the user's subscription role in the UI

## Solution

### 1. Updated TypeScript Types
**File:** `packages/types/src/interfaces/api.interfaces.ts`

Added `role` field to `UserApiResponse`:
```typescript
export interface UserApiResponse {
  id: string;
  email: string;
  name: string;
  role?: 'FREE' | 'PRO';  // Added this field
}
```

### 2. Updated Backend Auth Service
**File:** `packages/backend/src/auth/auth.service.ts`

Added new `getProfile` method that fetches full user data from database:
```typescript
async getProfile(userId: string): Promise<UserApiResponse> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,  // Now includes role
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return user;
}
```

### 3. Updated Auth Controller
**File:** `packages/backend/src/auth/auth.controller.ts`

Changed `/auth/profile` endpoint to call the new service method:
```typescript
@UseGuards(AuthGuard)
@Get('profile')
async getProfile(@Request() req: RequestWithUser) {
  // Fetch full user data including role from database
  return this.authService.getProfile(req.user.id);
}
```

### 4. Updated Frontend Library Creation Component
**File:** `packages/web/src/components/modals/CreateLibraryContent.tsx`

**Changes:**
- Added `userRole` state to track user's subscription level
- Added `useEffect` to fetch user profile and role on component mount
- Made `maxSources` dynamic: `Infinity` for PRO users, `5` for FREE users
- Updated file selection validation to use dynamic limit
- Updated UI to show appropriate limits based on role:
  - FREE: "(x/5)"
  - PRO: "(x - unlimited)"
- Button disables only when FREE users reach 5 sources

**Key Code:**
```typescript
const [userRole, setUserRole] = useState<'FREE' | 'PRO' | null>(null);
const maxSources = userRole === 'PRO' ? Infinity : 5;

// Fetch user role on mount
useEffect(() => {
  const fetchUserRole = async () => {
    try {
      const response = await axios.get('/auth/profile');
      setUserRole(response.data.role || 'FREE');
    } catch (err) {
      setUserRole('FREE'); // Default to FREE on error
    }
  };
  fetchUserRole();
}, []);
```

## Testing

### Test Cases:
1. ✅ **FREE User - Under Limit:** Can add 1-5 sources
2. ✅ **FREE User - At Limit:** Button disables at 5 sources
3. ✅ **FREE User - Over Limit:** File selection auto-limits to 5
4. ✅ **PRO User - Unlimited:** Can add more than 5 sources
5. ✅ **PRO User - UI Display:** Shows "unlimited" instead of count
6. ✅ **Backend Validation:** Still enforces limits on backend (defense in depth)

### How to Verify You're on PRO Plan:
Check your user role in the database:
```sql
SELECT id, email, role FROM "Users" WHERE email = 'your-email@example.com';
```

Or activate a subscription via the API/UI which will set your role to PRO.

## Security Considerations

✅ **Defense in Depth:** Backend still validates limits in transaction
✅ **Role Verification:** Role is fetched from database, not client-controlled
✅ **Fallback:** Defaults to FREE tier on error (fail-safe)

## Related Changes

This fix complements the previous optimization in:
- `/docs/library_source_limit_fix.md` - Original race condition fix
- Backend transaction-based validation remains unchanged
- Sequential upload mechanism remains unchanged

## Future Enhancements

1. **Cache User Role:** Store user role in React Context to avoid repeated API calls
2. **Real-time Updates:** Listen for subscription changes via WebSocket
3. **Visual Upgrade Prompts:** Show upgrade CTA when FREE users hit limits
4. **Progress Indicators:** Show upload progress for multiple files

## Files Modified

- ✅ `packages/types/src/interfaces/api.interfaces.ts`
- ✅ `packages/backend/src/auth/auth.service.ts`
- ✅ `packages/backend/src/auth/auth.controller.ts`
- ✅ `packages/web/src/components/modals/CreateLibraryContent.tsx`

## Rollback Plan

If issues arise:
1. Revert `auth.service.ts` changes (remove `getProfile` method)
2. Revert `auth.controller.ts` to return `req.user` directly
3. Revert frontend to hardcoded limit of 5 (but this brings back the PRO user issue)
