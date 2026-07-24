// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "@typescript-eslint/eslint-plugin";


export default defineConfig([
    js.configs.recommended,
    ...obsidianmd.configs.recommended,
    // Ignore build outputs and other files
    {
        ignores: [
            "node_modules/**", 
            "docs/**/*", "dist/**", 
            "build/**", "main.js", 
            "src/main.js", "tests/**", 
            "**/*.mjs",
            "scripts/*",
        ],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsparser,
            parserOptions: { project: "./tsconfig.json" },
            globals: {
                ...globals.browser,
                ...globals.node,
                activeWindow: "readonly",
                activeDocument: "readonly",
                createEl: "readonly",
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            // Disable overly strict rules for Obsidian plugin development
            "@typescript-eslint/no-deprecated": "off",
            "obsidianmd/ui/sentence-case": [
                "warn",
                {
                    brands: ["Obsidian", "GitHub", "YouTube", "LaTeX", "macOS", "VSCode", "Markdown"],
                    acronyms: ["OK", "PDF"],
                    enforceCamelCaseLower: true,
                },
            ],
        },
    },
    {
        files: ["src/utils/misc/desktop_fs_utils.tsx"],
        languageOptions: {
            globals: {
                require: "readonly",
            },
        },
        rules: {
            "import/no-nodejs-modules": "off",
            "@typescript-eslint/no-require-imports": "off",
        },
    },
]);
