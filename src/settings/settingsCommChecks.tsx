export function containSafeCharAndNotBlank(s: string): boolean {
    return !(s.includes("{") || s.includes("}") || s.includes("$")) && s.trim().length > 0;
}
