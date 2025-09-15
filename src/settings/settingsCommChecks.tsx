export function containSafeCharAndNotBlank(s: string): boolean {
    // disallow unsafe characters { }, $  and white space
    return !(s.includes("{") || s.includes("}") || s.includes("$")) && s.trim().length > 0;
}
