import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * Wave P-0 + Constitution v5.1 — Automated Enforcement.
 *
 * The Constitution is now backed by Linter Guards. Three new sovereign
 * rules ride alongside the legacy P-0 guards:
 *
 *   1. Kernel Purity (Article 2)        — `src/core/**` MUST NOT import
 *      from `@/apps/**`. Domains may not depend on a specific vertical.
 *   2. Gateway Exclusivity (Article 4)  — supabase.from(...) and
 *      supabase.rpc(...) are forbidden everywhere EXCEPT Sovereign
 *      Gateways (gateway directories), server functions (.functions.ts
 *      files), and the Supabase integration glue (src/integrations/supabase).
 *   3. UI Component Purity (Article 6)  — Raw button / input JSX
 *      is forbidden outside src/components/ui. Use the shadcn primitives
 *      (@/components/ui/button, @/components/ui/input).
 *
 * Legacy violations are reported (see EXECUTION_REPORT_AUTOMATED_CONSTITUTION.md)
 * but do not break `bun run build`, since Vite does not invoke ESLint.
 * They will be quarantined wave by wave until each counter reaches zero,
 * after which any disable-comment is treated as architectural treason
 * (Constitution v5.1 § Automated Enforcement).
 */
const SUPABASE_CLIENT_FORBIDDEN_IN_UI = {
  paths: [
    {
      name: "@/integrations/supabase/client",
      message:
        "Constitution Article 3 — UI layers (components/pages/apps) MUST NOT import the Supabase client directly. Go through a domain gateway (e.g. catalogGateway) or a server function.",
    },
  ],
};

const LEGACY_PRODUCTS_FORBIDDEN_EVERYWHERE = {
  paths: [
    {
      name: "@/lib/products",
      message:
        "Constitution Article 3a — `@/lib/products` is the legacy static catalog. New files MUST consume the canonical `catalogGateway` (`src/core/catalog/gateway`) instead.",
    },
    {
      name: "@/apps/reef-al-madina/features/storefront/components/SduiCategoryPage",
      message:
        "Wave P-C — `SduiCategoryPage` was decommissioned. Use `src/pages/store/SectionPage.tsx` (dynamic `/store/$slug` route) instead.",
    },
  ],
  patterns: [
    "@/lib/products/*",
    "**/SduiCategoryPage*",
  ],
};

// Constitution v5.1 — Kernel Purity. The Core (`src/core/**`) is the
// universal kernel; it MUST NOT depend on any specific vertical app.
const KERNEL_FORBIDDEN_APP_IMPORTS = {
  paths: LEGACY_PRODUCTS_FORBIDDEN_EVERYWHERE.paths,
  patterns: [
    ...LEGACY_PRODUCTS_FORBIDDEN_EVERYWHERE.patterns,
    {
      group: ["@/apps/*", "@/apps/**"],
      message:
        "Constitution v5.1 Article 2 (Kernel Purity) — `src/core/**` is the sovereign kernel and MUST NOT import from any vertical app under `@/apps/*`. Invert the dependency: expose a port from core and let the app implement it.",
    },
  ],
};

// Constitution v5.1 — Gateway Exclusivity. The selectors flag every
// `supabase.from(...)` and `supabase.rpc(...)` call expression.
const GATEWAY_EXCLUSIVITY_SYNTAX = [
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.object.name='supabase'][callee.property.name='from']",
    message:
      "Constitution v5.1 Article 4 (Gateway Exclusivity) — `supabase.from(...)` is forbidden outside Sovereign Gateways (`**/gateway/**`) and server functions (`*.functions.ts`). Route the call through the domain gateway.",
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.object.name='supabase'][callee.property.name='rpc']",
    message:
      "Constitution v5.1 Article 4 (Gateway Exclusivity) — `supabase.rpc(...)` is forbidden outside Sovereign Gateways and server functions. Wrap it inside the relevant gateway.",
  },
];

// Constitution v5.1 — UI Component Purity. Raw HTML `<button>`/`<input>`
// is forbidden outside the shadcn primitives directory.
const RAW_HTML_PRIMITIVES_SYNTAX = [
  {
    selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name='button']",
    message:
      "Constitution v5.1 Article 6 (UI Purity) — Raw `<button>` is forbidden. Use `<Button>` from `@/components/ui/button`.",
  },
  {
    selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name='input']",
    message:
      "Constitution v5.1 Article 6 (UI Purity) — Raw `<input>` is forbidden. Use `<Input>` from `@/components/ui/input`.",
  },
];

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Wave P-0 — Block direct Supabase client imports inside UI layers.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}", "src/apps/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["warn", SUPABASE_CLIENT_FORBIDDEN_IN_UI],
    },
  },
  // Wave P-B/B-10 — `src/lib/products.ts` vaporized.
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", LEGACY_PRODUCTS_FORBIDDEN_EVERYWHERE],
    },
  },
  // Constitution v5.1 — Kernel Purity (overrides the legacy rule for src/core/**).
  {
    files: ["src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", KERNEL_FORBIDDEN_APP_IMPORTS],
    },
  },
  // Constitution v5.1 — Gateway Exclusivity (global ban on supabase.from / supabase.rpc).
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...GATEWAY_EXCLUSIVITY_SYNTAX],
    },
  },
  // Allowlist — Sovereign Gateways, server functions, and the Supabase integration glue
  // are the ONLY surfaces permitted to call `supabase.from` / `supabase.rpc`.
  {
    files: [
      "src/integrations/supabase/**/*.{ts,tsx}",
      "src/**/gateway/**/*.{ts,tsx}",
      "src/**/*.functions.ts",
      "src/**/*.functions.tsx",
      "src/core/runtime-ui/watchdog.ts",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  // Constitution v5.1 — UI Component Purity (raw <button> / <input> banned).
  {
    files: ["src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...GATEWAY_EXCLUSIVITY_SYNTAX, ...RAW_HTML_PRIMITIVES_SYNTAX],
    },
  },
  // Allowlist — the shadcn primitives themselves wrap raw HTML elements.
  {
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...GATEWAY_EXCLUSIVITY_SYNTAX],
    },
  },
  eslintPluginPrettier,
);
