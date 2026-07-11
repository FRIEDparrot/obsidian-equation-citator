import { SETTINGS_METADATA, EquationCitatorSettings } from "./defaultSettings";
import { t } from "@/i18n/getLocale";

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
            title: t("settings.category.citation"),
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
                "figCitationPrefix",
                "figCitationFormat",
                "enableRichAutoComplete",
                "enableRichAutoCompleteHoverPreview",
                "richAutoCompletePreviewDelayTime",
                "calloutCitationPrefixes",
            ]
        },
        {
            id: "auto-numbering",
            title: t("settings.category.autoNumbering"),
            settingKeys: [
                "autoNumberDelimiter",
                "autoNumberDepth",
                "autoNumberType",
                "autoNumberNoHeadingPrefix",
                "autoNumberGlobalPrefix",
                "enableAutoNumberEquationsInQuotes",
                "enableAutoNumberTaggedEquationsOnly",
                "figAutoNumberDelimiter",
                "figAutoNumberDepth",
                "figAutoNumberNoHeadingPrefix",
                "figAutoNumberGlobalPrefix",
                "enableAutoNumberFigsInQuotes",
                "enableAutoNumberTaggedFigsOnly",
                "enableUpdateTagsInAutoNumber",
                "deleteRepeatTagsInAutoNumber",
                "deleteUnusedTagsInAutoNumber",
            ]
        },
        {
            id: "equation-panel",
            title: t("settings.category.equationPanel"),
            settingKeys: [
                "equationManagePanelDefaultViewType",
                "equationManagePanelPreviewObjectType",
                "equationManagePanelFilterTagOnlyEquation",
                "equationManagePanelEnableRenderHeadingsOnly",
                "equationManagePanelLazyUpdateTime",
                "equationManagePanelFileCheckInterval",
                "equationManagePanelFilterBoxedEquation",
                "skipFirstlineInBoxedFilter",
                "equationWidgetRightClickCopyType",
                "useFastMathRenderer",
            ]
        },
        {
            id: "style",
            title: t("settings.category.style"),
            settingKeys: [
                "enableRenderLocalFileName",
                "enableRenderFigureInfoInPreview",
                "enableCenterTableInCallout",
                "renderImageCaptionsAndDescriptions",
                "citationPopoverSize",
            ]
        },
        {
            id: "pdf-export",
            title: t("settings.category.pdfExport"),
            settingKeys: [
                "websiteNotesExportFolder",
                "websiteNotesExportIgnoredFilePatterns",
                "websiteNotesExcludedFolders",
                "citationColorInPdf",
                "addImageCaptionsInPdf",
                "addImageDescInPdf",
                "keepImageSpacingForPdf",
                "injectCitationMetadataInExportedMarkdown",
            ]
        },
        {
            id: "cache",
            title: t("settings.category.cache"),
            settingKeys: [
                "cacheUpdateTime",
                "cacheCleanTime",
            ]
        },
        {
            id: "other",
            title: t("settings.category.other"),
            settingKeys: [
                "enableTypstMode",
                "typstBoxSymbol",
                "debugMode",
                "enableCiteWithCodeBlockInCallout",
                "extensionsUseMarkdownRenderer",
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
