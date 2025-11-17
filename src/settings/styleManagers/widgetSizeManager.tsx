import { EquationCitatorSettings } from "@/settings/defaultSettings";

export enum WidgetSize {
    ExtraSmall = 'xs',
    Small = 'sm',
    Medium = 'md',
    Large = 'lg',
    ExtraLarge = 'xl'
}

export const WIDGET_SIZE_LABELS: Record<WidgetSize, string> = {
    [WidgetSize.ExtraSmall]: 'Extra Small (350×300)',
    [WidgetSize.Small]: 'Small (425×350)',
    [WidgetSize.Medium]: 'Medium (500×400)',
    [WidgetSize.Large]: 'Large (600×500)',
    [WidgetSize.ExtraLarge]: 'Extra Large (750×600)'
};

export class WidgetSizeManager {
    private static currentSize: WidgetSize = WidgetSize.Medium;

    /**
     * Get the CSS class name for a widget size
     */
    static getClassName(size: WidgetSize): string {
        return `em-widget-size-${size}`;
    }

    /**
     * Get the current widget size class name
     */
    static getCurrentClassName(): string {
        return this.getClassName(this.currentSize);
    }

    /**
     * Set the widget size
     */
    static setSize(size: WidgetSize): void {
        this.currentSize = size;
    }

    /**
     * Get the current widget size
     */
    static getSize(): WidgetSize {
        return this.currentSize;
    }

    /**
     * Update widget size from settings
     */
    static updateFromSettings(settings: EquationCitatorSettings): void {
        const sizeStr = settings.citationPopoverSize || 'md';
        this.currentSize = sizeStr as WidgetSize;
    }

    /**
     * No cleanup needed since we're using CSS classes
     */
    public static cleanUp(): void {
        // No-op: CSS classes don't need cleanup
    }
}