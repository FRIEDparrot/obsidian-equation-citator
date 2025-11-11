/**
 * Static Debugger class for debugging purposes.  
 */
export default class Debugger {
    private static _debugMode = false; // when developing, set here to true for convenience 
    public static get debugMode(): boolean {
        return Debugger._debugMode;
    }

    public static set debugMode(value: boolean) {
        Debugger._debugMode = value;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static log(message: string, ...optionalParams: any[]): void {
        if (Debugger._debugMode) {
            console.log(`[DEBUG] ${message}`, ...optionalParams);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static warning(message: string, ...optionalParams: any[]): void {
        if (Debugger._debugMode) {
            console.warn(`[WARNING] ${message}`, ...optionalParams);
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static error(message: string, ...optionalParams: any[]): void {
        if (Debugger._debugMode) {
            console.error(`[ERROR] ${message}`, ...optionalParams);
        }
    }
}
