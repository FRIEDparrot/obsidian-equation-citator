import { AutoNumberingType } from "@/utils/core/auto_number_utils";
import { CitationSettingsTab } from "./pages/citationSettingsTab";
import EquationCitator from "@/main";
import { AutoNumberSettingsTab } from "./pages/autoNumberSettingsTab";
import { StyleSettingsTab } from "./pages/styleSettingsTab";
import { CacheSettingsTab } from "./pages/cacheSettingsTab";
import { PdfExportSettingsTab } from "./pages/pdfExportSettingsTab";
import { OtherSettingsTab } from "./pages/OtherSettingsTab";
import { EquationPanelSettingsTab } from "./pages/equationPanelSettingsTab";

export interface QuoteCitationPrefix {
    prefix: string;   // e.g., "table:", "thm:", "def:"
    format: string;   // e.g., "Table. #", "Theorem #", "Definition #"
}

export interface SettingsMetadata {
    name: string;
    desc: string; // description
    type: "string" | "number" | "boolean" | "select" | "color" | "array";
    renderCallback: (el: HTMLElement, plugin: EquationCitator, renderSubpanel?: boolean) => void; // optional callback to render the value in the UI
    favoriate?: boolean; // whether to show this setting in the basic section
    hasSubPanel?: boolean; // whether this setting can have a subpanel to render
}


export interface EquationCitatorSettings {
    //#region citation settings 
    enableCitationInSourceMode: boolean; // Enable citation in source mode 

    citationPrefix: string; // Citation prefix for equations
    citationFormat: string; // Citation display format for equations

    figCitationPrefix: string; // Figure Citation Prefix
    figCitationFormat: string; // citation display format for figures
    quoteCitationPrefixes: QuoteCitationPrefix[];  // Citation prefixes and formats for callouts/quotes 

    multiCitationDelimiter: string; // Delimiter for multiple citations in a single cite 
    multiCitationDelimiterRender: string; // Rendered delimiter for multiple citations in a single cite

    enableContinuousCitation: boolean; // Render continuous citations in compat format  
    continuousRangeSymbol: string; // Range symbol for continuous citations in a single cite 
    continuousDelimiters: string; // Delimiter for continuous citations in a single cite 


    enableCrossFileCitation: boolean; // Optional setting for cross-file citations
    fileCiteDelimiter: string;
    //#endregion

    //#region style settings  
    citationPopoverContainerWidth: number; // Equation preview widget width in pixels
    citationPopoverContainerHeight: number; // Equation preview widget height in pixels 
    enableRenderLocalFileName: boolean; // Render local file name for citations 
    fileSuperScriptColor: string;
    fileSuperScriptHoverColor: string;
    enableCenterTableInCallout: boolean; // Center table in callout  
    citationColor: string; // Citation display color for equations 
    citationHoverColor: string; // Citation display hover color for equations 
    citationWidgetColor: string[]; // Citation widget color for different types of citations  
    citationWidgetColorDark: string[]; // Citation widget color for different types of citations in dark mode 
    //#endregion

    // auto numbering settings  
    autoNumberDelimiter: string; // Auto numbering delimiter   
    autoNumberType: AutoNumberingType; // Use relative heading level for auto numbering 
    autoNumberDepth: number; // Maximum depth for auto numbering level 
    autoNumberNoHeadingPrefix: string; //  equation numbering prefix for no heading level equations 
    enableAutoNumberGlobalPrefix: boolean; // Setting for auto numbering prefix 
    autoNumberGlobalPrefix: string; // Global Auto numbering prefix for equations without any heading level  
    enableAutoNumberEquationsInQuotes: boolean; // Enable auto numbering for equations in quotes 

    // by default, auto-number rename the citation, I don't provide this as option 
    enableUpdateTagsInAutoNumber: boolean; // Update citation in auto numbering 
    deleteRepeatTagsInAutoNumber: boolean; // Delete repeat tags in auto numbering  
    deleteUnusedTagsInAutoNumber: boolean; // Delete unused tags in auto numbering  

