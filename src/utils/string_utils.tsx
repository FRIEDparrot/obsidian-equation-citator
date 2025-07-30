
/** Change string RegExp to RegExp literal */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


export function validateDelimiter(delimiter: string): boolean {
    // only allow special characters as delimiters  
    return /^[^a-zA-Z0-9\s]+$/.test(delimiter);
}

export function validLetterPrefix(prefix: string): boolean {
    return /^[a-zA-Z]+$/.test(prefix);
}

export function validateEquationDisplayFormat(format: string): boolean {
    // must contain only one `#` symbol
    return format.split("#").length === 2;
}