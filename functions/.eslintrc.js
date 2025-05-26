module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "linebreak-style": "off", // Turn off line ending checks
    "max-len": "off", // Desabilitar temporariamente para o deploy
    "no-trailing-spaces": "off", // Desabilitar temporariamente
    "object-curly-spacing": "off", // Desabilitar temporariamente
    "quote-props": "off", // Desabilitar temporariamente para o deploy
    "indent": "off", // Desabilitar verificação de indentação
    "@typescript-eslint/no-var-requires": "off", // Permitir require
  },
};
