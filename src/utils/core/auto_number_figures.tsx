import { AutoNumberingType, AutoNumberConfigs, AutoNumberProceedResult } from "./auto_number_utils";
import { parseHeadingsInMarkdown, Heading } from "../parsers/heading_parser";

/**
 * Auto number all the figures in the given markdown content based on the specified configurations.
 * @param content - the markdown content to process 
 * @param configs - the auto-numbering related configurations, including type, depth, delimiter, etc.
 */
export function autoNumberFigures(
    content: string,
    configs: AutoNumberConfigs,
): AutoNumberProceedResult {
    const {
        autoNumberingType,
        maxDepth,
        delimiter,
        noHeadingPrefix,
        globalPrefix,
        parseQuotes
    } = configs;
    const lines = content.split('\n');
    const headings: Heading[] = parseHeadingsInMarkdown(content);

}