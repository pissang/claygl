module.exports = {
  parser: '@typescript-eslint/parser',
  root: true,
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['@typescript-eslint'],
  rules: {
    'no-var': 2,
    'no-duplicate-imports': 2,
    'prefer-const': 1,
    'dot-notation': [2, { allowKeywords: true, allowPattern: '^catch$' }],
    'no-array-constructor': 2,
    'no-label-var': 2,
    'no-undef-init': 2,
    'no-dupe-class-members': 0,
    'no-redeclare': 0,
    'no-unused-vars': 0,
    '@typescript-eslint/no-redeclare': 2,
    '@typescript-eslint/no-unused-vars': [1, { vars: 'local', args: 'none' }],
    '@typescript-eslint/no-dupe-class-members': 2
  },
  env: {
    browser: true
  },
  globals: {
    self: false
  }
};