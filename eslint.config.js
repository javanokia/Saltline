import js from "@eslint/js";
import globals from "globals";

/**
 * 工程化 lint 基线：
 * - 只拦截会真实引发运行时问题的规则（重复 key、不可达代码、debugger 等）
 * - 对逆向还原代码中大量动态写法（隐式全局、条件赋值、压缩变量）保持宽容
 */
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "tests/artifacts/**",
      "scripts/extracted_*.js",
      "几猫国产3A大作_V1.html",
      "coverage/**",
      "asset-preview/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // 逆向还原代码保留的动态写法
      "no-unused-vars": "off",
      "no-empty": "off",
      "no-cond-assign": "off",
      "no-constant-condition": "off",
      "no-fallthrough": "off",
      "no-prototype-builtins": "off",
      "no-useless-escape": "off",
      "no-control-regex": "off",
      "no-async-promise-executor": "off",
      "no-sparse-arrays": "off",
      "no-self-assign": "off",
      "no-redeclare": "off",
      "no-global-assign": "off",
      "no-inner-declarations": "off",
      "no-unused-private-class-members": "off",
      "require-yield": "off",
      "no-var": "off",
      "prefer-const": "off",
      eqeqeq: "off",
      // 真实风险规则保持开启
      "no-undef": "error",
      "no-debugger": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-func-assign": "error",
      "no-obj-calls": "error",
      "no-unreachable": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "valid-typeof": "error",
    },
  },
];
