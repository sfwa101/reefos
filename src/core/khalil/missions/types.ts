/**
 * Khalil — Mission engine internal type aliases (P3.2).
 *
 * Re-exports the contracts file. Kept as a separate module because the
 * governance tripwire scans `missions/` and forbids non-deterministic
 * primitives — splitting the file keeps engine sources tightly scoped.
 */
export * from "./contracts";
