/**
 * Static Debugger class for debugging purposes.  
 */
export default class Debugger {
    private static _debugMode = true; // when developing, set here to true for convenience 
    public static get debugMode(): boolean {
        return Debugger._debugMode;
    }

    public static  set debugMode(value: boolean) {
        Debugger._debugMode = value;
    }

    public static log(message: string, ...optionalParams: any[]): void {
        if (Debugger._debugMode) {
            console.log(`[DEBUG] ${message}`, ...optionalParams);
        }
    }

    public static warning(message: string, ...optionalParams: any[]): void {
        if (Debugger._debugMode) {
            console.warn(`[WARNING] ${message}`, ...optionalParams);
        }
    }

    public static error(message: string, ...optionalParams: any[]): void {
        if (Debugger._debugMode) {
            console.error(`[ERROR] ${message}`, ...optionalParams);
        }
    }
}