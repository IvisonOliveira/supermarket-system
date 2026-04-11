/**
 * Configuração ESLint — raiz do monorepo
 *
 * Hierarquia de configs:
 *   .eslintrc.js          ← regras base TypeScript (este arquivo)
 *   apps/backend/.eslintrc.js  ← sobrescreve com regras NestJS
 *   apps/admin/.eslintrc.js    ← sobrescreve com regras React
 *
 * O campo `root: true` impede que o ESLint continue subindo além deste arquivo.
 */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },

  plugins: ['@typescript-eslint', 'import'],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier', // desativa regras que conflitam com Prettier — deve ser o último
  ],

  settings: {
    'import/resolver': {
      typescript: {
        project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
      },
    },
  },

  rules: {
    // --- TypeScript ---
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // --- Imports ---
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-duplicates': 'error',
    'import/no-cycle': 'warn',

    // --- Geral ---
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    eqeqeq: ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
  },

  ignorePatterns: [
    'dist/',
    'build/',
    'out/',
    'dist-electron/',
    'release/',
    'coverage/',
    'node_modules/',
    '*.js',
    '!.eslintrc.js', // este arquivo
    '!apps/*/.eslintrc.js', // configs dos apps
  ],
};
