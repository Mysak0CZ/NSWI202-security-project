// @ts-check
import eslintJsPlugin from "@eslint/js";
import eslintStylisticPlugin from "@stylistic/eslint-plugin";
import tsEslint from "typescript-eslint";

/** @type {import("typescript-eslint").ConfigWithExtends["rules"]} */
const baseRules = {
	// Disabled recommended rules
	"@typescript-eslint/no-inferrable-types": "off",
	"@typescript-eslint/consistent-type-definitions": "off",
	"prefer-const": "off",
	"no-inner-declarations": "off",
	// Problems
	"@typescript-eslint/no-empty-function": "warn",
	"@typescript-eslint/no-shadow": ["warn", { hoist: "all" }],
	"@typescript-eslint/no-unused-expressions": "warn",
	"@typescript-eslint/no-unused-vars": "warn",
	"@typescript-eslint/parameter-properties": "error",
	"@typescript-eslint/prefer-for-of": "warn",
	"eqeqeq": ["error", "always", { null: "ignore" }],
	"no-eval": "error",
	"no-empty": "warn",
	"no-undef-init": "warn",
	"object-shorthand": "warn",
	"operator-assignment": "warn",
	"unicode-bom": "error",
	// Stylistic rules
	"@stylistic/brace-style": ["warn", "1tbs"],
	"@stylistic/comma-dangle": ["warn", {
		arrays: "always-multiline",
		objects: "always-multiline",
		imports: "always-multiline",
		exports: "always-multiline",
		functions: "ignore",
		enums: "ignore",
		generics: "ignore",
		tuples: "ignore",
	}],
	"@stylistic/function-call-spacing": "warn",
	"@stylistic/indent": ["warn", "tab", { flatTernaryExpressions: true, SwitchCase: 1 }],
	"@stylistic/jsx-curly-spacing": ["warn", { when: "always", children: true }],
	"@stylistic/jsx-equals-spacing": "warn",
	"@stylistic/jsx-quotes": ["warn", "prefer-double"],
	"@stylistic/linebreak-style": ["warn", "unix"],
	"@stylistic/member-delimiter-style": ["warn", {
		multiline: {
			delimiter: "semi",
			requireLast: true,
		},
		singleline: {
			delimiter: "semi",
			requireLast: true,
		},
		multilineDetection: "brackets",
	}],
	"@stylistic/new-parens": "warn",
	"@stylistic/no-extra-semi": "warn",
	"@stylistic/no-mixed-spaces-and-tabs": "warn",
	"@stylistic/no-multi-spaces": "warn",
	"@stylistic/no-tabs": ["warn", { allowIndentationTabs: true }],
	"@stylistic/no-trailing-spaces": "warn",
	"@stylistic/nonblock-statement-body-position": ["warn", "below"],
	"@stylistic/object-curly-spacing": ["warn", "always"],
	"@stylistic/quote-props": ["warn", "consistent-as-needed"],
	"@stylistic/quotes": ["warn", "double"],
	"@stylistic/semi": ["warn", "always"],
	"@stylistic/space-infix-ops": "warn",
	"@stylistic/space-unary-ops": "warn",
	"@stylistic/template-curly-spacing": ["warn", "always"],
	"@stylistic/type-annotation-spacing": "warn",
};

/** @type {import("typescript-eslint").ConfigWithExtends["rules"]} */
const typedRules = {
	// Disabled recommended rules
	"@typescript-eslint/no-inferrable-types": "off",
	"@typescript-eslint/prefer-nullish-coalescing": "off",
	// Problems
	"@typescript-eslint/no-deprecated": "error",
	"@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",
	"@typescript-eslint/only-throw-error": "warn",
	// Stylistic rules
	"@typescript-eslint/naming-convention": [
		"warn",
		{
			selector: "default",
			format: ["camelCase"],
			leadingUnderscore: "allow",
			trailingUnderscore: "allow",
		},
		{
			selector: ["variableLike"],
			format: null,
			leadingUnderscore: "allow",
			custom: {
				regex: "^[a-z]",
				match: true,
			},
		},
		{
			selector: "variable",
			modifiers: ["global"],
			format: ["PascalCase"],
		},
		{
			selector: "variable",
			modifiers: ["const", "global"],
			format: ["PascalCase", "UPPER_CASE"],
		},
		{
			selector: "variable",
			format: ["UPPER_CASE"],
			leadingUnderscore: "allow",
			modifiers: ["const", "global"],
			types: ["boolean", "string", "number"],
		},
		{
			selector: "function",
			modifiers: ["global"],
			format: ["PascalCase"],
		},
		{
			selector: "function",
			modifiers: ["global"],
			format: ["PascalCase"],
			prefix: ["use"],
			filter: "^use",
		},
		{
			selector: "typeLike",
			format: ["PascalCase"],
		},
		{
			selector: "enumMember",
			format: ["UPPER_CASE"],
		},
		{
			selector: ["variable", "parameter"],
			format: null,
			modifiers: ["destructured"],
		},
		{
			selector: ["import", "objectLiteralProperty"],
			format: null,
		},
	],
};

/** @type {import("typescript-eslint").ConfigWithExtends["plugins"]} */
const plugins = {
	"@stylistic": eslintStylisticPlugin,
};

export default [
	...tsEslint.config({
		files: ["**/*.js", "**/*.jsx"],
		ignores: ["**/node_modules/**", "*/out/**"],
		extends: [
			eslintJsPlugin.configs.recommended,
			...tsEslint.configs.recommended,
			...tsEslint.configs.stylistic,
		],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
		},
		linterOptions: {
			reportUnusedDisableDirectives: "warn",
		},
		plugins,
		rules: {
			...baseRules,
		},
	}),
	...tsEslint.config({
		files: ["**/*.ts", "**/*.tsx"],
		ignores: [
			"**/node_modules/**",
			"*/out/**",
			"Client/webpack.config.ts",
		],
		extends: [
			eslintJsPlugin.configs.recommended,
			...tsEslint.configs.recommendedTypeChecked,
			...tsEslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			parser: tsEslint.parser,
			parserOptions: {
				sourceType: "module",
				projectService: true,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: "warn",
		},
		plugins,
		rules: {
			...baseRules,
			...typedRules,
		},
	}),
	...tsEslint.config({
		files: ["Client/webpack.config.ts"],
		extends: [
			eslintJsPlugin.configs.recommended,
			...tsEslint.configs.recommendedTypeChecked,
			...tsEslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			parser: tsEslint.parser,
			parserOptions: {
				sourceType: "module",
				project: "./Client/tsconfig.webpack.json",
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: "warn",
		},
		plugins,
		rules: {
			...baseRules,
			...typedRules,
		},
	}),
];
