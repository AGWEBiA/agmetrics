import { useCurrentUser, hasPermission } from "@/hooks/useCurrentUser";
import type { AppPermission } from "@/hooks/useAdminUsers";
import { Shield } from "lucide-react";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: AppPermission;
  adminOnly?: boolean;
}

export function PermissionGuard({ children, permission, adminOnly }: PermissionGuardProps) {
  const { data: user, isLoading, isFetching, isError, failureCount } = useCurrentUser();

  // Show loading while query is still in progress or user not yet resolved
  // Only consider it "truly failed" after all retries are exhausted AND isError is true
  const stillLoading = isLoading || isFetching || (!user && !isError) || (!user && failureCount < 3);

  if (stillLoading) {
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
        <p className="text-muted-foreground mb-4">Você não tem permissão para acessar esta página.</p>
        <div className="text-xs text-muted-foreground bg-muted p-4 rounded-md w-full max-w-xs text-left">
          <p className="mb-1 font-semibold">Debug Info:</p>
          <p>User ID: <span className="font-mono">{user?.id || "---"}</span></p>
          <p>Role: <span className="font-mono font-bold text-primary">{user?.role || "---"}</span></p>
          <p className="mt-2 text-[10px] opacity-70">
            Se você já rodou o SQL, tente sair e entrar novamente ou limpar o cache do navegador. 
            Se o papel continua "user", verifique se a tabela 'user_roles' no Supabase tem o RLS ativo.
          </p>
        </div>
      </div>
    );
  }

  if (permission && !hasPermission(user, permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mb-4 h-12 w-12 text-destructive/50" />
        <h2 className="text-lg font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground mb-4">Você não tem permissão para acessar esta página.</p>
        <div className="text-xs text-muted-foreground bg-muted p-4 rounded-md">
          <p>Seu ID de usuário no banco externo:</p>
          <code className="block mt-2 font-mono break-all">{user?.id || "Não identificado"}</code>
          <p className="mt-2 font-semibold">Papel atual: {user?.role || "Nenhum"}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