    // cache settings 
    cacheUpdateTime: number; // Debounce time for preview rendering  
    cacheCleanTime: number; // Time to automatically clear cache 

    // pdf rendering settings
    citationColorInPdf: string; // default citation color in PDF rendering

    // other settings  
    debugMode: boolean; // Optional setting for debug mode
    enableCiteWithCodeBlockInCallout: boolean; // Enable citation by inline code block in callout 


    // equation management panel Settings 
    equationManagePanelLazyUpdateTime: number,
    equationManagePanelfileCheckInterval: number,
    equationManagePanelDefaultViewType: "outline" | "list",

    // settings UI
    settingsDisplayMode: "categorical" | "concise"; // settings tab display mode
    basicSettingsKeys: string[]; // keys shown in Basic section for concise mode
    advancedSettingsKeys: string[]; // keys shown in Advanced section for concise mode
}

export const DEFAULT_SETTINGS: EquationCitatorSettings = {
    enableCitationInSourceMode: false, // Not enabled by default  
    citationPopoverContainerWidth: 500, // Default to 370px for preview widget width 
    citationPopoverContainerHeight: 400, // Default to 400px for preview widget height 
    citationPrefix: "eq:", // Default prefix for citations
    citationFormat: "(#)", // Default display format for citations
    figCitationPrefix: "fig:", // prefix for cite figures
    figCitationFormat: "Fig. #", // citation format for figures
    quoteCitationPrefixes: [
        { prefix: "table:", format: "Table. #" },
    ],

    citationColor: "#a288f9",
    enableCenterTableInCallout: true,  // enable centering tables in callout for butiful rendering 
    citationHoverColor: "#c5b6fc",
    multiCitationDelimiter: ",", // Default delimiter for multiple citations in a single cite
    multiCitationDelimiterRender: ", ", // Default rendered delimiter for multiple citations in a single cite 
    enableContinuousCitation: true, // Default to true for convenience 
    continuousDelimiters: ". - : \\_", // Default delimiter for continuous citations in a single cite
    continuousRangeSymbol: "~", // Default range symbol for continuous citations in a single cite 
    enableRenderLocalFileName: true, // Default to true 

    enableCrossFileCitation: true, // Default to true
    fileCiteDelimiter: "^", // Default delimiter for file citations 
    fileSuperScriptColor: "#8e77e1",
    fileSuperScriptHoverColor: "#6d50e0",

    cacheUpdateTime: 5000, // Max time for cache to refresh (5s)
    cacheCleanTime: 300000, // Max time for cache to clear (5 minutes) 

    citationColorInPdf: "#4199df", // black color for default citation color in PDF rendering 

    enableCiteWithCodeBlockInCallout: false, // cite with inline code block in quote

    autoNumberDelimiter: ".", // Default delimiter for auto numbering  
    autoNumberDepth: 3, // Default to 3 (i.e., 1.1.1 for 3 levels)  
    autoNumberType: AutoNumberingType.Relative, // Default is using relative heading level 
    autoNumberNoHeadingPrefix: "P",
    enableAutoNumberGlobalPrefix: false,
    autoNumberGlobalPrefix: "", // Default to empty string for no prefix 
    enableAutoNumberEquationsInQuotes: false, // Default to false, not to number equations in quotes 
    enableUpdateTagsInAutoNumber: true, // Default to true, update citation in auto numbering  
    deleteRepeatTagsInAutoNumber: true, // Default to true, delete repeat tags in auto numbering 
    deleteUnusedTagsInAutoNumber: false, // Default to true, delete unused tags in auto numbering 

    citationWidgetColor: ["#ffffff", "#f8f9fa", "#f5f6f7", "#e9ecef", "#dee2e6"],
    citationWidgetColorDark: ["#1e1e1e", "#2d2d2d", "#252525", "#3a3a3a", "#404040"],
    debugMode: false, // debug mode is off by default (for set default, see debugger.tsx)
    // settings UI defaults
    settingsDisplayMode: "concise",
    basicSettingsKeys: [
        "autoNumberType",
        "autoNumberDepth",
        "autoNumberNoHeadingPrefix",
        "enableAutoNumberGlobalPrefix",
        "citationPopoverContainerWidth",
        "enableCenterTableInCallout",
    ],
    advancedSettingsKeys: [
        "enableCitationInSourceMode",
        "citationPrefix",
        "citationFormat",
        "enableRenderLocalFileName",
        "multiCitationDelimiter",
        "multiCitationDelimiterRender",
        "enableContinuousCitation",
        "continuousDelimiters",
        "quoteCitationPrefixes",
        "autoNumberDelimiter",
        "enableAutoNumberEquationsInQuotes",
        "enableUpdateTagsInAutoNumber",
        "cacheUpdateTime",
        "cacheCleanTime",
        "citationWidgetColor",
        "citationWidgetColorDark",
        "debugMode",
    ],
    equationManagePanelLazyUpdateTime: 5000,
    equationManagePanelfileCheckInterval: 1000,
    equationManagePanelDefaultViewType: "list",
};

