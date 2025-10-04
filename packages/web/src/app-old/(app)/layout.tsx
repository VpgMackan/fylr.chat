'use client';

import { withAuth } from '@/components/auth/withAuth';
import { EventsProvider } from '@/hooks/useEvents';

function AppLayout({ children }: { children: React.ReactNode }) {
  return <EventsProvider>{children}</EventsProvider>;
}

export default withAuth(AppLayout);
