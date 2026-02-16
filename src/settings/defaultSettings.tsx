import { AutoNumberingType } from "@/utils/core/auto_number_core";
import { CitationSettingsTab } from "./pages/citationSettingsTab";
import EquationCitator from "@/main";
import { AutoNumberSettingsTab } from "./pages/autoNumberSettingsTab";
import { StyleSettingsTab } from "./pages/styleSettingsTab";
import { CacheSettingsTab } from "./pages/cacheSettingsTab";
import { PdfExportSettingsTab } from "./pages/pdfExportSettingsTab";
import { OtherSettingsTab } from "./pages/OtherSettingsTab";
import { EquationPanelSettingsTab } from "./pages/equationPanelSettingsTab";

export interface CalloutCitationPrefix {
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
    enableRichAutoComplete: boolean; // Enable rich auto-complete suggestion for figures and callouts
    enableRichAutoCompleteHoverPreview: boolean; // Enable concise auto-complete preview for figures and callouts
    richAutoCompletePreviewDelayTime: number; // Delay time for concise auto-complete rendering (ms)

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
    enableAutoNumberEquationsInQuotes: boolean; // Enable auto numbering for equations in quotes 
    enableAutoNumberTaggedEquationsOnly: boolean; // Enable auto numbering only for tagged equations
    
    figAutoNumberDelimiter: string; // Auto numbering delimiter for figures
    figAutoNumberDepth: number; // Maximum depth for auto numbering figures (sepreate from the equations)
    figAutoNumberNoHeadingPrefix: string; // figure numbering prefix for no heading level figures
    figAutoNumberGlobalPrefix: string; // Global Auto numbering prefix for figures without any heading level
    enableAutoNumberFigsInQuotes: boolean; // Enable auto numbering for figures in quotes,
    enableAutoNumberTaggedFigsOnly: boolean; // Enable auto numbering only for tagged figures

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
    enableTypstMode: boolean; // Enable compatibility with Typst syntax
    debugMode: boolean; // Optional setting for debug mode
    enableCiteWithCodeBlockInCallout: boolean; // Enable citation by inline code block in callout 
    extensionsUseMarkdownRenderer: string[];  // image extensions that force using Markdown renderer 

    // equation management panel Settings 
    equationManagePanelLazyUpdateTime: number,
    equationManagePanelFileCheckInterval: number,
    equationManagePanelDefaultViewType: "outline" | "list",
    equationManagePanelFilterTagOnlyEquation: boolean;
    equationManagePanelEnableRenderHeadingsOnly: boolean;

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

    enableCiteWithCodeBlockInCallout: false, // cite with inline code block in quote

    autoNumberDelimiter: ".", // Default delimiter for auto numbering  
    autoNumberDepth: 3, // Default to 3 (i.e., 1.1.1 for 3 levels)  
    autoNumberType: AutoNumberingType.Relative, // Default is using relative heading level 
    autoNumberNoHeadingPrefix: "P",
    autoNumberGlobalPrefix: "", // Default to empty string for no prefix 
    enableAutoNumberEquationsInQuotes: false, // Default to false, not to number equations in quotes 
    enableAutoNumberTaggedEquationsOnly: false, // Default to false, number all equations
    enableUpdateTagsInAutoNumber: true, // Default to true, update citation in auto numbering  
    deleteRepeatTagsInAutoNumber: true, // Default to true, delete repeat tags in auto numbering 
    deleteUnusedTagsInAutoNumber: false, // Default to true, delete unused tags in auto numbering 
    
    figAutoNumberDelimiter: ".", // Default delimiter for figure auto numbering  
    figAutoNumberDepth: 2, // Default to 2 for figure auto numbering (i.e., fig:1.1)
    figAutoNumberNoHeadingPrefix: "F", // Default figure numbering prefix for no heading level figures
    figAutoNumberGlobalPrefix: "", // Default to empty string for no prefix for figure auto numbering
    enableAutoNumberFigsInQuotes: false, // Default to false, not to number figures in quotes
    enableAutoNumberTaggedFigsOnly: false, // Default to false, number all figures

    enableTypstMode: false,
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
        "multiCitationDelimiter",
        "multiCitationDelimiterRender",
        "enableContinuousCitation",
        "calloutCitationPrefixes",
        "autoNumberDelimiter",
        "enableAutoNumberEquationsInQuotes",
        "enableUpdateTagsInAutoNumber",
        "enableTypstMode",
        "cacheUpdateTime",
        "cacheCleanTime",
        "debugMode",
    ],
    equationManagePanelLazyUpdateTime: 5000,
    equationManagePanelFileCheckInterval: 1000,
    equationManagePanelDefaultViewType: "list",
    equationManagePanelFilterTagOnlyEquation: false,
    equationManagePanelEnableRenderHeadingsOnly: false,
};

