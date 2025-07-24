import EquationCitator from "@/main";

export class Debugger {
    plugin:EquationCitator;
    constructor(plugin: EquationCitator) {
        this.plugin = plugin;
    }
    public log(message: string, ...optionalParams: any[]): void {
        if (this.plugin?.settings.debugMode) {
            console.log(`[DEBUG] ${message}`, ...optionalParams);
        }
    }
}

