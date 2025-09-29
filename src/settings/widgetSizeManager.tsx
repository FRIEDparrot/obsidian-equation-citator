import { EquationCitatorSettings } from "@/settings/settingsTab";

export enum WidgetSizeVariable {
    ContainerWidth = '--em-citation-popover-container-width',
    ContainerHeight = '--em-citation-popover-container-height',
}

export class WidgetSizeManager {
    private static styleElement: HTMLStyleElement | null = null;
    private static readonly STYLE_ID = 'equation-citator-sizes';

    /**
     * Set a CSS size variable
     */
    static set(variable: WidgetSizeVariable, size: number): void {
        this.ensureStyleElement();

        const cssVariable = variable;
        const cssValue = `${size}px`;

        if (this.styleElement) {
            // Get existing content or create new
            let existingRules = this.styleElement.textContent || ':root {\n}';

            // Remove existing rule for this variable if it exists
            const variableRegex = new RegExp(`\\s*${cssVariable}:[^;]*;`, 'g');
            existingRules = existingRules.replace(variableRegex, '');

            // Add new rule before the closing brace
            const newRule = `  ${cssVariable}: ${cssValue};`;
            existingRules = existingRules.replace('}', `${newRule}\n}`);
            this.styleElement.textContent = existingRules;
        }
    }

    /**
     * Set multiple size variables at once
     */
    static setMultiple(sizes: Record<WidgetSizeVariable, number>): void {
        this.ensureStyleElement();

        const cssRules: string[] = [':root {'];

        // Add each size rule
        Object.entries(sizes).forEach(([key, value]) => {
            const cssVariable = key as WidgetSizeVariable;
            if (cssVariable && typeof value === 'number') {
                cssRules.push(`  ${cssVariable}: ${value}px;`);
            }
        });
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
     * Clean up - remove the style element
     */
    public static cleanUp(): void {
        if (this.styleElement && this.styleElement.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }

    public static resetAllSizes(defaultSettings: EquationCitatorSettings): void {
        this.setMultiple({
            [WidgetSizeVariable.ContainerWidth]: defaultSettings.citationPopoverContainerWidth,
            [WidgetSizeVariable.ContainerHeight]: defaultSettings.citationPopoverContainerHeight,
        });
    }

    public static updateAllSizes(settings: EquationCitatorSettings): void {
        this.setMultiple({
            [WidgetSizeVariable.ContainerWidth]: settings.citationPopoverContainerWidth,
            [WidgetSizeVariable.ContainerHeight]: settings.citationPopoverContainerHeight,
        });
    }
}