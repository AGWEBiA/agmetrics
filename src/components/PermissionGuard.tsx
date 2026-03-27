import { useCurrentUser, hasPermission } from "@/hooks/useCurrentUser";
import type { AppPermission } from "@/hooks/useAdminUsers";
import { Shield } from "lucide-react";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: AppPermission;
  adminOnly?: boolean;
}

export function PermissionGuard({ children, permission, adminOnly }: PermissionGuardProps) {
  const { data: user, isLoading, isFetching } = useCurrentUser();

  // Show loading while auth session is initializing, query is running,
  // or user is null (race condition: session not yet available to react-query)
  if (isLoading || isFetching || user === undefined || user === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (adminOnly && user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mb-4 h-12 w-12 text-destructive/50" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  if (permission && !hasPermission(user, permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mb-4 h-12 w-12 text-destructive/50" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return <>{children}</>;
}
