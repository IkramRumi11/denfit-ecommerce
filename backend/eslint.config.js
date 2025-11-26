// backend/eslint.config.js
import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import nodePlugin from "eslint-plugin-node";
import importPlugin from "eslint-plugin-import";

export default [
  // 🧹 Ignore patterns (replaces old .eslintignore)
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "logs/**",
      "public/**",
      "scripts/old/**",
    ],
  },

  // 🧩 Core config
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        process: "readonly",
        __dirname: "readonly",
        require: "readonly",
        module: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      node: nodePlugin,
      import: importPlugin,
    },
    rules: {
      // ✅ Base ESLint + TS rules
      ...js.configs.recommended.rules,
      ...ts.configs.recommended.rules,

      // 🟩 Node.js environment
      "node/no-unsupported-features/es-syntax": "off",
      "node/no-missing-import": "off",
      "node/no-unpublished-import": "off",

      // 📦 Import organization
      "import/no-unresolved": "off",
      "import/order": [
        "warn",
        {
          groups: [["builtin", "external", "internal"]],
          "newlines-between": "always",
        },
      ],

      // 🧠 General hygiene
      "no-console": "off",
      "no-unused-vars": "warn",
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": "warn",
      "no-undef": "off",
    },
  },
];
