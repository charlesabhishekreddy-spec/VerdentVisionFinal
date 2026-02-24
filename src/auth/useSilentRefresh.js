import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function useSilentRefresh() {
  const { refreshToken } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshToken?.();
    }, 1000 * 60 * 10); // every 10 min

    return () => clearInterval(interval);
  }, []);
}