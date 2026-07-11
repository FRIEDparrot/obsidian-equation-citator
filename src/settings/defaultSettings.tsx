import { AutoNumberingType } from "@/utils/core/auto_number_core";
import { CitationSettingsTab } from "./pages/citationSettingsTab";
import EquationCitator from "@/main";
import { AutoNumberSettingsTab } from "./pages/autoNumberSettingsTab";
import { StyleSettingsTab } from "./pages/styleSettingsTab";
import { CacheSettingsTab } from "./pages/cacheSettingsTab";
import { PdfExportSettingsTab } from "./pages/pdfExportSettingsTab";
import { OtherSettingsTab } from "./pages/otherSettingsTab";
import { EquationPanelSettingsTab } from "./pages/equationPanelSettingsTab";
import { t } from "@/i18n/getLocale";

export interface CalloutCitationPrefix {
    prefix: string;   // e.g., "table:", "thm:", "def:"
    format: string;   // e.g., "Table. #", "Theorem #", "Definition #"
}

export interface WebsiteNotesExcludedFolder {
    path: string; // Vault-relative folder path excluded from repository/folder sync entry points
    completelyIgnore: boolean; // Whether linked files under this folder should also be skipped
}

export interface SettingsMetadata {
    name: string;
    desc: string; // description
    type: "string" | "number" | "boolean" | "select" | "color" | "array";
    renderCallback: (el: HTMLElement, plugin: EquationCitator, renderSubpanel?: boolean) => void; // optional callback to render the value in the UI
    favoriate?: boolean; // whether to show this setting in the basic section
    hasSubPanel?: boolean; // whether this setting can have a subpanel to render
}

/**
 * To add a new setting:
 * 1. add into EquationCitatorSettings 
 * 2. add default value in DEFAULT_SETTINGS
 * 3. add callback function in SettingsMetadata, and implement the callback function
 * 4. add settings into `settingsHelper` script (to give it a clear category)
 */
export interface EquationCitatorSettings {
    //#region citation settings 
    enableCitationInSourceMode: boolean; // Enable citation in source mode 

    citationPrefix: string; // Citation prefix for equations
    citationFormat: string; // Citation display format for equations

    figCitationPrefix: string; // Figure Citation Prefix
    figCitationFormat: string; // citation display format for figures
    enableRichAutoComplete: boolean; // Enable rich auto-complete suggestion for figures and callouts
    enableRichAutoCompleteHoverPreview: boolean; // Enable concise auto-complete preview for figures and callouts
    richAutoCompletePreviewDelayTime: number; // Delay time for concise auto-complete rendering (ms)
    renderImageCaptionsAndDescriptions: boolean; // Render image captions and descriptions in preview and reading mode

    calloutCitationPrefixes: CalloutCitationPrefix[];  // Citation prefixes and formats for callouts  

    multiCitationDelimiter: string; // Delimiter for multiple citations in a single cite 
    multiCitationDelimiterRender: string; // Rendered delimiter for multiple citations in a single cite

    enableContinuousCitation: boolean; // Render continuous citations in compat format  
    continuousRangeSymbol: string; // Range symbol for continuous citations in a single cite 
    continuousDelimiters: string; // Delimiter for continuous citations in a single cite 


    enableCrossFileCitation: boolean; // Optional setting for cross-file citations
    fileCiteDelimiter: string;
    //#endregion

    //#region style settings  
    citationPopoverSize: string; // Widget size: 'xs', 'sm', 'md', 'lg', 'xl'
    enableRenderLocalFileName: boolean; // Render local file name for citations 
    enableCenterTableInCallout: boolean; // Center table in callout  
    enableRenderFigureInfoInPreview: boolean; // Render figure title and description in figure preview widget 
    //#endregion

    // auto numbering settings  
    autoNumberDelimiter: string; // Auto numbering delimiter   
    autoNumberType: AutoNumberingType; // Use relative heading level for auto numbering 
    autoNumberDepth: number; // Maximum depth for auto numbering level 
    autoNumberNoHeadingPrefix: string; //  equation numbering prefix for no heading level equations 
    autoNumberGlobalPrefix: string; // Global Auto numbering prefix for equations without any heading level  
    enableAutoNumberEquationsInQuotes: boolean; // Enable auto numbering for equations in callouts 
    enableAutoNumberTaggedEquationsOnly: boolean; // Enable auto numbering only for tagged equations
    
