import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function PushNotificationToggle() {
  const { permission, requestPermission, showNotification } = useBrowserNotifications();

  const handleClick = async () => {
    if (permission === "default") {
      const result = await requestPermission();
      if (result === "granted") {
        showNotification("AGMetrics", {
          body: "Notificações ativadas! Você será avisado sobre novas vendas.",
        });
      }
    }
  };

  if (typeof Notification === "undefined") return null;

  const icon =
    permission === "granted" ? (
      <BellRing className="h-4 w-4 text-primary" />
    ) : permission === "denied" ? (
      <BellOff className="h-4 w-4 text-muted-foreground" />
    ) : (
      <Bell className="h-4 w-4" />
    );

  const label =
    permission === "granted"
      ? "Push ativo"
      : permission === "denied"
      ? "Push bloqueado"
      : "Ativar push";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={permission === "denied" || permission === "granted"}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