export const SETTINGS_METADATA: Record<keyof EquationCitatorSettings, SettingsMetadata> = {
    settingsDisplayMode: {
        name: "Settings Display Mode",
        desc: "Settings display mode",
        type: "select",
        renderCallback: (el, plugin) => { }  // toolbar settings no need that 
    },

    basicSettingsKeys: {
        name: "Basic Settings Keys",
        desc: "Keys shown in Basic section for concise mode",
        type: "array",
        renderCallback: (el, plugin) => { }  // to be implemented
    },

    advancedSettingsKeys: {
        name: "Advanced Settings Keys",
        desc: "Keys shown in Advanced section for concise mode",
        type: "array",
        renderCallback: (el, plugin) => { }  // to be implemented
    },

    enableCitationInSourceMode: {
        name: "Enable in Source Mode",
        desc: "Enable citation in source mode",
        type: "boolean",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.enableCitationInSourceMode(el, plugin);
        }
    },
    enableRenderLocalFileName: {
        name: "Render Local File Name in Equation Preview",
        desc: "Render local file name for citations",
        type: "boolean",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.enableRenderLocalFileName(el, plugin);
        }
    },
    citationPrefix: {
        name: "Citation Prefix",
        desc: "Prefix used for citations, e.g. 'eq:' means use `\\ref{eq:1.1}` for citation",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.citationPrefix(el, plugin);
        }
    },
    citationFormat: {
        name: "Citation Display Format",
        desc: "Display format for citations, use '#' for equation number",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.citationFormat(el, plugin);
        }
    },
    figCitationPrefix: {
        name: "Figure Citation Prefix",
        desc: "Prefix used for figure citations, e.g. 'fig:' means use `\\ref{fig:1.1}` for citation",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.figCitationPrefix(el, plugin);
        }
    },
    figCitationFormat: {
        name: "Figure Citation Display Format",
        desc: "Display format for figure citations, use '#' for figure number",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.figCitationFormat(el, plugin);
        }
    },
    quoteCitationPrefixes: {
        name: "Callout/Quote Citation Prefixes",
        desc: "Prefixes for citing callouts/quotes. Default 'table:' for tables. Add 'thm:', 'def:', etc. for theorems, definitions. Format: > [!table:1.1] or > [!thm:2.3]",
        type: "array",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.quoteCitationPrefixes(el, plugin);
        }
    },
    multiCitationDelimiter: {
        name: "Multiple Citation Delimiter",
        desc: "Delimiter used for multiple citations, e.g. comma for '\\ref{1.2, 1.3}'",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.multiCitationDelimiter(el, plugin);
        }
    },
    multiCitationDelimiterRender: {
        name: "Multiple Citation Rendered Delimiter",
        desc: "Delimiter shown between citations when rendered (purely visual)",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.multiCitationDelimiterRender(el, plugin);
        }
    },
    enableContinuousCitation: {
        name: "Enable Continuous Citations",
        desc: "Enable continuous  citation format, also render citations in continuous format",
        type: "boolean",
        hasSubPanel: true, // it is a subpanel setting 
        renderCallback: (el, plugin, renderSubpanel) => {
            CitationSettingsTab.enableContinuousCitation(el, plugin, renderSubpanel);
        }
    },
    continuousRangeSymbol: {
        name: "Continuous Citation Range Symbol",
        desc: "Range symbol for continuous citations, e.g. '~' for '1~2'",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.continuousRangeSymbol(el, plugin);
        }
    },
    continuousDelimiters: {
        name: "Continuous Citation Delimiters",
        desc: "Delimiter for recognition of continuous citations, split by space",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.continuousDelimiters(el, plugin);
        }
    },
    enableCrossFileCitation: {
        name: "Enable Cross-File Citations",
        desc: "Enable using pure footnote style citations to cite equations across files",
        type: "boolean",
        hasSubPanel: true, // it is a subpanel setting 
        renderCallback: (el, plugin, renderSubpanel) => {
            CitationSettingsTab.enableCrossFileCitation(el, plugin, renderSubpanel);
        }
    },
    fileCiteDelimiter: {
        name: "File Citation Delimiter",
        desc: "Delimiter for file citations, e.g. '^' for '1^{1.1}'",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.fileCiteDelimiter(el, plugin);
        }
    },
    autoNumberDelimiter: {
        name: "Auto Numbering Delimiter",
        desc: "Delimiter used for numbering equations, e.g. '.' for '1.1', '-' for '1-1', etc.",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberDelimiter(el, plugin);
        }
    },
    autoNumberDepth: {
        name: "Auto Numbering Depth",
        desc: "Maximum depth for equation numbers (e.g., depth of 2 gives '1.1', depth of 3 gives '1.1.1')",
        type: "number",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberDepth(el, plugin);
        }
    },
    autoNumberType: {
        name: "Auto Numbering Method",
        desc: "Use absolute or relative heading level for auto numbering",
        type: "select",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberType(el, plugin);
        }
    },
    autoNumberNoHeadingPrefix: {
        name: "Auto Numbering No Heading Prefix",
        desc: "Prefix for equations without any heading level (e.g., 'P1', 'P2', etc.)",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberNoHeadingPrefix(el, plugin);
        }
    },
    enableAutoNumberGlobalPrefix: {
        name: "Enable Auto-number prefix",
        desc: "Auto equation numbering prefix for purpose like chapter",
        type: "boolean",
        hasSubPanel: true,
        renderCallback: (el, plugin, renderSubpanel) => {
            AutoNumberSettingsTab.enableAutoNumberGlobalPrefix(el, plugin, renderSubpanel);
        }
    },
    autoNumberGlobalPrefix: {
        name: "Auto Numbering Global Prefix",
        desc: "Global Auto equation numbering prefix for purpose like chapter",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberGlobalPrefix(el, plugin);
        }
    },
    enableAutoNumberEquationsInQuotes: {
        name: "Auto Numbering Equations in Quotes",
        desc: "Enable auto numbering for equations in quotes",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberEquationsInQuotes(el, plugin);
        }
    },
    enableUpdateTagsInAutoNumber: {
        name: "Auto Update Citations in Auto Numbering",
        desc: "Enable auto update citations during auto numbering",
        type: "boolean",
        hasSubPanel: true,
        renderCallback: (el, plugin, renderSubpanel) => {
            AutoNumberSettingsTab.enableUpdateTagsInAutoNumber(el, plugin, renderSubpanel);
        }
    },
    deleteRepeatTagsInAutoNumber: {
        name: "Auto Delete Conflicting Tag Citations",
        desc: "Automatically delete conflicting tag citations during auto numbering.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.deleteRepeatTagsInAutoNumber(el, plugin);
        }
    },
    deleteUnusedTagsInAutoNumber: {
        name: "Auto Delete Unused Tags Citations",
        desc: "Automatically delete unused tag citations during auto numbering.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.deleteUnusedTagsInAutoNumber(el, plugin);
        }
    },
    cacheUpdateTime: {
        name: "Cache Update Time",
        desc: "Time refresh cache (in ms), for very large document, consider increase this",
        type: "number",
        renderCallback: (el, plugin) => {
            CacheSettingsTab.cacheUpdateTime(el, plugin);
        }
    },
    cacheCleanTime: {
        name: "Cache Clean Time",
        desc: "Time to automatically clean cache",
        type: "select",
        renderCallback: (el, plugin) => {
            CacheSettingsTab.cacheCleanTime(el, plugin);
        }
    },
    citationPopoverContainerWidth: {
        name: "Equation Preview Widget Width",
        desc: "Width of the equation preview widget in pixels",
        type: "number",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.citationPopoverContainerWidth(el, plugin);
        }
    },

    citationPopoverContainerHeight: {
        name: "Equation Preview Widget Height",
        desc: "Max Height of the equation preview widget in pixels",
        type: "number",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.citationPopoverContainerHeight(el, plugin);
        }
    },
    citationColor: {
        name: "Citation Display Color",
        desc: "Citation display color for equations",
        type: "color",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.citationColor(el, plugin);
        }
    },
    citationHoverColor: {
        name: "Citation Hover Color",
        desc: "Citation display hover color for equations",
        type: "color",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.citationHoverColor(el, plugin);
        }
    },

    fileSuperScriptColor: {
        name: "File Citation Color",
        desc: "Color for file citation superscript",
        type: "color",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.fileSuperScriptColor(el, plugin);
        }
    },

    fileSuperScriptHoverColor: {
        name: "File Citation Hover Color",
        desc: "Color for file citation superscript when hovering",
        type: "color",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.fileSuperScriptHoverColor(el, plugin);
        }
    },

    citationWidgetColor: {
        name: "Light Theme Widget Colors",
        desc: "Widget colors for light theme",
        type: "array",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.citationWidgetColor(el, plugin);
        }
    },

    enableCenterTableInCallout: {
        name: "Center Tables in Callouts",
        desc: "If enabled, tables inside callouts will be centered within the callout box.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.enableCenterTableInCallout(el, plugin);
        }
    },
    
    citationWidgetColorDark: {
        name: "Dark Theme Widget Colors",
        desc: "Widget colors for dark theme",
        type: "array",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.citationWidgetColorDark(el, plugin);
        }
    },

    citationColorInPdf: {
        name: "Citation Color for PDF",
        desc: "Citation color for PDF export",
        type: "color",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.citationColorInPdf(el, plugin);
        }
    },
    debugMode: {
        name: "Debug Mode",
        desc: "Enables developer debug mode for this plugin",
        type: "boolean",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.debugMode(el, plugin);
        }
    },
    enableCiteWithCodeBlockInCallout: {
        name: "(Beta) Cite with Inline Code Block in Callout",
        desc: "Enable citation by inline code block in callout",
        type: "boolean",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.enableCiteWithCodeBlockInCallout(el, plugin);
        }
    },
    equationManagePanelfileCheckInterval: {
        name: "Equation Panel File Check Interval",
        desc: "Time interval to check for newly opened files and refresh the equation panel (in ms)",
        type: "number",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelFileCheckInterval(el, plugin);
        }
    },
    equationManagePanelLazyUpdateTime: {
        name: "Equation Panel Lazy Update Time",
        desc: "Time interval to update the equation panel while editing (in ms)",
        type: "number",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelLazyUpdateTime(el, plugin);
        }
    },
    equationManagePanelDefaultViewType: {
        name: "Equation Panel Default View Type",
        desc: "Default view type for the equation panel (outline or list)",
        type: "select",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelDefaultViewType(el, plugin);
        }
    },
}
