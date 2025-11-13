import { EquationCitatorSettings } from "@/settings/defaultSettings";

export class CalloutTableStyleManager {
    private static styleElement: HTMLStyleElement | null = null;
    private static readonly STYLE_ID = 'equation-citator-callout-table-style';
    
    static update(settings: EquationCitatorSettings): void {
        this.ensureStyleElement();
        const css = settings.enableCenterTableInCallout
            ? `.callout table { margin-left: auto; margin-right: auto; }`
            : `.callout table { margin-left: initial; margin-right: initial; }`;
        if (this.styleElement) this.styleElement.textContent = css;
    }
    
    private static ensureStyleElement(): void {
        if (!this.styleElement) {
            const existing = document.getElementById(this.STYLE_ID);
            if (existing) existing.remove();

            this.styleElement = document.createElement('style');
            this.styleElement.id = this.STYLE_ID;
            document.head.appendChild(this.styleElement);
        }
    }

    static cleanup(): void {
        if (this.styleElement?.parentNode) {
            this.styleElement.parentNode.removeChild(this.styleElement);
            this.styleElement = null;
        }
    }
}
