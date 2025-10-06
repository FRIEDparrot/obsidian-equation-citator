import { find_array } from "@/utils/misc/array_utils";

describe('find_array KMP Algorithm', () => {
    describe('Basic functionality', () => {
        test('should find pattern at the beginning', () => {
            expect(find_array([1, 2, 3], [1, 2, 3, 4, 5])).toBe(0);
            expect(find_array(['a', 'b'], ['a', 'b', 'c', 'd'])).toBe(0);
        });

        test('should find pattern in the middle', () => {
            expect(find_array([2, 3], [1, 2, 3, 4, 5])).toBe(1);
            expect(find_array(['b', 'c'], ['a', 'b', 'c', 'd'])).toBe(1);
        });

        test('should find pattern at the end', () => {
            expect(find_array([4, 5], [1, 2, 3, 4, 5])).toBe(3);
            expect(find_array(['d'], ['a', 'b', 'c', 'd'])).toBe(3);
        });

        test('should find exact match when pattern equals target', () => {
            expect(find_array([1, 2, 3], [1, 2, 3])).toBe(0);
            expect(find_array(['hello'], ['hello'])).toBe(0);
        });

        test('should return -1 when pattern not found', () => {
            expect(find_array([6, 7], [1, 2, 3, 4, 5])).toBe(-1);
            expect(find_array(['x', 'y'], ['a', 'b', 'c', 'd'])).toBe(-1);
        });
    });

    describe('Edge cases', () => {
        test('should handle empty pattern (returns 0)', () => {
            expect(find_array([], [1, 2, 3])).toBe(0);
            expect(find_array([], [])).toBe(0);
            expect(find_array([], ['a', 'b'])).toBe(0);
        });

        test('should handle empty target with non-empty pattern', () => {
            expect(find_array([1], [])).toBe(-1);
            expect(find_array([1, 2, 3], [])).toBe(-1);
        });

        test('should handle both empty arrays', () => {
            expect(find_array([], [])).toBe(0);
        });

        test('should handle pattern longer than target', () => {
            expect(find_array([1, 2, 3, 4, 5], [1, 2, 3])).toBe(-1);
            expect(find_array(['a', 'b', 'c'], ['a', 'b'])).toBe(-1);
        });

        test('should handle single element arrays', () => {
            expect(find_array([1], [1])).toBe(0);
            expect(find_array([1], [2])).toBe(-1);
            expect(find_array([1], [2, 1, 3])).toBe(1);
        });
    });

    describe('Multiple occurrences (should return first)', () => {
        test('should return first occurrence when pattern appears multiple times', () => {
            expect(find_array([1, 2], [1, 2, 3, 1, 2, 4])).toBe(0);
            expect(find_array(['ab'], ['ab', 'cd', 'ab', 'ef'])).toBe(0);
        });

        test('should handle overlapping patterns correctly', () => {
            // Pattern "aba" in "ababa" should match at index 0, not 2
            expect(find_array(['a', 'b', 'a'], ['a', 'b', 'a', 'b', 'a'])).toBe(0);
        });
    });

    describe('Repeating patterns and KMP-specific cases', () => {
        test('should handle patterns with internal repetition', () => {
            expect(find_array(['a', 'b', 'a', 'b'], ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b'])).toBe(0);
            expect(find_array(['a', 'a', 'a'], ['a', 'a', 'b', 'a', 'a', 'a'])).toBe(3);
        });

        test('should handle patterns with prefix-suffix overlap', () => {
            // This tests the core KMP optimization
            expect(find_array(['a', 'b', 'a', 'b', 'a'], ['a', 'b', 'a', 'b', 'c', 'a', 'b', 'a', 'b', 'a'])).toBe(5);
        });

        test('should handle highly repetitive patterns', () => {
            expect(find_array(['a', 'a', 'a'], ['a', 'a', 'a', 'a', 'a'])).toBe(0);
            expect(find_array(['a', 'a', 'b'], ['a', 'a', 'a', 'a', 'b'])).toBe(2);
        });

        test('should handle alternating patterns', () => {
            expect(find_array(['a', 'b', 'a', 'b'], ['a', 'b', 'a', 'c', 'a', 'b', 'a', 'b'])).toBe(4);
        });
    });

    describe('Different data types', () => {
        test('should work with strings', () => {
            expect(find_array(['hello'], ['hi', 'hello', 'world'])).toBe(1);
            expect(find_array(['not', 'found'], ['hello', 'world'])).toBe(-1);
        });

        test('should work with numbers', () => {
            expect(find_array([3.14, 2.71], [1.41, 3.14, 2.71, 1.73])).toBe(1);
            expect(find_array([0, -1], [1, 0, -1, 2])).toBe(1);
        });

        test('should work with mixed types', () => {
            expect(find_array([1, 'a'], [0, 1, 'a', 2])).toBe(1);
            expect(find_array([null, undefined], [1, null, undefined, 2])).toBe(1);
        });

        test('should work with objects (reference equality)', () => {
            const obj1 = { id: 1 };
            const obj2 = { id: 2 };
            const obj3 = { id: 1 }; // Different reference than obj1
            
            expect(find_array([obj1], [obj2, obj1, obj3])).toBe(1);
            expect(find_array([obj1], [obj2, obj3])).toBe(-1); // Different reference
        });

        test('should work with boolean values', () => {
            expect(find_array([true, false], [false, true, false, true])).toBe(1);
            expect(find_array([false, false], [true, false, false])).toBe(1);
        });
    });

    describe('Performance and stress tests', () => {
        test('should handle large arrays efficiently', () => {
            // Create a large target with pattern at the end
            const largeTarget = new Array(10000).fill(0);
            largeTarget.push(1, 2, 3);
            
            const result = find_array([1, 2, 3], largeTarget);
            expect(result).toBe(10000);
        });

        test('should handle worst-case KMP scenario', () => {
            // Worst case: pattern is almost found multiple times before actual match
            const pattern = ['a', 'a', 'a', 'b'];
            const target = ['a', 'a', 'a', 'a', 'a', 'a', 'a', 'b'];
            
            expect(find_array(pattern, target)).toBe(4);
        });

        test('should handle long repetitive sequences', () => {
            const pattern = new Array(100).fill('a');
            const target = [...new Array(200).fill('b'), ...pattern];
            
            expect(find_array(pattern, target)).toBe(200);
        });
    });

    describe('Boundary conditions', () => {
        test('should handle pattern of length 1', () => {
            expect(find_array(['x'], ['a', 'b', 'x', 'c'])).toBe(2);
            expect(find_array(['z'], ['a', 'b', 'c'])).toBe(-1);
        });

        test('should handle target of length 1', () => {
            expect(find_array(['a'], ['a'])).toBe(0);
            expect(find_array(['a'], ['b'])).toBe(-1);
            expect(find_array(['a', 'b'], ['a'])).toBe(-1);
        });

        test('should handle identical repeated elements', () => {
            expect(find_array([1, 1], [1, 1, 1, 1])).toBe(0);
            expect(find_array([2, 2, 2], [1, 2, 2, 2, 1])).toBe(1);
        });
    });

    describe('Complex KMP scenarios', () => {
        test('should handle pattern with complex prefix-suffix relationship', () => {
            // Pattern: "abcabcab" should efficiently skip when partially matched
            const pattern = ['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b'];
            const target = ['a', 'b', 'c', 'a', 'b', 'c', 'a', 'c', 'a', 'b', 'c', 'a', 'b', 'c', 'a', 'b'];
            
            expect(find_array(pattern, target)).toBe(8);
        });

        test('should handle partial matches followed by mismatch', () => {
            const pattern = ['a', 'b', 'c', 'd'];
            const target = ['a', 'b', 'c', 'a', 'b', 'c', 'd'];
            
            expect(find_array(pattern, target)).toBe(3);
        });

        test('should handle patterns with no proper prefix-suffix overlap', () => {
            const pattern = ['a', 'b', 'c', 'd'];
            const target = ['x', 'y', 'a', 'b', 'c', 'd', 'z'];
            
            expect(find_array(pattern, target)).toBe(2);
        });
    });

    describe('Special characters and edge values', () => {
        test('should handle undefined and null values', () => {
            expect(find_array([null], [1, null, 2])).toBe(1);
            expect(find_array([undefined], [1, undefined, 2])).toBe(1);
            expect(find_array([null, undefined], [null, undefined, 1])).toBe(0);
        });

        test('should handle zero and negative numbers', () => {
            expect(find_array([0], [1, 0, -1])).toBe(1);
            expect(find_array([-1, -2], [0, -1, -2, 1])).toBe(1);
        });

        test('should handle NaN values', () => {
            expect(find_array([NaN], [1, NaN, 2])).toBe(-1); // NaN !== NaN
        });
    });
});