    figAutoNumberDelimiter: string; // Auto numbering delimiter for figures
    figAutoNumberDepth: number; // Maximum depth for auto numbering figures (sepreate from the equations)
    figAutoNumberNoHeadingPrefix: string; // figure numbering prefix for no heading level figures
    figAutoNumberGlobalPrefix: string; // Global Auto numbering prefix for figures without any heading level
    enableAutoNumberFigsInQuotes: boolean; // Enable auto numbering for figures in callouts,
    enableAutoNumberTaggedFigsOnly: boolean; // Enable auto numbering only for tagged figures

    enableUpdateTagsInAutoNumber: boolean; // Update citation in auto numbering 
    deleteRepeatTagsInAutoNumber: boolean; // Delete repeat tags in auto numbering  
    deleteUnusedTagsInAutoNumber: boolean; // Delete unused tags in auto numbering  

    // cache settings 
    cacheUpdateTime: number; // Debounce time for preview rendering  
    cacheCleanTime: number; // Time to automatically clear cache 

    // pdf rendering settings
    websiteNotesExportFolder: string; // Absolute folder path for website note export
    websiteNotesExportIgnoredFilePatterns: string[]; // Markdown filename patterns copied directly during website note export
    websiteNotesExcludedFolders: WebsiteNotesExcludedFolder[]; // folder rules excluded from website note export entry points
    citationColorInPdf: string; // default citation color in PDF rendering
    addImageCaptionsInPdf: boolean; // whether to add image captions in PDF export
    addImageDescInPdf: boolean; // whether to add image description in PDF export
    keepImageSpacingForPdf: boolean; // whether to preserve blank spacing around images in PDF export
    injectCitationMetadataInExportedMarkdown: boolean; // whether to inject citation metadata in exported markdown
    
    // other settings  
    enableTypstMode: boolean; // Enable compatibility with Typst syntax
    debugMode: boolean; // Optional setting for debug mode
    enableCiteWithCodeBlockInCallout: boolean; // Enable citation by inline code block in callout 
    extensionsUseMarkdownRenderer: string[];  // image extensions that force using Markdown renderer 

    // equation management panel Settings 
    equationManagePanelLazyUpdateTime: number,
    equationManagePanelFileCheckInterval: number,
    equationManagePanelDefaultViewType: "outline" | "list",
    equationManagePanelPreviewObjectType: "equation" | "figure" | "callout", // Preview object type in equation panel
    equationManagePanelFilterTagOnlyEquation: boolean;
    equationManagePanelFilterBoxedEquation: boolean;
    skipFirstlineInBoxedFilter: boolean;
    typstBoxSymbol: string; // Override symbol for boxed equation in typst mode, default to box
    equationManagePanelEnableRenderHeadingsOnly: boolean;
    equationWidgetRightClickCopyType: "full" | "noTag" | "eq", // right click to copy full content or only equation code in equation panel.
    useFastMathRenderer: boolean; // whether to use fast but less reliable math rendering method in equation panel, default to false

    // settings UI
    settingsDisplayMode: "categorical" | "concise" | "list"; // settings tab display mode
    basicSettingsKeys: string[]; // keys shown in Basic section for concise mode
    advancedSettingsKeys: string[]; // keys shown in Advanced section for concise mode
}

