module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'aequitas-thai-nav/**', 'ai-trading-dashboard/**'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['react-refresh'],
  settings: { react: { version: '18.2' } },
  overrides: [
    {
      files: ['playwright.config.js', 'vite.config.mjs'],
      env: { node: true, browser: false, es2020: true },
    },
    {
      files: ['tests/**/*.js'],
      env: { node: true, browser: true, es2020: true },
    },
    {
      files: ['scripts/**/*.js', 'server/**/*.js'],
      env: { node: true, browser: false, es2020: true },
    },
  ],
  rules: {
    'react/prop-types': 'off',
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
