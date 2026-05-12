import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * Wave P-0 — Guardrails (Constitution Article 3 + 3a).
 *
 * `no-restricted-imports` is set to WARN, not ERROR, so the existing
 * legacy violations (74 direct supabase imports in UI, 58 importers of
 * `@/lib/products`) remain visible without breaking the build. Each
 * purification wave (P-A → P-E) MUST monotonically reduce the warning
 * count (see `docs/baselines/PURIFICATION_BASELINE.md`). Once C1 + C2
 * reach zero, flip these rules to "error" via an ADR.
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
  ],
  patterns: ["@/lib/products/*"],
};

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
  // Wave P-0 — Block direct Supabase imports inside UI layers.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}", "src/apps/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["warn", SUPABASE_CLIENT_FORBIDDEN_IN_UI],
    },
  },
  // Wave P-0 — Block the legacy static catalog everywhere (any new file).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/products.ts", "src/lib/products/**"],
    rules: {
      "no-restricted-imports": ["warn", LEGACY_PRODUCTS_FORBIDDEN_EVERYWHERE],
    },
  },
  eslintPluginPrettier,
);
