'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from '@/utils/axios';
import { isAxiosError } from 'axios';
import { logout as logoutApi } from '@/services/api/auth.api';
import toast from 'react-hot-toast';
import {
  identifyUser,
  resetUser,
  captureEvent,
} from '../../instrumentation-client';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>('FREE');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const checkAuth = async () => {
      try {
        const { data } = await axios.get('auth/profile');
        setIsAuthenticated(true);
        setUserRole(data.role);

        // Identify user for analytics (only if they've consented to full tracking)
        identifyUser(data.id, {
          email: data.email,
          name: data.name,
          role: data.role,
        });
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 401) {
          setIsAuthenticated(false);
          
          // Don't redirect if already on auth pages (check pathname for /auth/)
          const isAuthPage = pathname && pathname.includes('/auth/');
          if (!isAuthPage) {
            router.push('/auth/login');
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await logoutApi();
      setIsAuthenticated(false);

      // Reset analytics user identity on logout
      captureEvent('user_logged_out');
      resetUser();

      toast.success('Logged out successfully');
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return { isAuthenticated, isLoading, userRole, logout };
}
