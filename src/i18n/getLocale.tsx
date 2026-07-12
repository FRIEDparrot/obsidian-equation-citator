import { getLanguage } from 'obsidian';
import en from "./locales/en";
import zh from "./locales/zh-CN";

export type PluginLocale = 'zh-CN' | 'en';
export type LocaleKey = keyof typeof en;

const dictionaries = {
    en,
    "zh-CN": zh,
};

export function getLocale(): PluginLocale {
    return getLanguage().startsWith('zh') ? 'zh-CN' : 'en';
}

export function t(key: LocaleKey, params?: Record<string, string | number>): string {
    const dictionary = dictionaries[getLocale()] as Partial<Record<LocaleKey, string>>;
    const template = dictionary[key] ?? en[key] ?? key;

    if (!params) {
        return template;
    }

    return template.replace(/\{(\w+)}/g, (match, paramKey: string) => {
        const value = params[paramKey];
        return value === undefined ? match : String(value);
    });
}

export default t;
