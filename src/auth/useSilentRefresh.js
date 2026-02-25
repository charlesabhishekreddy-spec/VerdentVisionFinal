import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function useSilentRefresh() {
  const { refreshToken } = useAuth();

  useEffect(() => {
    if (!refreshToken) return;

    const interval = setInterval(() => {
      refreshToken();
    }, 1000 * 60 * 10); // every 10 minutes

    return () => clearInterval(interval);
  }, [refreshToken]);
}