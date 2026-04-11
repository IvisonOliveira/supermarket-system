/**
 * ESLint — @supermarket/admin (React + Vite)
 *
 * Herda as regras base do `.eslintrc.js` da raiz e adiciona:
 *  - plugin:react/recommended    → regras React core
 *  - plugin:react-hooks/recommended → regras de hooks (deps arrays etc.)
 *  - plugin:jsx-a11y/recommended → acessibilidade básica
 */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },

  plugins: ['react', 'react-hooks', 'jsx-a11y'],

  extends: [
    'plugin:react/recommended',
    'plugin:react/jsx-runtime', // não exige `import React` no topo (React 17+)
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],

  settings: {
    react: { version: 'detect' },
  },

  rules: {
    // --- React ---
    'react/prop-types': 'off',           // TypeScript supre essa necessidade
    'react/display-name': 'warn',
    'react/self-closing-comp': 'error',
    'react/jsx-no-useless-fragment': 'error',
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],

    // --- Hooks ---
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // --- Acessibilidade ---
    'jsx-a11y/anchor-is-valid': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',

    // --- TypeScript + React ---
    '@typescript-eslint/no-explicit-any': 'warn',
  },

  env: {
    browser: true,
    es2022: true,
  },
};
