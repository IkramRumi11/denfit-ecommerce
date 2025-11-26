 // .eslintrc.root.backup.cjs
module.exports = {
  root: true,
  env: {
    browser: true,     // ✅ Enables window, document, fetch, etc.
    es2021: true,
    node: false
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: "detect"
    }
  },
  plugins: [
    "react",
    "react-hooks",
    "@typescript-eslint"
  ],
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  rules: {
    // ✅ Fix false positives for browser code
    "no-undef": "off",

    // ✅ Allow console for debugging
    "no-console": "off",

    // ✅ Keep lint strict but reasonable
    "no-empty": "warn",
    "no-unused-vars": "warn",
    "@typescript-eslint/no-unused-vars": ["warn"],

    // ✅ React-specific
    "react/react-in-jsx-scope": "off", // React 17+ JSX transform
    "react/prop-types": "off",
    "react-hooks/exhaustive-deps": "warn"
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "vite.config.ts",
    "eslint.config.js"
  ]
};
