import { parseEquationsInMarkdown } from "@/utils/equation_utils"; 

describe('parseEquationsInMarkdown', () => {
    test('should handle inline code blocks with backticks', () => {
            const markdown = `
    Normal equation: 
    $$ E = mc^2 \\tag{normal} $$
    Inline code with equation: \`$$ F = ma \\tag{inline} $$\` should be ignored
    Another equation:
    $$ P = F/A \\tag{pressure} $$`;
    
            const equations = parseEquationsInMarkdown(markdown);
            
            expect(equations).toHaveLength(2);
            expect(equations[0].tag).toBe('normal');
            expect(equations[0].content).toBe('E = mc^2 \\tag{normal}');
            expect(equations[1].tag).toBe('pressure');
            expect(equations[1].content).toBe('P = F/A \\tag{pressure}');
            expect(equations.some(eq => eq.tag === 'inline')).toBe(false);
        });
});
