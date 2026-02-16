import { EquationMatch } from "@/utils/parsers/equation_parser";

/**
 * Here we use a loose match 
 * @abstract only check if the first non-blank line of equations is start with `\boxed`.
 * @param equation
 * @param enableTypstMode if true, it will check `#box` instead of `\boxed`
 * @param skipFirstLine if true, it will skip first line (only for multi-line equations).
 */
export function boxedEquationFilter(
    equation: EquationMatch,
    enableTypstMode: boolean,
    skipFirstLine: boolean,
): boolean {
    const matchPrefix = enableTypstMode ? "#box" : String.raw`\boxed`;
    const lines = equation.content.split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0);
    if (lines.length === 0) return false;
    const lineIndex = (skipFirstLine && lines.length > 1) ? 1 : 0;
    const targetLine = lines[lineIndex];
    return targetLine.startsWith(matchPrefix);
}