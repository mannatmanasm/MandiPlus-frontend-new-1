"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import Loader from "@/shared/components/Loader";

export default function AgentProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!loading && isClient) {
      if (!user) {
        router.push("/login");
        return;
      }
      if (user?.identity !== "AGENT") {
        router.push("/home");
      }
    }
  }, [user, loading, isClient, router]);

  if (loading || !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size={50} color="border-purple-700" />
      </div>
    );
  }

  if (!user || user?.identity !== "AGENT") return null;

  return <>{children}</>;
}

