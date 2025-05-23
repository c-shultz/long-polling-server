module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  plugins: [
    "prettier",
    "filenames",
  ],
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended",
  ],
  rules: {
    // Format with Prettier and report differences as ESLint errors
    "prettier/prettier": "error",

    // Enforce camelCase for variables, parameters, and functions
    camelcase: [
      "error",
      { properties: "never", ignoreGlobals: true },
    ],

    // Enforce PascalCase for class/constructor names
    "new-cap": [
      "error",
      { newIsCap: true, capIsNew: false },
    ],
  },
};
