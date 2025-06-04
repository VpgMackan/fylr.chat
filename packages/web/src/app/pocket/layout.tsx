"use client";

import { withAuth } from "@/components/auth/withAuth";

function PocketLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export default withAuth(PocketLayout);
