module.exports = {
  parser: '@typescript-eslint/parser',
  root: true,
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-var': 2,
    'no-duplicate-imports': 2,
    'prefer-const': 1,
    'dot-notation': [2, { allowKeywords: true, allowPattern: '^catch$' }],
    'no-array-constructor': 2,
    'no-label-var': 2,
    'no-undef-init': 2,
    '@typescript-eslint/no-unused-vars': [1, { vars: 'all', args: 'after-used' }]
  }
};
