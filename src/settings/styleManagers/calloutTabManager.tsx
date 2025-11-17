import { EquationCitatorSettings } from "@/settings/defaultSettings";

export class CalloutTableStyleManager {
    private static readonly BODY_CLASS = 'em-center-callout-tables';
    
    static update(settings: EquationCitatorSettings): void {
        const body = document.body;
        if (settings.enableCenterTableInCallout) {
            body.addClass(this.BODY_CLASS);
        } else {
            body.removeClass(this.BODY_CLASS);
        }
    }

    static cleanup(): void {
        document.body.removeClass(this.BODY_CLASS);
    }
}
