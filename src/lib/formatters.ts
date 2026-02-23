export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals).replace(".", ",")}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

export function formatNumberBR(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDecimal(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace(".", ",");
}

/**
 * Formats a date string (UTC/ISO) to pt-BR format using São Paulo timezone.
 * This ensures dates match what users see on Hotmart/Kiwify platforms.
 */
export function formatDateBR(dateStr: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    ...options,
  });
}

/**
 * Formats a date string with date + time in São Paulo timezone.
 */
export function formatDateTimeBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
