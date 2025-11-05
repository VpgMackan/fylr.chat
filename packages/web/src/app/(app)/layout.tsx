'use client';

import { withAuth } from '@/components/auth/withAuth';
import { EventsProvider } from '@/hooks/useEvents';
import { UserProvider } from '@/contexts/UserContext';

function AppLayout({
  children,
  userRole,
}: {
  children: React.ReactNode;
  userRole: string;
}) {
  return (
    <UserProvider userRole={userRole}>
      <EventsProvider>{children}</EventsProvider>
    </UserProvider>
  );
}

export default withAuth(AppLayout);
