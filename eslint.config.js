import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // TypeScript handles unused vars via noUnusedLocals/noUnusedParameters
      "@typescript-eslint/no-unused-vars": "off",
      // Enforce no explicit any to maintain type safety
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  }
);
