import { SETTINGS_METADATA, EquationCitatorSettings } from "./defaultSettings";

/**
 * Settings organized by category for the customize panel
 */
export interface SettingsCategory {
    id: string;
    title: string;
    settingKeys: (keyof EquationCitatorSettings)[];
}

/**
 * Get all settings organized by category
 * Excludes UI-related settings like settingsDisplayMode, basicSettingsKeys, advancedSettingsKeys
 */
export function getAllSettingsByCategory(): SettingsCategory[] {
    // Settings that should not be shown in the customize panel
    const excludedSettings: Set<keyof EquationCitatorSettings> = new Set([
        'settingsDisplayMode',
        'basicSettingsKeys',
        'advancedSettingsKeys'
    ]);

    const categories: SettingsCategory[] = [
        {
            id: "citation",
            title: "Citation",
            settingKeys: [
                "enableCitationInSourceMode",
                "citationPrefix",
                "citationFormat",
                "multiCitationDelimiter",
                "multiCitationDelimiterRender",
                "enableContinuousCitation",
                "continuousRangeSymbol",
                "continuousDelimiters",
                "enableCrossFileCitation",
                "fileCiteDelimiter",
            ]
        },
        {
            id: "auto-numbering",
            title: "Auto numbering",
            settingKeys: [
                "autoNumberDelimiter",
                "autoNumberDepth",
                "autoNumberType",
                "autoNumberNoHeadingPrefix",
                "enableAutoNumberGlobalPrefix",
                "autoNumberGlobalPrefix",
                "enableAutoNumberEquationsInQuotes",
                "enableAutoNumberTaggedEquationsOnly",
                "enableUpdateTagsInAutoNumber",
                "deleteRepeatTagsInAutoNumber",
                "deleteUnusedTagsInAutoNumber",
            ]
        },
        {
            id: "equation-panel",
            title: "Equation Panel",
            settingKeys: [
                "equationManagePanelDefaultViewType",
                "equationManagePanelLazyUpdateTime",
                "equationManagePanelfileCheckInterval",
            ]
        },
        {
            id: "style",
            title: "Style",
            settingKeys: [
                "enableRenderLocalFileName",
                "enableRenderFigureInfoInPreview",
                "enableCenterTableInCallout",
                "citationPopoverSize",
            ]
        },
        {
            id: "pdf-export",
            title: "PDF Export",
            settingKeys: [
                "citationColorInPdf",
            ]
        },
        {
            id: "cache",
            title: "Cache",
            settingKeys: [
                "cacheUpdateTime",
                "cacheCleanTime",
            ]
        },
        {
            id: "other",
            title: "Other / Beta",
            settingKeys: [
                "enableTypstMode",
                "debugMode",
                "enableCiteWithCodeBlockInCallout",
            ]
        },
    ];

    return categories.map(category => ({
        ...category,
        // Filter out any excluded settings
        settingKeys: category.settingKeys.filter(key => !excludedSettings.has(key))
    }));
}

/**
 * Get the display name for a setting key
 */
export function getSettingDisplayName(key: keyof EquationCitatorSettings): string {
    return SETTINGS_METADATA[key]?.name || key;
}

/**
 * Check if a setting key is valid and can be displayed
 */
export function isValidSettingKey(key: string): key is keyof EquationCitatorSettings {
    return key in SETTINGS_METADATA;
}
