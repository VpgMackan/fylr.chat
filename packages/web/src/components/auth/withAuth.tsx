'use client';

import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const t = useTranslations('pages.auth.withAuth');
    const { isAuthenticated, isLoading, userRole } = useAuth();

    if (isLoading) {
      return <div>{t('checking')}</div>;
    }

    if (!isAuthenticated) {
      return <div>{t('redirecting')}</div>;
    }

    return <Component {...props} userRole={userRole} />;
  };
}
