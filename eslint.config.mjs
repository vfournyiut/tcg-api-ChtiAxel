import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Vos règles personnalisées
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'error',
      'eqeqeq': ['error', 'always'],
      'prefer-const': ['error', { destructuring: 'all' }],
      'no-useless-rename': 'error',
      'no-useless-constructor': 'error',
      'no-debugger': 'error',
      'no-throw-literal': 'error',
      'no-unused-expressions': 'error',
      'no-var': 'error',
      'no-redeclare': 'error',
      'no-const-assign': 'error',
    },
    files: ['src/*/.ts'],
  },
  {
    ignores: ['node_modules', 'dist', 'build', 'tests', 'coverage'],
  }
)