
COMMENT ON FUNCTION public.place_order_atomic_v2 IS
'Atomic order placement.
TIME-LAG EXPLOIT GUARD (Phase 13.7): For every line item in the payload, the
server MUST re-resolve the current price by checking active flash_sales
(starts_at <= now() < ends_at AND active = true) and flash_deals (start_time
<= now() < end_time AND active = true). If the submitted price is lower than
the freshly-resolved price, the order MUST be rejected with an error such as
''offer_expired''. This mirrors src/core/engine/pricing/strategies/FlashPriceResolver.ts
on the client and prevents customers from replaying an expired discount that
was cached in their cart.';
