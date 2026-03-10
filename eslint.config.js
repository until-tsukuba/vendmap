import globals from 'globals';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettierConfig from 'eslint-config-prettier';
import svelteConfig from './svelte.config.js';

export default [
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	...svelte.configs['flat/recommended'],
	prettierConfig,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				extraFileExtensions: ['.svelte'],
				projectService: true,
				parser: {
					ts: tseslint.parser
				},
				svelteConfig
			}
		}
	},
	{
		files: ['*.config.js'],
		...tseslint.configs.disableTypeChecked
	},
	{
		ignores: ['.svelte-kit/*', '.vercel/*', 'node_modules']
	}
];