export const DEFAULT_SETTINGS: EquationCitatorSettings = {
    enableCitationInSourceMode: false, // Not enabled by default  
    citationPopoverSize: "md", // Default to medium size
    citationPrefix: "eq:", // Default prefix for citations
    citationFormat: "(#)", // Default display format for citations
    figCitationPrefix: "fig:", // prefix for cite figures
    figCitationFormat: "Fig. #", // citation format for figures
    enableRichAutoComplete: false, // enable rich auto-complete suggestion by default
    calloutCitationPrefixes: [
        { prefix: "table:", format: "Table. #" },
    ],
    enableRichAutoCompleteHoverPreview: true, // enable concise auto-complete preview by default
    richAutoCompletePreviewDelayTime: 1500, // 1500ms delay for concise auto-complete rendering
    renderImageCaptionsAndDescriptions: true, // render image captions and descriptions by default

    enableRenderFigureInfoInPreview: true, // enable rendering figure title and description in figure preview widget
    enableCenterTableInCallout: true,  // enable centering tables in callout for butiful rendering 
    multiCitationDelimiter: ",", // Default delimiter for multiple citations in a single cite
    multiCitationDelimiterRender: ", ", // Default rendered delimiter for multiple citations in a single cite 
    enableContinuousCitation: true, // Default to true for convenience 
    continuousDelimiters: String.raw`. - : \_`, // Default delimiter for continuous citations in a single cite
    continuousRangeSymbol: "~", // Default range symbol for continuous citations in a single cite 
    enableRenderLocalFileName: true, // Default to true 

    enableCrossFileCitation: true, // Default to true
    fileCiteDelimiter: "^", // Default delimiter for file citations 

    cacheUpdateTime: 5000, // Max time for cache to refresh (5s)
    cacheCleanTime: 300000, // Max time for cache to clear (5 minutes) 

    citationColorInPdf: "#4199df", // black color for default citation color in PDF rendering 
    websiteNotesExportFolder: "", // external folder for website note export
    websiteNotesExportIgnoredFilePatterns: ["*.excalidraw.md"], // direct-copy Excalidraw markdown files by default
    websiteNotesExcludedFolders: [], // folders excluded from website note export entry points
    addImageCaptionsInPdf: true, // add image captions in PDF export by default
    addImageDescInPdf: true, // add image description in PDF export by default
    keepImageSpacingForPdf: true, // keep images separated from neighboring paragraphs in PDF export
    injectCitationMetadataInExportedMarkdown: false, // do not inject export metadata by default

    enableCiteWithCodeBlockInCallout: false, // cite with inline code block in quote

    autoNumberDelimiter: ".", // Default delimiter for auto numbering  
    autoNumberDepth: 3, // Default to 3 (i.e., 1.1.1 for 3 levels)  
    autoNumberType: AutoNumberingType.Relative, // Default is using relative heading level 
    autoNumberNoHeadingPrefix: "P",
    autoNumberGlobalPrefix: "", // Default to empty string for no prefix 
    enableAutoNumberEquationsInQuotes: false, // Default to false, not to number equations in callouts
    enableAutoNumberTaggedEquationsOnly: false, // Default to false, number all equations
    enableUpdateTagsInAutoNumber: true, // Default to true, update citation in auto numbering  
    deleteRepeatTagsInAutoNumber: true, // Default to true, delete repeat tags in auto numbering 
    deleteUnusedTagsInAutoNumber: false, // Default to true, delete unused tags in auto numbering 
    
    figAutoNumberDelimiter: ".", // Default delimiter for figure auto numbering  
    figAutoNumberDepth: 2, // Default to 2 for figure auto numbering (i.e., fig:1.1)
    figAutoNumberNoHeadingPrefix: "F", // Default figure numbering prefix for no heading level figures
    figAutoNumberGlobalPrefix: "", // Default to empty string for no prefix for figure auto numbering
    enableAutoNumberFigsInQuotes: false, // Default to false, not to number figures in callouts
    enableAutoNumberTaggedFigsOnly: false, // Default to false, number all figures
    
    enableTypstMode: false,
    typstBoxSymbol: "boxed", // Default symbol for boxed equation in typst mode
    debugMode: false, // debug mode is off by default (for set default, see debugger.tsx)
    extensionsUseMarkdownRenderer: ["excalidraw", "excalidraw.md", "md"], // default to use markdown renderer for svg and excalidraw files
    // settings UI defaults
    settingsDisplayMode: "concise",
    basicSettingsKeys: [
        "autoNumberType",
        "autoNumberDepth",
        "autoNumberGlobalPrefix",
        "autoNumberNoHeadingPrefix",
        "figAutoNumberDepth",
        "enableAutoNumberTaggedEquationsOnly",
        "equationManagePanelFilterTagOnlyEquation",
        "citationPopoverSize",
        "enableCenterTableInCallout",
    ],
    advancedSettingsKeys: [
        "enableCitationInSourceMode",
        "enableRichAutoComplete",
        "citationPrefix",
        "citationFormat",
        "figCitationPrefix",
        "figCitationFormat",
        "enableCrossFileCitation",
        "enableRenderLocalFileName",
        "renderImageCaptionsAndDescriptions",
        "multiCitationDelimiter",
        "multiCitationDelimiterRender",
        "enableContinuousCitation",
        "websiteNotesExportFolder",
        "websiteNotesExportIgnoredFilePatterns",
        "websiteNotesExcludedFolders",
        "calloutCitationPrefixes",
        "autoNumberDelimiter",
        "enableAutoNumberEquationsInQuotes",
        "enableUpdateTagsInAutoNumber",
        "enableTypstMode",
        "useFastMathRenderer",
        "cacheUpdateTime",
        "cacheCleanTime",
        "debugMode",
    ],
    equationManagePanelLazyUpdateTime: 5000,
    equationManagePanelFileCheckInterval: 1000,
    equationManagePanelDefaultViewType: "list",
    equationManagePanelPreviewObjectType: "equation",
    equationManagePanelFilterTagOnlyEquation: false,
    equationManagePanelEnableRenderHeadingsOnly: false,
    equationManagePanelFilterBoxedEquation: false,
    skipFirstlineInBoxedFilter: false, 
    equationWidgetRightClickCopyType: "full",
    useFastMathRenderer: false, // default to false, use reliable math rendering method in equation panel
};

