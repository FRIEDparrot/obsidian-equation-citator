import { Heading } from "@/utils/parsers/heading_parser";
import { EquationMatch } from "@/utils/parsers/equation_parser";


export type ViewMode = "outline" | "list";
export type SortType = "tag" | "seq";

export interface EquationGroup {
    heading: Heading | null;  // null for no heading 
    equations: EquationMatch[];
    absoluteLevel: number;
    relativeLevel: number;
}
