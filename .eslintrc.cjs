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
    "jsdoc",
  ],
  extends: [
    "eslint:recommended",
    "plugin:prettier/recommended",
    "plugin:jsdoc/recommended",
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

    // Force space after start of comment
    "spaced-comment": ["error", "always", {
      "line": {
          "markers": ["/"],
          "exceptions": ["-", "+"]
      },
      "block": {
          "markers": ["!"],
          "exceptions": ["*"],
          "balanced": true
      }
    }],
    'jsdoc/require-jsdoc': ['error', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition:     true,
        ClassDeclaration:     true,
        ArrowFunctionExpression: false,  // skip arrow funcs
        FunctionExpression:      false   // skip inline funcs
      }
    }],
  },
};
