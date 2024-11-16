import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import github from "eslint-plugin-github";
import stylisticJs from "@stylistic/eslint-plugin-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [...compat.extends("plugin:@typescript-eslint/recommended"), {
	languageOptions: {
		parser: tsParser,
		ecmaVersion: 2024,
		sourceType: "module",
	},
	plugins: { 
		"github": github,
		"@stylistic/js": stylisticJs,
	},
	rules: {
		"quotes": ["error", "double"],
		"indent": ["error", "tab"],
		"comma-dangle": ["error", "always-multiline"],
		"eol-last": ["error", "always"],
		"github/no-then": "error",
		"@stylistic/js/semi": "error",
	},
}];