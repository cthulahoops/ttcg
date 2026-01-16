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
      // Will be addressed in separate PRD item "no-explicit-any"
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  }
);