export const SETTINGS_METADATA: Record<keyof EquationCitatorSettings, SettingsMetadata> = {
    settingsDisplayMode: {
        name: t("settings.settingsDisplayMode.name"),
        desc: t("settings.settingsDisplayMode.desc"),
        type: "select",
        renderCallback: (el, plugin) => { }  // toolbar settings no need that 
    },

    basicSettingsKeys: {
        name: t("settings.basicSettingsKeys.name"),
        desc: t("settings.basicSettingsKeys.desc"),
        type: "array",
        renderCallback: (el, plugin) => { }  // to be implemented
    },

    advancedSettingsKeys: {
        name: t("settings.advancedSettingsKeys.name"),
        desc: t("settings.advancedSettingsKeys.desc"),
        type: "array",
        renderCallback: (el, plugin) => { }  // to be implemented
    },

    enableCitationInSourceMode: {
        name: t("settings.enableCitationInSourceMode.name"),
        desc: t("settings.enableCitationInSourceMode.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.enableCitationInSourceMode(el, plugin);
        }
    },
    citationPrefix: {
        name: t("settings.citationPrefix.name"),
        desc: t("settings.citationPrefix.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.citationPrefix(el, plugin);
        }
    },
    citationFormat: {
        name: t("settings.citationFormat.name"),
        desc: t("settings.citationFormat.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.citationFormat(el, plugin);
        }
    },
    figCitationPrefix: {
        name: t("settings.figCitationPrefix.name"),
        desc: t("settings.figCitationPrefix.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.figCitationPrefix(el, plugin);
        }
    },
    figCitationFormat: {
        name: t("settings.figCitationFormat.name"),
        desc: t("settings.figCitationFormat.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.figCitationFormat(el, plugin);
        }
    },
    enableRichAutoComplete: {
        name: t("settings.enableRichAutoComplete.name"),
        desc: t("settings.enableRichAutoComplete.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.enableRichAutoComplete(el, plugin);
        }
    },
    enableRichAutoCompleteHoverPreview: {
        name: t("settings.enableRichAutoCompleteHoverPreview.name"),
        desc: t("settings.enableRichAutoCompleteHoverPreview.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.enableRichAutoCompleteHoverPreview(el, plugin);
        }
    },
    richAutoCompletePreviewDelayTime: {
        name: t("settings.richAutoCompletePreviewDelayTime.name"),
        desc: t("settings.richAutoCompletePreviewDelayTime.desc"),
        type: "number",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.richAutoCompletePreviewDelayTime(el, plugin);
        }
    },
    renderImageCaptionsAndDescriptions: {
        name: t("settings.renderImageCaptionsAndDescriptions.name"),
        desc: t("settings.renderImageCaptionsAndDescriptions.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.renderImageCaptionsAndDescriptions(el, plugin);
        }
    },
    calloutCitationPrefixes: {
        name: t("settings.calloutCitationPrefixes.name"),
        desc: t("settings.calloutCitationPrefixes.desc"),
        type: "array",
        renderCallback: (el: HTMLElement, plugin: EquationCitator) => {
            CitationSettingsTab.calloutCitationPrefixes(el, plugin);
        }
    },
    multiCitationDelimiter: {
        name: t("settings.multiCitationDelimiter.name"),
        desc: t("settings.multiCitationDelimiter.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.multiCitationDelimiter(el, plugin);
        }
    },
    multiCitationDelimiterRender: {
        name: t("settings.multiCitationDelimiterRender.name"),
        desc: t("settings.multiCitationDelimiterRender.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.multiCitationDelimiterRender(el, plugin);
        }
    },
    enableContinuousCitation: {
        name: t("settings.enableContinuousCitation.name"),
        desc: t("settings.enableContinuousCitation.desc"),
        type: "boolean",
        hasSubPanel: true, // it is a subpanel setting 
        renderCallback: (el, plugin, renderSubpanel) => {
            CitationSettingsTab.enableContinuousCitation(el, plugin, renderSubpanel);
        }
    },
    continuousRangeSymbol: {
        name: t("settings.continuousRangeSymbol.name"),
        desc: t("settings.continuousRangeSymbol.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.continuousRangeSymbol(el, plugin);
        }
    },
    continuousDelimiters: {
        name: t("settings.continuousDelimiters.name"),
        desc: t("settings.continuousDelimiters.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.continuousDelimiters(el, plugin);
        }
    },
    enableCrossFileCitation: {
        name: t("settings.enableCrossFileCitation.name"),
        desc: t("settings.enableCrossFileCitation.desc"),
        type: "boolean",
        hasSubPanel: true, // it is a subpanel setting 
        renderCallback: (el, plugin, renderSubpanel) => {
            CitationSettingsTab.enableCrossFileCitation(el, plugin, renderSubpanel);
        }
    },
    fileCiteDelimiter: {
        name: t("settings.fileCiteDelimiter.name"),
        desc: t("settings.fileCiteDelimiter.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.fileCiteDelimiter(el, plugin);
        }
    },
    autoNumberDelimiter: {
        name: t("settings.autoNumberDelimiter.name"),
        desc: t("settings.autoNumberDelimiter.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberDelimiter(el, plugin);
        }
    },
    autoNumberType: {
        name: t("settings.autoNumberType.name"),
        desc: t("settings.autoNumberType.desc"),
        type: "select",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberType(el, plugin);
        }
    },
    autoNumberDepth: {
        name: t("settings.autoNumberDepth.name"),
        desc: t("settings.autoNumberDepth.desc"),
        type: "number",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberDepth(el, plugin);
        }
    },
    autoNumberNoHeadingPrefix: {
        name: t("settings.autoNumberNoHeadingPrefix.name"),
        desc: t("settings.autoNumberNoHeadingPrefix.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberNoHeadingPrefix(el, plugin);
        }
    },
    autoNumberGlobalPrefix: {
        name: t("settings.autoNumberGlobalPrefix.name"),
        desc: t("settings.autoNumberGlobalPrefix.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberGlobalPrefix(el, plugin);
        }
    },
    enableAutoNumberEquationsInQuotes: {
        name: t("settings.enableAutoNumberEquationsInQuotes.name"),
        desc: t("settings.enableAutoNumberEquationsInQuotes.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberEquationsInQuotes(el, plugin);
        }
    },
    enableAutoNumberTaggedEquationsOnly: {
        name: t("settings.enableAutoNumberTaggedEquationsOnly.name"),
        desc: t("settings.enableAutoNumberTaggedEquationsOnly.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberTaggedEquationsOnly(el, plugin);
        }
    },
    figAutoNumberDelimiter: {
        name: t("settings.figAutoNumberDelimiter.name"),
        desc: t("settings.figAutoNumberDelimiter.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.figAutoNumberDelimiter(el, plugin);
        }
    },
    figAutoNumberDepth: {
        name: t("settings.figAutoNumberDepth.name"),
        desc: t("settings.figAutoNumberDepth.desc"),
        type: "number",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.figAutoNumberDepth(el, plugin);
        }
    },
    figAutoNumberNoHeadingPrefix: {
        name: t("settings.figAutoNumberNoHeadingPrefix.name"),
        desc: t("settings.figAutoNumberNoHeadingPrefix.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.figAutoNumberNoHeadingPrefix(el, plugin);
        }
    },
    figAutoNumberGlobalPrefix: {
        name: t("settings.figAutoNumberGlobalPrefix.name"),
        desc: t("settings.figAutoNumberGlobalPrefix.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.figAutoNumberGlobalPrefix(el, plugin);
        }
    },
    enableAutoNumberFigsInQuotes: {
        name: t("settings.enableAutoNumberFigsInQuotes.name"),
        desc: t("settings.enableAutoNumberFigsInQuotes.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberFigsInQuotes(el, plugin);
        }
    },
    enableAutoNumberTaggedFigsOnly: {
        name: t("settings.enableAutoNumberTaggedFigsOnly.name"),
        desc: t("settings.enableAutoNumberTaggedFigsOnly.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberTaggedFigsOnly(el, plugin);
        }
    },
    // These 3 options are shared by figures and equations
    enableUpdateTagsInAutoNumber: {
        name: t("settings.enableUpdateTagsInAutoNumber.name"),
        desc: t("settings.enableUpdateTagsInAutoNumber.desc"),
        type: "boolean",
        hasSubPanel: true,
        renderCallback: (el, plugin, renderSubpanel) => {
            AutoNumberSettingsTab.enableUpdateTagsInAutoNumber(el, plugin, renderSubpanel);
        }
    },
    deleteRepeatTagsInAutoNumber: {
        name: t("settings.deleteRepeatTagsInAutoNumber.name"),
        desc: t("settings.deleteRepeatTagsInAutoNumber.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.deleteRepeatTagsInAutoNumber(el, plugin);
        }
    },
    deleteUnusedTagsInAutoNumber: {
        name: t("settings.deleteUnusedTagsInAutoNumber.name"),
        desc: t("settings.deleteUnusedTagsInAutoNumber.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.deleteUnusedTagsInAutoNumber(el, plugin);
        }
    },
    cacheUpdateTime: {
        name: t("settings.cacheUpdateTime.name"),
        desc: t("settings.cacheUpdateTime.desc"),
        type: "number",
        renderCallback: (el, plugin) => {
            CacheSettingsTab.cacheUpdateTime(el, plugin);
        }
    },
    cacheCleanTime: {
        name: t("settings.cacheCleanTime.name"),
        desc: t("settings.cacheCleanTime.desc"),
        type: "select",
        renderCallback: (el, plugin) => {
            CacheSettingsTab.cacheCleanTime(el, plugin);
        }
    },
    citationPopoverSize: {
        name: t("settings.citationPopoverSize.name"),
        desc: t("settings.citationPopoverSize.desc"),
        type: "select",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.citationPopoverSize(el, plugin);
        }
    },

    enableCenterTableInCallout: {
        name: t("settings.enableCenterTableInCallout.name"),
        desc: t("settings.enableCenterTableInCallout.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.enableCenterTableInCallout(el, plugin);
        }
    },

    enableRenderFigureInfoInPreview: {
        name: t("settings.enableRenderFigureInfoInPreview.name"),
        desc: t("settings.enableRenderFigureInfoInPreview.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.enableRenderFigureInfoInPreview(el, plugin);
        }
    },

    enableRenderLocalFileName: {
        name: t("settings.enableRenderLocalFileName.name"),
        desc: t("settings.enableRenderLocalFileName.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.enableRenderLocalFileName(el, plugin);
        }
    },

    websiteNotesExportFolder: {
        name: t("settings.websiteNotesExportFolder.name"),
        desc: t("settings.websiteNotesExportFolder.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.websiteNotesExportFolder(el, plugin);
        }
    },

    websiteNotesExportIgnoredFilePatterns: {
        name: t("settings.websiteNotesExportIgnoredFilePatterns.name"),
        desc: t("settings.websiteNotesExportIgnoredFilePatterns.desc"),
        type: "array",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.websiteNotesExportIgnoredFilePatterns(el, plugin);
        }
    },

    websiteNotesExcludedFolders: {
        name: t("settings.websiteNotesExcludedFolders.name"),
        desc: t("settings.websiteNotesExcludedFolders.desc"),
        type: "array",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.websiteNotesExcludedFolders(el, plugin);
        }
    },

    citationColorInPdf: {
        name: t("settings.citationColorInPdf.name"),
        desc: t("settings.citationColorInPdf.desc"),
        type: "color",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.citationColorInPdf(el, plugin);
        }
    },

    addImageCaptionsInPdf : {
        name: t("settings.addImageCaptionsInPdf.name"),
        desc: t("settings.addImageCaptionsInPdf.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.addImageCaptionsInPdf(el, plugin);
        } 
    },

    addImageDescInPdf : {
        name: t("settings.addImageDescInPdf.name"),
        desc: t("settings.addImageDescInPdf.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.addImageDescInPdf(el, plugin);
        }
    },

    keepImageSpacingForPdf: {
        name: t("settings.keepImageSpacingForPdf.name"),
        desc: t("settings.keepImageSpacingForPdf.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.keepImageSpacingForPdf(el, plugin);
        }
    },

    injectCitationMetadataInExportedMarkdown: {
        name: t("settings.injectCitationMetadataInExportedMarkdown.name"),
        desc: t("settings.injectCitationMetadataInExportedMarkdown.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.injectCitationMetadataInExportedMarkdown(el, plugin);
        }
    },

    enableTypstMode: {
        name: t("settings.enableTypstMode.name"),
        desc: t("settings.enableTypstMode.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.enableTypstMode(el, plugin);
        }
    },
    typstBoxSymbol: {
        name: t("settings.typstBoxSymbol.name"),
        desc: t("settings.typstBoxSymbol.desc"),
        type: "string",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.typstBoxSymbol(el, plugin);
        }
    },
    debugMode: {
        name: t("settings.debugMode.name"),
        desc: t("settings.debugMode.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.debugMode(el, plugin);
        }
    },
    extensionsUseMarkdownRenderer: {
        name: t("settings.extensionsUseMarkdownRenderer.name"),
        desc: t("settings.extensionsUseMarkdownRenderer.desc"),
        type: "array",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.extensionsUseMarkdownRenderer(el, plugin);
        }
    },
    enableCiteWithCodeBlockInCallout: {
        name: t("settings.enableCiteWithCodeBlockInCallout.name"),
        desc: t("settings.enableCiteWithCodeBlockInCallout.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.enableCiteWithCodeBlockInCallout(el, plugin);
        }
    },
    equationManagePanelFileCheckInterval: {
        name: t("settings.equationManagePanelFileCheckInterval.name"),
        desc: t("settings.equationManagePanelFileCheckInterval.desc"),
        type: "number",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelFileCheckInterval(el, plugin);
        }
    },
    equationManagePanelLazyUpdateTime: {
        name: t("settings.equationManagePanelLazyUpdateTime.name"),
        desc: t("settings.equationManagePanelLazyUpdateTime.desc"),
        type: "number",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelLazyUpdateTime(el, plugin);
        }
    },
    equationManagePanelDefaultViewType: {
        name: t("settings.equationManagePanelDefaultViewType.name"),
        desc: t("settings.equationManagePanelDefaultViewType.desc"),
        type: "select",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelDefaultViewType(el, plugin);
        }
    },
    equationManagePanelPreviewObjectType: {
        name: t("settings.equationManagePanelPreviewObjectType.name"),
        desc: t("settings.equationManagePanelPreviewObjectType.desc"),
        type: "select",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelPreviewObjectType(el, plugin);
        }
    },
    equationManagePanelFilterTagOnlyEquation: {
        name: t("settings.equationManagePanelFilterTagOnlyEquation.name"),
        desc: t("settings.equationManagePanelFilterTagOnlyEquation.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelFilterTagOnlyEquation(el, plugin);
        }
    },
    equationManagePanelEnableRenderHeadingsOnly: {
        name: t("settings.equationManagePanelEnableRenderHeadingsOnly.name"),
        desc: t("settings.equationManagePanelEnableRenderHeadingsOnly.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelEnableRenderHeadingsOnly(el, plugin);
        }
    },
    equationManagePanelFilterBoxedEquation: {
        name: t("settings.equationManagePanelFilterBoxedEquation.name"),
        desc: t("settings.equationManagePanelFilterBoxedEquation.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelFilterBoxedEquation(el, plugin);
        }
    },
    skipFirstlineInBoxedFilter: {
        name: t("settings.skipFirstlineInBoxedFilter.name"),
        desc: t("settings.skipFirstlineInBoxedFilter.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.skipFirstlineInBoxedFilter(el, plugin);
        }
    },
    equationWidgetRightClickCopyType: {
        name: t("settings.equationWidgetRightClickCopyType.name"),
        desc: t("settings.equationWidgetRightClickCopyType.desc"),
        type: "select",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationWidgetRightClickCopyType(el, plugin);
        }
    },
    useFastMathRenderer: {
        name: t("settings.useFastMathRenderer.name"),
        desc: t("settings.useFastMathRenderer.desc"),
        type: "boolean",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.useFastMathRenderer(el, plugin);
        }
    },
}
