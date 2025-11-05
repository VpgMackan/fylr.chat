'use client';

import { createContext, useContext } from 'react';

interface UserContextType {
  userRole: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  children,
  userRole,
}: {
  children: React.ReactNode;
  userRole: string;
}) {
  return (
    <UserContext.Provider value={{ userRole }}>{children}</UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
