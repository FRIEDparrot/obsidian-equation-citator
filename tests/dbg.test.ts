import { matchNestedCitation } from "@/utils/string_processing/regexp_utils";
describe('Edge cases', () => {
    it('should handle multiple refs (return null)', () => {
        const result = matchNestedCitation('\\ref{eq:1} \\ref{eq:2}', null);
        expect(result).toBeNull();
    });
});
