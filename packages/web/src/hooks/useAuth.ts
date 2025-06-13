"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "@/utils/axios";
import { isAxiosError } from "axios";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get("auth/profile");
        setIsAuthenticated(true);
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 401) {
          setIsAuthenticated(false);
          router.push("/auth/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isAuthenticated, isLoading };
}
