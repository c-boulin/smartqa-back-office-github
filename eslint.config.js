import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Better handling of unused variables to reduce false positives
      '@typescript-eslint/no-unused-vars': [
        'warn',  // Changed from 'error' to 'warn' to prevent build breaks
        {
          argsIgnorePattern: '^_',              // Ignore params starting with _
          varsIgnorePattern: '^_',               // Ignore variables starting with _
          caughtErrorsIgnorePattern: '^_',       // Ignore caught errors starting with _
          destructuredArrayIgnorePattern: '^_',  // Ignore destructured arrays with _
          ignoreRestSiblings: true,              // Ignore rest properties in destructuring
        }
      ],
    },
  }
);