export const SETTINGS_METADATA: Record<keyof EquationCitatorSettings, SettingsMetadata> = {
    settingsDisplayMode: {
        name: "Settings display mode",
        desc: "Settings display mode",
        type: "select",
        renderCallback: (el, plugin) => { }  // toolbar settings no need that 
    },

    basicSettingsKeys: {
        name: "Basic settings keys",
        desc: "Keys shown in basic section for concise mode",
        type: "array",
        renderCallback: (el, plugin) => { }  // to be implemented
    },

    advancedSettingsKeys: {
        name: "Advanced settings keys",
        desc: "Keys shown in advanced section for concise mode",
        type: "array",
        renderCallback: (el, plugin) => { }  // to be implemented
    },

    enableCitationInSourceMode: {
        name: "Enable in source mode",
        desc: "Enable citation in source mode",
        type: "boolean",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.enableCitationInSourceMode(el, plugin);
        }
    },
    citationPrefix: {
        name: "Citation prefix",
        desc: "Prefix used for citations, e.g. 'eq:' means use `\\ref{eq:1.1}` for citation",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.citationPrefix(el, plugin);
        }
    },
    citationFormat: {
        name: "Citation display format",
        desc: "Display format for citations, use '#' for equation number",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.citationFormat(el, plugin);
        }
    },
    figCitationPrefix: {
        name: "Figure citation prefix",
        desc: "Prefix used for figure citations, e.g. 'fig:' means use `\\ref{fig:1.1}` for citation",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.figCitationPrefix(el, plugin);
        }
    },
    figCitationFormat: {
        name: "Figure citation display format",
        desc: "Display format for figure citations, use '#' for figure number",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.figCitationFormat(el, plugin);
        }
    },
    enableRichAutoComplete: {
        name: "Show full preview in autocomplete",
        desc: "Displays the full figure or callout content directly inside each autocomplete suggestion. Disable to use compact mode with hover preview instead.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.enableRichAutoComplete(el, plugin);
        }
    },
    enableRichAutoCompleteHoverPreview: {
        name: "Show preview when hover on autocomplete item",
        desc: "In compact mode, displays a preview of the figure or callout when hovering over a suggestion item.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.enableRichAutoCompleteHoverPreview(el, plugin);
        }
    },
    richAutoCompletePreviewDelayTime: {
        name: "Autocomplete hover preview delay time",
        desc: "Delay ms before the preview appears when hovering over a suggestion (compact mode only).",
        type: "number",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.richAutoCompletePreviewDelayTime(el, plugin);
        }
    },
    calloutCitationPrefixes: {
        name: "Callout citation prefixes",
        desc: "Prefixes for citing callouts/quotes. Default 'table:' for tables. Add 'thm:', 'def:', etc. for theorems, definitions.",
        type: "array",
        renderCallback: (el: HTMLElement, plugin: EquationCitator) => {
            CitationSettingsTab.calloutCitationPrefixes(el, plugin);
        }
    },
    multiCitationDelimiter: {
        name: "Multiple citation delimiter",
        desc: String.raw`Delimiter used for multiple citations, e.g. comma for '\ref{1.2, 1.3}'`,
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.multiCitationDelimiter(el, plugin);
        }
    },
    multiCitationDelimiterRender: {
        name: "Multiple citation rendered delimiter",
        desc: String.raw`Delimiter shown between citations when rendered (purely visual)`,
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.multiCitationDelimiterRender(el, plugin);
        }
    },
    enableContinuousCitation: {
        name: "Enable continuous citations",
        desc: "Enable continuous  citation format, also render citations in continuous format",
        type: "boolean",
        hasSubPanel: true, // it is a subpanel setting 
        renderCallback: (el, plugin, renderSubpanel) => {
            CitationSettingsTab.enableContinuousCitation(el, plugin, renderSubpanel);
        }
    },
    continuousRangeSymbol: {
        name: "Continuous citation range symbol",
        desc: "Range symbol for continuous citations, e.g. '~' for '1~2'",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.continuousRangeSymbol(el, plugin);
        }
    },
    continuousDelimiters: {
        name: "Continuous citation delimiters",
        desc: "Delimiter for recognition of continuous citations, split by space",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.continuousDelimiters(el, plugin);
        }
    },
    enableCrossFileCitation: {
        name: "Enable cross-file citations",
        desc: "Enable using pure footnote style citations to cite equations across files",
        type: "boolean",
        hasSubPanel: true, // it is a subpanel setting 
        renderCallback: (el, plugin, renderSubpanel) => {
            CitationSettingsTab.enableCrossFileCitation(el, plugin, renderSubpanel);
        }
    },
    fileCiteDelimiter: {
        name: "File citation delimiter",
        desc: "Delimiter for file citations, e.g. '^' for '1^{1.1}'",
        type: "string",
        renderCallback: (el, plugin) => {
            CitationSettingsTab.fileCiteDelimiter(el, plugin);
        }
    },
    autoNumberDelimiter: {
        name: "Auto numbering delimiter",
        desc: "Delimiter used for numbering equations, e.g. '.' for '1.1', '-' for '1-1', etc.",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberDelimiter(el, plugin);
        }
    },
    autoNumberType: {
        name: "Auto numbering method",
        desc: "Use absolute or relative heading level for auto numbering (shared by equations and figures)",
        type: "select",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberType(el, plugin);
        }
    },
    autoNumberDepth: {
        name: "Auto numbering depth",
        desc: "Maximum depth for equation numbers (e.g., depth of 2 gives '1.1', depth of 3 gives '1.1.1')",
        type: "number",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberDepth(el, plugin);
        }
    },
    autoNumberNoHeadingPrefix: {
        name: "Auto numbering no heading prefix",
        desc: "Prefix for equations without any heading level (e.g., 'P1', 'P2', etc.)",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberNoHeadingPrefix(el, plugin);
        }
    },
    autoNumberGlobalPrefix: {
        name: "Auto numbering global prefix",
        desc: "Global auto equation numbering prefix for purpose like chapter",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.autoNumberGlobalPrefix(el, plugin);
        }
    },
    enableAutoNumberEquationsInQuotes: {
        name: "Auto numbering equations in quotes",
        desc: "Enable auto numbering for equations in quotes",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberEquationsInQuotes(el, plugin);
        }
    },
    enableAutoNumberTaggedEquationsOnly: {
        name: "Auto numbering tagged equations only",
        desc: "When auto-numbering, only update the equations that are already tagged",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberTaggedEquationsOnly(el, plugin);
        }
    },
    figAutoNumberDelimiter: {
        name: "Figure auto numbering delimiter",
        desc: "Delimiter used for numbering figures, e.g. '.' for '1.1', '-' for '1-1', etc.",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.figAutoNumberDelimiter(el, plugin);
        }
    },
    figAutoNumberDepth: {
        name: "Auto numbering depth for figures",
        desc: "Maximum depth for figure numbers (e.g., depth of 2 gives 'fig:1.1')",
        type: "number",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.figAutoNumberDepth(el, plugin);
        }
    },
    figAutoNumberNoHeadingPrefix: {
        name: "Figure auto numbering no heading prefix",
        desc: "Prefix for figures without any heading level (e.g., 'F1', 'F2', etc.)",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.figAutoNumberNoHeadingPrefix(el, plugin);
        }
    },
    figAutoNumberGlobalPrefix: {
        name: "Figure auto numbering global prefix",
        desc: "Global prefix for figure auto numbering for figures without any heading level",
        type: "string",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.figAutoNumberGlobalPrefix(el, plugin);
        }
    },
    enableAutoNumberFigsInQuotes: {
        name: "Auto numbering figures in quotes",
        desc: "Enable auto numbering for figures in quotes",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberFigsInQuotes(el, plugin);
        }
    },
    enableAutoNumberTaggedFigsOnly: {
        name: "Auto numbering tagged figures only",
        desc: "When auto-numbering, only update the figures that are already tagged",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.enableAutoNumberTaggedFigsOnly(el, plugin);
        }
    },
    // These 3 options are shared by figures and equations
    enableUpdateTagsInAutoNumber: {
        name: "Auto update citations in auto numbering",
        desc: "Enable auto update citations during auto numbering. Always keep it selected to ensure citations are correctly updated",
        type: "boolean",
        hasSubPanel: true,
        renderCallback: (el, plugin, renderSubpanel) => {
            AutoNumberSettingsTab.enableUpdateTagsInAutoNumber(el, plugin, renderSubpanel);
        }
    },
    deleteRepeatTagsInAutoNumber: {
        name: "Auto delete conflicting tag citations",
        desc: "Automatically delete conflicting tag citations during auto numbering.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.deleteRepeatTagsInAutoNumber(el, plugin);
        }
    },
    deleteUnusedTagsInAutoNumber: {
        name: "Auto delete unused tags citations",
        desc: "Automatically delete unused tag citations during auto numbering.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            AutoNumberSettingsTab.deleteUnusedTagsInAutoNumber(el, plugin);
        }
    },
    cacheUpdateTime: {
        name: "Cache update time",
        desc: "Time refresh cache (in ms), for very large document, consider increase this",
        type: "number",
        renderCallback: (el, plugin) => {
            CacheSettingsTab.cacheUpdateTime(el, plugin);
        }
    },
    cacheCleanTime: {
        name: "Cache clean time",
        desc: "Time to automatically clean cache",
        type: "select",
        renderCallback: (el, plugin) => {
            CacheSettingsTab.cacheCleanTime(el, plugin);
        }
    },
    citationPopoverSize: {
        name: "Preview widget size",
        desc: "Size for citation preview widgets (equations, figures, callouts)",
        type: "select",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.citationPopoverSize(el, plugin);
        }
    },

    enableCenterTableInCallout: {
        name: "Center tables in callouts",
        desc: "If enabled, tables inside callouts will be centered within the callout box.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.enableCenterTableInCallout(el, plugin);
        }
    },

    enableRenderFigureInfoInPreview: {
        name: "Render figure info in preview",
        desc: "If disabled, figure title and description will not be rendered in preview.",
        type: "boolean",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.enableRenderFigureInfoInPreview(el, plugin);
        }
    },

    enableRenderLocalFileName: {
        name: "Render local file name in equation preview",
        desc: "Render local file name for citations",
        type: "boolean",
        renderCallback: (el, plugin) => {
            StyleSettingsTab.enableRenderLocalFileName(el, plugin);
        }
    },

    citationColorInPdf: {
        name: "Citation color for PDF",
        desc: "Citation color for PDF export",
        type: "color",
        renderCallback: (el, plugin) => {
            PdfExportSettingsTab.citationColorInPdf(el, plugin);
        }
    },
    enableTypstMode: {
        name: "Enable typst mode",
        desc: "Enable compatibility with Typst syntax",
        type: "boolean",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.enableTypstMode(el, plugin);
        }
    },
    debugMode: {
        name: "Debug mode",
        desc: "Enables developer debug mode for this plugin",
        type: "boolean",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.debugMode(el, plugin);
        }
    },
    extensionsUseMarkdownRenderer: {
        name: "Extensions that use markdown renderer",
        desc: "List of file extensions that should use markdown renderer instead of default image renderer",
        type: "array",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.extensionsUseMarkdownRenderer(el, plugin);
        }
    },
    enableCiteWithCodeBlockInCallout: {
        name: "Cite with inline code block in callout",
        desc: "Enable citation by inline code block in callout (This feature will never be fully supported, and citations here will not be updated, you may not turn this on unless you have specific needs)",
        type: "boolean",
        renderCallback: (el, plugin) => {
            OtherSettingsTab.enableCiteWithCodeBlockInCallout(el, plugin);
        }
    },
    equationManagePanelFileCheckInterval: {
        name: "Equation panel file check interval",
        desc: "Time interval to check for newly opened files and refresh the equation panel (in ms)",
        type: "number",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelFileCheckInterval(el, plugin);
        }
    },
    equationManagePanelLazyUpdateTime: {
        name: "Equation panel lazy update time",
        desc: "Time interval to update the equation panel while editing (in ms)",
        type: "number",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelLazyUpdateTime(el, plugin);
        }
    },
    equationManagePanelDefaultViewType: {
        name: "Equation panel default view type",
        desc: "Default view type for the equation panel (outline or list)",
        type: "select",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelDefaultViewType(el, plugin);
        }
    },
    equationManagePanelFilterTagOnlyEquation: {
        name: "Filter tag only equation",
        desc: "Default value for filter tag only equations",
        type: "boolean",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelFilterTagOnlyEquation(el, plugin);
        }
    },
    equationManagePanelEnableRenderHeadingsOnly: {
        name: "Render headings only",
        desc: "Default value for render headings only in outline view",
        type: "boolean",
        renderCallback: (el, plugin) => {
            EquationPanelSettingsTab.equationManagePanelEnableRenderHeadingsOnly(el, plugin);
        }
    },
}
