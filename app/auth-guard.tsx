"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoadingScreen from "./loading-screen";

const PUBLIC_ROUTES = new Set(["/login", "/signup"]);
const AUTH_CHECK_TIMEOUT_MS = 1500;

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const currentPath = pathname ?? "/";
  const isPublicRoute = PUBLIC_ROUTES.has(currentPath);

  useEffect(() => {
    if (isPublicRoute) {
      setIsChecking(false);
      return;
    }

    let isMounted = true;
    setIsChecking(true);

    const checkSession = async () => {
      const fallbackTimer = setTimeout(() => {
        if (!isMounted) {
          return;
        }
        if (!isPublicRoute) {
          router.replace("/login");
        }
        setIsChecking(false);
      }, AUTH_CHECK_TIMEOUT_MS);

      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) {
          return;
        }

        const hasSession = Boolean(data.session);
        if (!hasSession) {
          router.replace("/login");
        }
      } catch {
        if (isMounted) {
          router.replace("/login");
        }
      } finally {
        clearTimeout(fallbackTimer);
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [isPublicRoute, router]);

  if (isChecking) {
    return <LoadingScreen label="Checking your session..." />;
  }

  return <>{children}</>;
}
