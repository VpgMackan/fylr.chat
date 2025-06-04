import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get("http://localhost:3001/auth/profile", {
          withCredentials: true,
        });
        setIsAuthenticated(true);
      } catch (error: any) {
        if (error.response?.status === 401) {
          setIsAuthenticated(false);
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isAuthenticated, isLoading };
}
