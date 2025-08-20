import {
  inlineMathPattern,
  matchNestedCitation,
  matchCitationsInLine,
  isValidCitationForm,
  createCitationString,
  createEquationTagString,
  codeBlockStartRegex,
  isCodeBlockToggle,
  footnoteRegex
} from '@/utils/regexp_utils';

describe('Regexp Utils Functions', () => {
  describe('codeBlockStartRegex', () => {
    it('should match code block start', () => {
      expect(codeBlockStartRegex.test('```')).toBe(true);
      expect(codeBlockStartRegex.test(' > ```')).toBe(true);
      expect(codeBlockStartRegex.test('  >  > ```')).toBe(true);
      expect(codeBlockStartRegex.test('normal text')).toBe(false);
    });
  });

  describe('isCodeBlockToggle', () => {
    it('should detect code block toggle', () => {
      expect(isCodeBlockToggle('```')).toBe(true);
      expect(isCodeBlockToggle(' > ```')).toBe(true);
      expect(isCodeBlockToggle('```\ncode\n```')).toBe(false);
      expect(isCodeBlockToggle('normal text')).toBe(false);
    });
  });

  describe('footnoteRegex', () => {
    it('should match footnote pattern', () => {
      const match1 = '[^note]: [[target]]'.match(footnoteRegex);
      if (!match1) {
        throw new Error('Failed to match equation tag');
      }
      expect(match1[1]).toBe('^note');
      expect(match1[2]).toBe('target');
      expect(match1[3]).toBeUndefined();

      const match2 = '[^note]: [[target|alias]]'.match(footnoteRegex);
      if (!match2) {
        throw new Error('Failed to match equation tag');
      }
      expect(match2[3]).toBe('alias');
    });
  });

  describe('inlineMathPattern', () => {
    it('should match basic inline math', () => {
      const matches = [...'$x + y$'.matchAll(inlineMathPattern)];
      expect(matches[0][1]).toBe('x + y');
    });

    it('should not match display math', () => {
      const matches = [...'$$x + y$$'.matchAll(inlineMathPattern)];
      expect(matches.length).toBe(0);
    });
  });

  describe('matchNestedCitation', () => {
    describe('Basic cases', () => {
      it('should parse simple citation', () => {
        const result = matchNestedCitation('\\ref{eq:1.2.3}', 'eq:');
        expect(result).toEqual({
          content: '\\ref{eq:1.2.3}',
          label: '1.2.3'
        });
      });

      it('should handle empty ref content', () => {
        const result = matchNestedCitation('\\ref{}', null);
        expect(result).toEqual({
          content: '\\ref{}',
          label: ''
        });
      });
      
      it ('should handle combined form', ()=> {
        const result = matchNestedCitation('\\ref{eq:1.1} \\ref{}', 'eq:');
        expect(result).toBeNull();
      });
    });

    describe('Nested braces', () => {
      it('should handle single level nesting', () => {
        const result = matchNestedCitation('\\ref{eq:1^{1.2.3}}');
        expect(result?.label).toBe('eq:1^{1.2.3}');
      });

      it('should handle multiple levels nesting', () => {
        const result = matchNestedCitation('\\ref{eq:1^{2^{3^{4}}}}');
        expect(result?.label).toBe('eq:1^{2^{3^{4}}}');
      });

      it('should handle mixed nested content', () => {
        const result = matchNestedCitation('\\ref{eq:1^{a,b}, 2^{x,y}}');
        expect(result?.label).toBe('eq:1^{a,b}, 2^{x,y}');
      });
    });

    describe('Complex content', () => {
      it('should handle special characters', () => {
        const result = matchNestedCitation('\\ref{eq:α²+β³=γ⁴}');
        expect(result?.label).toBe('eq:α²+β³=γ⁴');
      });

      it('should handle math symbols', () => {
        const result = matchNestedCitation('\\ref{eq:$x_1 + y_2$}');
        expect(result?.label).toBe('eq:$x_1 + y_2$');
      });

      it('should handle escaped braces', () => {
        const result = matchNestedCitation('\\ref{eq:\\{a\\}}');
        expect(result?.label).toBe('eq:\\{a\\}');
      });
    });

    describe('Edge cases', () => {
      it('should handle text before ref', () => {
        const result = matchNestedCitation('text \\ref{eq:1} text');
        expect(result?.label).toBe('eq:1');
      });

      it('should handle multiple refs (return null)', () => {
        const result = matchNestedCitation('\\ref{eq:1} \\ref{eq:2}');
        expect(result).toBeNull();
      });

      it('should handle very long labels', () => {
        const longLabel = 'a'.repeat(500);
        const result = matchNestedCitation(`\\ref{eq:${longLabel}}`);
        expect(result?.label).toBe(`eq:${longLabel}`);
      });
    });

    describe('Invalid cases', () => {
      it('should return null for empty string', () => {
        expect(matchNestedCitation('')).toBeNull();
      });

      it('should return null for no ref pattern', () => {
        expect(matchNestedCitation('just text')).toBeNull();
      });

      it('should return null for unclosed brace', () => {
        expect(matchNestedCitation('\\ref{eq:1')).toBeNull();
      });

      it('should extract first ref only', () => {
        const match = matchNestedCitation('\\ref{eq:1} extra}');
        expect(match?.label).toBe(`eq:1`);
        expect(match?.content).toBe(`\\ref{eq:1}`);
      });

      it('should return null for too deeply nested', () => {
        const deepNested = '\\ref{' + '{'.repeat(20) + 'a' + '}'.repeat(20);
        expect(matchNestedCitation(deepNested)).toBeNull();
      });
    });
  });

  describe('matchCitationsInLine', () => {
    describe('Basic cases', () => {
      it('should find single citation', () => {
        const results = matchCitationsInLine('See $\\ref{eq:1}$');
        expect(results).toHaveLength(1);
        expect(results[0].label).toBe('eq:1');
      });

      it('should find multiple citations', () => {
        const results = matchCitationsInLine('See $\\ref{eq:1}$ and $\\ref{eq:2}$');
        expect(results).toHaveLength(2);
        expect(results[0].label).toBe('eq:1');
        expect(results[1].label).toBe('eq:2');
      });
    });

    describe('Complex math expressions', () => {
      it('should find citation in complex math', () => {
        const results = matchCitationsInLine('$f(x) = \\ref{eq:1} + x^2$');
        expect(results).toHaveLength(1);
      });

      it('should ignore math without citations', () => {
        const results = matchCitationsInLine('$x + y = z$');
        expect(results).toHaveLength(0);
      });

      it('should handle mixed math and citations', () => {
        const results = matchCitationsInLine('$x + \\ref{eq:1} = y$');
        expect(results).toHaveLength(1);
      });
    });

    describe('Nested citations', () => {
      it('should handle nested citations', () => {
        const results = matchCitationsInLine('See $\\ref{eq:1^{1.2.3}}$');
        expect(results[0].label).toBe('eq:1^{1.2.3}');
      });

      it('should ignore multiple nested citations', () => {
        const results = matchCitationsInLine('$\\ref{eq:1^{a}} + \\ref{eq:2^{b}}$');
        expect(results).toHaveLength(0);
      });
    });

    describe('Edge cases', () => {
      it('should handle citations at line start/end', () => {
        const results = matchCitationsInLine('$\\ref{eq:1}$ text $\\ref{eq:2}$');
        expect(results).toHaveLength(2);
      });

      it('should handle empty line', () => {
        expect(matchCitationsInLine('')).toHaveLength(0);
      });

      it('should handle line with only math', () => {
        const results = matchCitationsInLine('$\\ref{eq:1}$');
        expect(results).toHaveLength(1);
      });

      it('should ignore invalid citations', () => {
        const results = matchCitationsInLine('$\\ref{eq:1} + \\ref{eq:2}$');
        expect(results).toHaveLength(0);
      });
    });

    describe('Special characters', () => {
      it('should handle Unicode characters', () => {
        const results = matchCitationsInLine('$\\ref{eq:α→β}$');
        expect(results[0].label).toBe('eq:α→β');
      });

      it('should handle special math symbols', () => {
        const results = matchCitationsInLine('$\\ref{eq:∂f/∂x}$');
        expect(results[0].label).toBe('eq:∂f/∂x');
      });
    });
  });

  describe('isValidCitationForm', () => {
    it('should validate citation forms', () => {
      expect(isValidCitationForm('\\ref{eq:1}').valid).toBe(true);
      expect(isValidCitationForm('\\ref{eq:1} + \\ref{eq:2}').valid).toBe(false);
      expect(isValidCitationForm('\\ref{eq:1}', 'eq:').valid).toBe(true);
      expect(isValidCitationForm('\\ref{fig:1}', 'eq:').valid).toBe(false);
    });
  });

  describe('createCitationString', () => {
    it('should create citation strings', () => {
      expect(createCitationString('eq:1')).toBe('$\\ref{eq:1}$');
      expect(createCitationString('eq:1', 'content')).toBe('$\\ref{eq:1content}$');
    });
  });

  describe('createEquationTagString', () => {
    it('should create tag strings', () => {
      expect(createEquationTagString('1.1')).toBe('\\tag{1.1}');
    });
  });
}); 
