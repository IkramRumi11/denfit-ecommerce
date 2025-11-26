// frontend/eslint.config.js
import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import jsxA11y from "eslint-plugin-jsx-a11y";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  {
    ignores: ["dist/**", "node_modules/**", "vite.config.*"],
  },

  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // ✅ Browser + DOM globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        File: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
      },
    },

    plugins: {
      react,
      "react-hooks": reactHooks,
      "@typescript-eslint": ts,
      "jsx-a11y": jsxA11y,
    },

    settings: {
      react: { version: "detect" },
    },

    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...ts.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // React + Hooks
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // TypeScript / general
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/no-explicit-any": "off",
      "no-undef": "off",
      "no-console": "off",
      "no-empty": "warn",

      // Accessibility
      "jsx-a11y/alt-text": "warn",

      // Optional readability relaxations
      "react/no-unescaped-entities": "off",
    },
  },
];
