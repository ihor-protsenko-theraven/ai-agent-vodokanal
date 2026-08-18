import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'release-please-config.json',
    ],
  },
  {
    files: ['src/**/*.ts', 'vite.config.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { sonarjs },
    rules: {
      // The migration remains visible in lint output. Escalate a rule to `error`
      // after the existing backlog for it is cleared.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': [
        'warn',
        { checksVoidReturn: { attributes: false } },
      ],

      // Maintainability signals: visible in local/PR logs while legacy modules
      // are gradually decomposed into feature layers.
      complexity: ['warn', 12],
      'max-lines-per-function': [
        'warn',
        { max: 120, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['warn', 4],
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-duplicate-string': ['warn', { threshold: 4 }],
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/regex-complexity': ['warn', { threshold: 20 }],
      'sonarjs/super-linear-regex': 'warn',
      'sonarjs/pseudo-random': 'warn',
      'sonarjs/no-hardcoded-secrets': 'warn',
      'sonarjs/no-identical-functions': 'warn',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    },
  },
  {
    files: ['src/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    files: ['api/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    plugins: { sonarjs },
    rules: {
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-hardcoded-secrets': 'warn',
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    },
  },
);
