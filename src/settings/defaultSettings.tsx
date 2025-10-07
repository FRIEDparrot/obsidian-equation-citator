import { AutoNumberingType } from "@/utils/core/auto_number_utils";

export interface EquationCitatorSettings {
    // citation settings 
    enableCitationInSourceMode: boolean; // Enable citation in source mode 
    citationPopoverContainerWidth: number; // Equation preview widget width in pixels
    citationPopoverContainerHeight: number; // Equation preview widget height in pixels 
    citationPrefix: string; // Citation prefix for equations
    citationFormat: string; // Citation display format for equations 

    figCitationPrefix: string; // Figure Citation Prefix
    figCitationFormat: string; // citation display format for figures 

    citationColor: string; // Citation display color for equations 
    citationHoverColor: string; // Citation display hover color for equations 
    multiCitationDelimiter: string; // Delimiter for multiple citations in a single cite 
    multiCitationDelimiterRender: string; // Rendered delimiter for multiple citations in a single cite 
    enableContinuousCitation: boolean; // Render continuous citations in compat format 
    renderLocalFileName: boolean; // Render local file name for citations

    continuousRangeSymbol: string; // Range symbol for continuous citations in a single cite 
    continuousDelimiters: string; // Delimiter for continuous citations in a single cite 

    enableCrossFileCitation: boolean; // Optional setting for cross-file citations
    fileCiteDelimiter: string;
    fileSuperScriptColor: string;
    fileSuperScriptHoverColor: string;

    // render core settings 
    cacheUpdateTime: number; // Debounce time for preview rendering  
    cacheCleanTime: number; // Time to automatically clear cache 


    // pdf rendering settings
    citationColorInPdf: string; // default citation color in PDF rendering
    enableCiteWithCodeBlockInCallout: boolean; // Enable citation by inline code block in callout


    // auto numbering settings  
    autoNumberDelimiter: string; // Auto numbering delimiter   
    autoNumberType: AutoNumberingType; // Use relative heading level for auto numbering 
    autoNumberDepth: number; // Maximum depth for auto numbering level 
    autoNumberNoHeadingPrefix: string; //  equation numbering prefix for no heading level equations 
    autoNumberPrefixEnabled: boolean; // Setting for auto numbering prefix 
    autoNumberPrefix: string; // Global Auto numbering prefix for equations without any heading level  
    autoNumberEquationsInQuotes: boolean; // Enable auto numbering for equations in quotes 


    // by default, auto-number rename the citation, I don't provide this as option 
    enableUpdateTagsInAutoNumbering: boolean; // Update citation in auto numbering 
    deleteRepeatTagsInAutoNumbering: boolean; // Delete repeat tags in auto numbering  
    deleteUnusedTagsInAutoNumbering: boolean; // Delete unused tags in auto numbering  

    citationWidgetColor: string[]; // Citation widget color for different types of citations  
    citationWidgetColorDark: string[]; // Citation widget color for different types of citations in dark mode 
    debugMode: boolean; // Optional setting for debug mode
    // settings UI
    settingsDisplayMode?: "categorical" | "concise"; // settings tab display mode
    basicSettingsKeys?: string[]; // keys shown in Basic section for concise mode
    colorfulTitleEnabled?: boolean; // colorful gradient title
}
export const DEFAULT_SETTINGS: EquationCitatorSettings = {
    enableCitationInSourceMode: false, // Not enabled by default  
    citationPopoverContainerWidth: 500, // Default to 370px for preview widget width 
    citationPopoverContainerHeight: 400, // Default to 400px for preview widget height 
    citationPrefix: "eq:", // Default prefix for citations 
    citationFormat: "(#)", // Default display format for citations  
    figCitationPrefix: "fig:", // prefix for cite figures 
    figCitationFormat: "fig. #", // citation format for figures 
    citationColor: "#a288f9",
    citationHoverColor: "#c5b6fc",
    multiCitationDelimiter: ",", // Default delimiter for multiple citations in a single cite
    multiCitationDelimiterRender: ", ", // Default rendered delimiter for multiple citations in a single cite 
    enableContinuousCitation: true, // Default to true for convenience 
    continuousDelimiters: ". - : \\_", // Default delimiter for continuous citations in a single cite
    continuousRangeSymbol: "~", // Default range symbol for continuous citations in a single cite 
    renderLocalFileName: true, // Default to true 

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
    autoNumberPrefixEnabled: false,
    autoNumberPrefix: "", // Default to empty string for no prefix 
    autoNumberEquationsInQuotes: false, // Default to false, not to number equations in quotes 
    enableUpdateTagsInAutoNumbering: true, // Default to true, update citation in auto numbering  
    deleteRepeatTagsInAutoNumbering: true, // Default to true, delete repeat tags in auto numbering 
    deleteUnusedTagsInAutoNumbering: false, // Default to true, delete unused tags in auto numbering 

    citationWidgetColor: ["#ffffff", "#f8f9fa", "#f5f6f7", "#e9ecef", "#dee2e6"],
    citationWidgetColorDark: ["#1e1e1e", "#2d2d2d", "#252525", "#3a3a3a", "#404040"],
    debugMode: false, // debug mode is off by default (for set default, see debugger.tsx)
    // settings UI defaults
    settingsDisplayMode: "concise",
    basicSettingsKeys: [
        "autoNumberDepth",
        "citationPopoverContainerWidth",
        "autoNumberNoHeadingPrefix",
        "resetSettings"
    ]
};

