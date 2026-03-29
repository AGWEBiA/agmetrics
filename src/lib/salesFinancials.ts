type SaleLike = {
  platform?: string | null;
  amount?: number | string | null;
  gross_amount?: number | string | null;
  base_price?: number | string | null;
  platform_fee?: number | string | null;
  coproducer_commission?: number | string | null;
  payload?: Record<string, any> | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    const sanitized = trimmed.replace(/[^\d,.-]/g, "");
    const hasComma = sanitized.includes(",");
    const hasDot = sanitized.includes(".");

    const normalized = hasComma && hasDot
      ? sanitized.lastIndexOf(",") > sanitized.lastIndexOf(".")
        ? sanitized.replace(/\./g, "").replace(/,/g, ".")
        : sanitized.replace(/,/g, "")
      : hasComma
        ? sanitized.replace(/,/g, ".")
        : sanitized;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toCentsNumber(value: unknown): number {
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed / 100 : 0;
}

function getPayloadObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function getKiwifyPlatformFee(sale: SaleLike): number {
  const payload = getPayloadObject(sale.payload);
  const detail = getPayloadObject(payload._detail);
  const commissions = getPayloadObject(payload.Commissions || payload.commissions || detail.Commissions || detail.commissions);
  const payment = getPayloadObject(payload.payment || payload.Payment || detail.payment || detail.Payment);

  const decimalFeeCandidates = [
    payload.taxas,
    payload["taxas"],
    detail.taxas,
    detail["taxas"],
  ];

  for (const candidate of decimalFeeCandidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      const parsed = toNumber(candidate);
      if (parsed > 0) return parsed;
    }
  }

  const feeCandidates = [
    commissions.kiwify_fee,
    payload.fee_amount,
    payload.kiwify_fee,
    payment.fee_amount,
    detail.fee_amount,
    detail.kiwify_fee,
  ];

  for (const candidate of feeCandidates) {
    if (candidate !== undefined && candidate !== null && candidate !== "") {
      const parsed = toCentsNumber(candidate);
      if (parsed > 0) return parsed;
    }
  }

  return toNumber(sale.platform_fee);
}

function getHotmartCoproducerCommissionFromPayload(payload: Record<string, any>): number {
  const commissionGroups = [
    payload.commissions,
    payload.purchase?.commissions,
    payload.data?.commissions,
    payload.data?.purchase?.commissions,
  ];

  for (const group of commissionGroups) {
    if (!Array.isArray(group) || group.length === 0) continue;

    return group.reduce((sum, item) => {
      const role = String(item?.source || item?.role || "").toUpperCase();
      if (!role || role === "PRODUCER" || role === "SELLER") return sum;
      return sum + toNumber(item?.value ?? item?.amount ?? 0);
    }, 0);
  }

  return 0;
}

function getHotmartPlatformFee(sale: SaleLike): number {
  const payload = getPayloadObject(sale.payload);
  const grossValue = toNumber(sale.gross_amount) || toNumber(sale.base_price);
  const producerNet = toNumber(sale.amount);
  const storedFee = toNumber(sale.platform_fee);
  const payloadCoproducerCommission = getHotmartCoproducerCommissionFromPayload(payload);
  const coproducerCommission = payloadCoproducerCommission || toNumber(sale.coproducer_commission);
  const totalDeduction = Math.max(0, grossValue - producerNet);

  if (totalDeduction > 0) {
    return Math.max(0, totalDeduction - coproducerCommission);
  }

  return storedFee;
}

export function getNormalizedPlatformFee(sale: SaleLike): number {
  if (sale.platform === "kiwify") return getKiwifyPlatformFee(sale);
  if (sale.platform === "hotmart") return getHotmartPlatformFee(sale);
  return toNumber(sale.platform_fee);
}