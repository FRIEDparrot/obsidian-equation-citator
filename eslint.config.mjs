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
        ignores: ["node_modules/**", "dist/**", "build/**", "main.js", "tests/**", "*.mjs"],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsparser,
            parserOptions: { project: "./tsconfig.json" },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            "@typescript-eslint": tseslint,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            // Disable overly strict rules for Obsidian plugin development
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
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
]);
