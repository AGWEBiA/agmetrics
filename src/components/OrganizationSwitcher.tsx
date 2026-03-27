import { useUserOrganizations, useCurrentOrganization, useSwitchOrganization } from "@/hooks/useOrganization";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function OrganizationSwitcher() {
  const { data: orgs } = useUserOrganizations();
  const { data: currentOrg } = useCurrentOrganization();
  const switchOrg = useSwitchOrganization();

  // Don't show if user has only one org
  if (!orgs || orgs.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 px-2">
          <Building2 className="h-3.5 w-3.5" />
          <span className="max-w-[120px] truncate">{currentOrg?.name || "Organização"}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => {
              if (org.id !== currentOrg?.id) {
                switchOrg.mutate(org.id);
              }
            }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{org.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {org.userRole === "owner" ? "Dono" : org.userRole === "admin" ? "Admin" : "Membro"}
              </Badge>
              {org.id === currentOrg?.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
