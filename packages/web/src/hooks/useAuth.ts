'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/utils/axios';
import { isAxiosError } from 'axios';
import { logout as logoutApi } from '@/services/api/auth.api';
import toast from 'react-hot-toast';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>('FREE');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await axios.get('auth/profile');
        setIsAuthenticated(true);
        setUserRole(data.role);
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 401) {
          setIsAuthenticated(false);
          router.push('/auth/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const logout = async () => {
    try {
      await logoutApi();
      setIsAuthenticated(false);
      toast.success('Logged out successfully');
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return { isAuthenticated, isLoading, userRole, logout };
}
