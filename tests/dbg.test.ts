import { autoNumberEquations, AutoNumberingType } from "@/utils/autoNumber";

test('should handle very deep heading levels', () => {
    const content = `# H1
$$ e1 $$
## H2  
$$ e2 $$
### H3
$$ e3 $$
#### H4
$$ e4 $$
##### H5
$$ e5 $$
###### H6
$$ e6 $$`;

    const result = autoNumberEquations(content, AutoNumberingType.Relative, 7, '.', 'P', '');

    expect(result).toContain('$$ e1 \\tag{1.1} $$');
    expect(result).toContain('$$ e2 \\tag{1.1.1} $$');
    expect(result).toContain('$$ e3 \\tag{1.1.1.1} $$');
    expect(result).toContain('$$ e4 \\tag{1.1.1.1.1} $$');
    expect(result).toContain('$$ e5 \\tag{1.1.1.1.1.1} $$');
    expect(result).toContain('$$ e6 \\tag{1.1.1.1.1.1.1} $$');
});

