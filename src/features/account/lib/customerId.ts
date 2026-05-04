/**
 * Derives a deterministic, premium-looking customer ID from a UUID.
 * Output format: "2050 8800 6600" (three 4-char groups, leading "20" prefix).
 */
export function formatCustomerId(uuid: string | null | undefined): string {
  if (!uuid) return "0000 0000 0000";
  const hex = uuid.replace(/[^0-9a-f]/gi, "").toUpperCase();
  // Convert hex chars to digits using charCode mod 10 for a numeric-looking ID
  const digits = hex
    .split("")
    .map((c) => (parseInt(c, 16) % 10).toString())
    .join("")
    .padEnd(10, "0")
    .slice(0, 10);
  const body = `20${digits}`; // 12 digits total
  return toBankGroups(body, 4);
}

export function toBankGroups(s: string, size = 4): string {
  return s.match(new RegExp(`.{1,${size}}`, "g"))?.join(" ") ?? s;
}
