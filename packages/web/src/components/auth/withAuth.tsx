"use client";

import { useAuth } from "@/hooks/useAuth";
import { useTranslations } from "next-intl";

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  // const t = useTranslations("pages.auth.withAuth");
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return <div>{"checking"}</div>;
    }

    if (!isAuthenticated) {
      return <div>{"redirecting"}</div>;
    }

    return <Component {...props} />;
  };
}
