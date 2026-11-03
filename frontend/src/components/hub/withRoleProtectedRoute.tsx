"use client";

import React, { useEffect, ComponentType } from "react";
import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/layout/LoadingScreen";
import type { SessionViewer } from "@/lib/api/auth";

/**
 * A page only some viewers may open (the server checks every call anyway):
 * `withRoleProtectedRoute(Page, (viewer) => viewer.can.score)`. Anyone else,
 * signed out included, goes to the home page.
 */
const withRoleProtectedRoute = <P extends object>(
  WrappedComponent: ComponentType<P>,
  allowed: (viewer: SessionViewer) => boolean
) => {
  const ProtectedRoute: React.FC<P> = (props) => {
    const { viewer, loading } = useSession();
    const router = useRouter();

    const hasAccess = !!viewer && allowed(viewer);
    useEffect(() => {
      if (!loading && !hasAccess) {
        router.push("/");
      }
    }, [loading, hasAccess, router]);

    if (loading) {
      return <LoadingScreen />;
    }
    return hasAccess ? <WrappedComponent {...props} /> : null;
  };

  ProtectedRoute.displayName = `withRoleProtectedRoute(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return ProtectedRoute;
};

export default withRoleProtectedRoute;
