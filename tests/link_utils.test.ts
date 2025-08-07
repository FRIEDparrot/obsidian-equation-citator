import { resolveBackLinks, resolveForwardLinks } from "@/utils/link_utils";

describe('Link Resolver Functions', () => {
  // Mocked data structure for resolvedLinks
  const mockResolvedLinks = {
    'file1.md': {
      'file2.md': 2,  // file1 links to file2, with 2 links
      'file3.md': 1   // file1 links to file3, with 1 link
    },
    'file2.md': {
      'file3.md': 1,  // file2 links to file3
      'file4.md': 3   // file2 links to file4, with 3 links
    },
    'file3.md': {
      'file1.md': 1   // file3 links to file1
    },
    'file4.md': {},   // file4 has no outbound links
    'file5.md': {
      'file2.md': 1   // file5 links to file2
    }
  };

  describe('resolveBackLinks', () => {
    test('should return files that link to the target file', () => {
      const result = resolveBackLinks(mockResolvedLinks, 'file2.md');
      expect(result).toEqual(expect.arrayContaining(['file1.md', 'file5.md']));
      expect(result).toHaveLength(2);
    });

    test('should return files that link to file3.md', () => {
      const result = resolveBackLinks(mockResolvedLinks, 'file3.md');
      expect(result).toEqual(expect.arrayContaining(['file1.md', 'file2.md']));
      expect(result).toHaveLength(2);
    });

    test('should return a single file for file with no backlinks', () => {
      const result = resolveBackLinks(mockResolvedLinks, 'file4.md');
      expect(result).toEqual(['file2.md']);
      expect(result).toHaveLength(1);
    });

    test('should return empty array for non-existent file', () => {
      const result = resolveBackLinks(mockResolvedLinks, 'nonexistent.md');
      expect(result).toEqual([]);
    });

    test('should handle null/undefined inputs', () => {
      expect(resolveBackLinks(null, 'file1.md')).toEqual([]);
      expect(resolveBackLinks(mockResolvedLinks, null)).toEqual([]);
      expect(resolveBackLinks(undefined, 'file1.md')).toEqual([]);
    });

    test('should handle empty resolvedLinks object', () => {
      const result = resolveBackLinks({}, 'file1.md');
      expect(result).toEqual([]);
    });
  });

  describe('resolveForwardLinks', () => {
    test('should return files that the source file links to', () => {
      const result = resolveForwardLinks(mockResolvedLinks, 'file1.md');
      expect(result).toEqual(expect.arrayContaining(['file2.md', 'file3.md']));
      expect(result).toHaveLength(2);
    });

    test('should return forward links for file2.md', () => {
      const result = resolveForwardLinks(mockResolvedLinks, 'file2.md');
      expect(result).toEqual(expect.arrayContaining(['file3.md', 'file4.md']));
      expect(result).toHaveLength(2);
    });

    test('should return empty array for file with no forward links', () => {
      const result = resolveForwardLinks(mockResolvedLinks, 'file4.md');
      expect(result).toEqual([]);
    });

    test('should return empty array for non-existent file', () => {
      const result = resolveForwardLinks(mockResolvedLinks, 'nonexistent.md');
      expect(result).toEqual([]);
    });

    test('should handle null/undefined inputs', () => {
      expect(resolveForwardLinks(null, 'file1.md')).toEqual([]);
      expect(resolveForwardLinks(mockResolvedLinks, null)).toEqual([]);
      expect(resolveForwardLinks(undefined, 'file1.md')).toEqual([]);
    });

    test('should handle empty resolvedLinks object', () => {
      const result = resolveForwardLinks({}, 'file1.md');
      expect(result).toEqual([]);
    });
  });

  describe('Integration tests', () => {
    test('should correctly identify bidirectional links', () => {
      // file1 links to file3, and file3 links back to file1
      const file1Forward = resolveForwardLinks(mockResolvedLinks, 'file1.md');
      const file1Back = resolveBackLinks(mockResolvedLinks, 'file1.md');

      expect(file1Forward).toContain('file3.md');
      expect(file1Back).toContain('file3.md');
    });

    test('should handle complex link relationships', () => {
      // Validate complex link relationships
      const file3Back = resolveBackLinks(mockResolvedLinks, 'file3.md');
      const file3Forward = resolveForwardLinks(mockResolvedLinks, 'file3.md');

      // file3 is linked from file1 and file2
      expect(file3Back).toEqual(expect.arrayContaining(['file1.md', 'file2.md']));
      // file3 links to file1
      expect(file3Forward).toEqual(['file1.md']);
    });
  });

  describe('Edge cases', () => {
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

    test('should handle files with zero link counts', () => {
      const dataWithZeros = {
        'file1.md': {
          'file2.md': 0,  // zero links
          'file3.md': 1
        }
      };

      const result = resolveForwardLinks(dataWithZeros, 'file1.md');
      expect(result).toContain('file2.md'); // even if links count is zero, still considered linked
      expect(result).toContain('file3.md');
    });
  });
});