-- Fix Kiwify sales: move fee from taxes to platform_fee where it was misplaced
-- Case 1: platform_fee=0, taxes>0 → move taxes to platform_fee, zero taxes
UPDATE sales_events
SET platform_fee = taxes, taxes = 0
WHERE platform = 'kiwify' AND platform_fee = 0 AND taxes > 0;

-- Case 2: both have same value (duplicated) → zero out taxes
UPDATE sales_events
SET taxes = 0
WHERE platform = 'kiwify' AND platform_fee > 0 AND taxes > 0 AND platform_fee = taxes;