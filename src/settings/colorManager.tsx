import { EquationCitatorSettings } from "@/settings/settingsTab";

/**
 * Color Manager class for using CSS variables to manage colors in the plugin.
 */
export class ColorManager {
    private static styleElement: HTMLStyleElement | null = null;
    private static readonly STYLE_ID = 'equation-citator-colors';

    // Define all CSS variable mappings
    private static readonly COLOR_MAPPINGS = {
        // Citation colors
        citationColor: '--em-math-citation-color',
        citationHoverColor: '--em-math-citation-hover-color',

        // File citation colors
        fileSuperScriptColor: '--em-math-file-cite-color',
        fileSuperScriptHoverColor: '--em-math-file-cite-hover-color',

        // PDF colors
        citationColorInPdf: '--em-math-citation-color-print',
        fileSuperScriptColorInPdf: '--em-math-citation-file-superscript-color-print',

        // Widget colors (light theme)
        citationWidgetColor0: '--em-background-primary',
        citationWidgetColor1: '--em-background-secondary',
        citationWidgetColor2: '--em-background-primary-alt',
        citationWidgetColor3: '--em-background-modifier-hover',
        citationWidgetColor4: '--em-background-modifier-border',

        // Widget colors (dark theme)
        citationWidgetColorDark0: '--em-background-primary-dark',
        citationWidgetColorDark1: '--em-background-secondary-dark',
        citationWidgetColorDark2: '--em-background-primary-alt-dark',
        citationWidgetColorDark3: '--em-background-modifier-hover-dark',
        citationWidgetColorDark4: '--em-background-modifier-border-dark',
    };
    
    /**
     * Initialize or update all CSS custom properties from settings
     */
    static updateAllColors(settings: EquationCitatorSettings): void {
        this.ensureStyleElement();
        const cssRules: string[] = [':root {'];

        // Add individual color properties
        cssRules.push(`  ${this.COLOR_MAPPINGS.citationColor}: ${settings.citationColor};`);
        cssRules.push(`  ${this.COLOR_MAPPINGS.citationHoverColor}: ${settings.citationHoverColor};`);
        cssRules.push(`  ${this.COLOR_MAPPINGS.fileSuperScriptColor}: ${settings.fileSuperScriptColor};`);
        cssRules.push(`  ${this.COLOR_MAPPINGS.fileSuperScriptHoverColor}: ${settings.fileSuperScriptHoverColor};`);
        cssRules.push(`  ${this.COLOR_MAPPINGS.citationColorInPdf}: ${settings.citationColorInPdf};`);
        cssRules.push(`  ${this.COLOR_MAPPINGS.fileSuperScriptColorInPdf}: ${settings.fileSuperScriptColorInPdf};`);

        // Add widget colors (light theme)
        for (let i = 0; i < 5; i++) {
            const key = `citationWidgetColor${i}` as keyof typeof this.COLOR_MAPPINGS;
            cssRules.push(`  ${this.COLOR_MAPPINGS[key]}: ${settings.citationWidgetColor[i]};`);
        }

        // Add widget colors (dark theme)
        for (let i = 0; i < 5; i++) {
            const key = `citationWidgetColorDark${i}` as keyof typeof this.COLOR_MAPPINGS;
            cssRules.push(`  ${this.COLOR_MAPPINGS[key]}: ${settings.citationWidgetColorDark[i]};`);
        }

        cssRules.push('}');
        if (this.styleElement) {
            this.styleElement.textContent = cssRules.join('\n');
        }
    }
    /**
     * Ensure that the style element exists in the document head 
     */
    private static ensureStyleElement(): void {
        if (!this.styleElement) {
            // Remove any existing style element first
            const existing = document.getElementById(this.STYLE_ID);
            if (existing) {
                existing.remove();
            }

            this.styleElement = document.createElement('style');
            this.styleElement.id = this.STYLE_ID;
            document.head.appendChild(this.styleElement);
        }
    }

    /**
     * Update a single color property
     */
    static updateSingleColor(colorKey: keyof EquationCitatorSettings, value: string, settings: EquationCitatorSettings): void {
        // Handle specific color properties with proper type safety
        switch (colorKey) {
            case 'citationColor':
                settings.citationColor = value;
                break;
            case 'citationHoverColor':
                settings.citationHoverColor = value;
                break;
            case 'fileSuperScriptColor':
                settings.fileSuperScriptColor = value;
                break;
            case 'fileSuperScriptHoverColor':
                settings.fileSuperScriptHoverColor = value;
                break;
            case 'citationColorInPdf':
                settings.citationColorInPdf = value;
                break;
            case 'fileSuperScriptColorInPdf':
                settings.fileSuperScriptColorInPdf = value;
                break;
            // Note: citationWidgetColor and citationWidgetColorDark are arrays
            // and should be updated using updateWidgetColor method instead
            default:
                console.warn(`ColorManager: Unsupported color property: ${colorKey}`);
                return;
        }   
        // Update all colors to maintain consistency
        this.updateAllColors(settings);
    }

    /**
     * Update widget color at specific index
     */
    static updateWidgetColor(index: number, value: string, isDark: boolean, settings: EquationCitatorSettings): void {
        if (index < 0 || index >= 5) return;

        if (isDark) {
            settings.citationWidgetColorDark[index] = value;
        } else {
            settings.citationWidgetColor[index] = value;
        }

        this.updateAllColors(settings);
    }

    /**
     * Clean up - remove the style element
     */
    static cleanup(): void {
        if (this.styleElement && this.styleElement.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }

    /**
     * Reset all colors to default values
     */
    static resetAllColors(defaultSettings: EquationCitatorSettings): void {
        this.updateAllColors(defaultSettings);
    }
}