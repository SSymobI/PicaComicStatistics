import antfu from '@antfu/eslint-config';

export default antfu({
  ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'older/**', 'dist/**', 'docs/**'],
  stylistic: {
    semi: true,
    quotes: 'single',
  },
  rules: {
    'style/max-statements-per-line': 'off',
    'style/no-mixed-operators': 'off',
    'regexp/no-obscure-range': 'off',
    'no-irregular-whitespace': 'off',
    'vue/no-irregular-whitespace': 'off',
    'node/prefer-global/process': 'off',
    'unused-imports/no-unused-vars': 'off',
    'vue/singleline-html-element-content-newline': 'off',
    'no-unused-vars': 'off',
  },
});
