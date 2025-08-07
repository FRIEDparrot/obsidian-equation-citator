
import { resolveBackLinks, resolveForwardLinks } from "@/utils/link_utils";

test('should handle malformed resolvedLinks data', () => {
        const malformedData = {
                'file1.md': null,
                'file2.md': 'invalid',
                'file3.md': { 'file4.md': 1 }
        };
        
        expect(resolveBackLinks(malformedData, 'file4.md')).toEqual(['file3.md']);
        expect(resolveForwardLinks(malformedData, 'file1.md')).toEqual([]);
        expect(resolveForwardLinks(malformedData, 'file2.md')).toEqual([]);
});