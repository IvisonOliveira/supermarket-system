/**
 * ESLint — @supermarket/backend (NestJS)
 *
 * Herda as regras base do `.eslintrc.js` da raiz e adiciona:
 *  - type-aware linting (parserOptions.project)
 *  - regras de segurança async (no-floating-promises, no-misused-promises)
 *  - suporte a decorators do TypeScript/NestJS
 */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    // Habilita emitDecoratorMetadata para NestJS
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
  },

  extends: [
    // Herda base da raiz (não precisa re-declarar parser/plugins/import)
    'plugin:@typescript-eslint/recommended-type-checked',
    'prettier',
  ],

  rules: {
    // --- Segurança assíncrona ---
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
    '@typescript-eslint/await-thenable': 'error',

    // --- NestJS patterns ---
    '@typescript-eslint/explicit-function-return-type': 'off', // muito verboso com NestJS
    '@typescript-eslint/explicit-module-boundary-types': 'off', // inferido pelo framework
    '@typescript-eslint/no-explicit-any': 'warn',

    // Permite `void dto;` como marker de "não implementado ainda" nos services
    '@typescript-eslint/no-unused-expressions': 'off',

    // class-validator usa decorators em propriedades — precisamos de unsafe member access
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/unbound-method': ['error', { ignoreStatic: true }],
  },

  env: {
    node: true,
  },
};
