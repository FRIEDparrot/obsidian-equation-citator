export const DISABLED_DELIMITER = `§¶∞&#&@∸∹≑≒≓≔≕≖≗≘≙≚≛≜≝≞≟≠≇≈≉≊≋≌≍≎≏⋤⋥⋦⋧⋨⋩⋪⋫⋬⋭⋮⋯⋰⋱`

/** Change string RegExp to RegExp literal */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// escapeString.ts
export function escapeString(str: string, quoteType: '"' | "'" = '"'): string {
  // eslint-disable-next-line no-control-regex
  const quoteRegex = quoteType === '"' ? /["\\\b\f\n\r\t\v\x00-\x1F\x7F-\x9F]/g : /['\\\b\f\n\r\t\v\x00-\x1F\x7F-\x9F]/g;

  return str.replace(quoteRegex, (char: string) => {
    switch (char) {
      case '\\': return '\\\\';
      case '"': return quoteType === '"' ? '\\"' : '"';
      case "'": return quoteType === "'" ? "\\'" : "'";
      case '\b': return '\\b';
      case '\f': return '\\f';
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '\t': return '\\t';
      case '\v': return '\\v';
      default: return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
    }
  });
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