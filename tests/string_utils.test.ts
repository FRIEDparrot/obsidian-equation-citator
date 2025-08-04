// escapeString.test.ts
import { escapeString, processQuoteLine, isInInlineMathEnvironment, findLastUnescapedDollar } from "@/utils/string_utils";

describe('escapeString', () => {
  it('should escape backslashes', () => {
    expect(escapeString('a\\b')).toBe('a\\\\b');
  });

  it('should escape double quotes when quoteType is "', () => {
    expect(escapeString('He said "Hello"', '"')).toBe('He said \\"Hello\\"');
  });

  it('should escape single quotes when quoteType is \'', () => {
    expect(escapeString("It's fine", "'")).toBe("It\\'s fine");
  });

  it('should not escape single quotes when quoteType is "', () => {
    expect(escapeString("It's fine", '"')).toBe("It's fine");
  });

  it('should escape newline, tab, and carriage return', () => {
    expect(escapeString('a\nb\tc\rd')).toBe('a\\nb\\tc\\rd');
  });

  it('should escape backspace, form feed, vertical tab', () => {
    expect(escapeString('\b\f\v')).toBe('\\b\\f\\v');
  });

  it('should escape mixed control characters', () => {
    const input = '\x01\x02\x1F\x7F';
    expect(escapeString(input)).toBe(
      '\\u0001\\u0002\\u001f\\u007f'
    );
  });

  it('should escape quoteType correctly when both quotes appear', () => {
    const input = `She said: "Don't worry"`;
    expect(escapeString(input, '"')).toBe(`She said: \\"Don't worry\\"`);
    expect(escapeString(input, "'")).toBe(`She said: "Don\\'t worry"`);
  });

  it('should not alter printable characters', () => {
    const input = 'ABC xyz 123 ~!@#$%^&*()_+';
    expect(escapeString(input)).toBe(input);
  });

  it('should escape null character (\\x00)', () => {
    expect(escapeString('null:\x00')).toBe('null:\\u0000');
  });

  it('should escape delete (\\x7F) and control chars (\\x9F)', () => {
    const input = '\x7F \x9F';
    expect(escapeString(input)).toBe('\\u007f \\u009f');
  });
});

describe('processQuoteLine', () => {
  test('should handle non-quoted lines', () => {
    expect(processQuoteLine('normal text')).toEqual({
      content: 'normal text',
      quoteDepth: 0,
      isQuote: false
    });
  });

  test('should handle simple quoted lines', () => {
    expect(processQuoteLine('> quoted text')).toEqual({
      content: 'quoted text',
      quoteDepth: 1,
      isQuote: true
    });
  });

  test('should handle nested quotes', () => {
    expect(processQuoteLine('>> double quoted')).toEqual({
      content: 'double quoted',
      quoteDepth: 2,
      isQuote: true
    });
  });

  test('should handle quotes with spaces', () => {
    expect(processQuoteLine(' > > spaced quotes ')).toEqual({
      content: 'spaced quotes',
      quoteDepth: 2,
      isQuote: true
    });
  });

  test('should handle quotes with callouts', () => {
    expect(processQuoteLine('> [!note] callout text')).toEqual({
      content: '[!note] callout text',
      quoteDepth: 1,
      isQuote: true
    });
  });

  test('should handle mixed spaces and quotes with callouts', () => {
    expect(processQuoteLine(' > > [!warning] mixed callout ')).toEqual({
      content: '[!warning] mixed callout',
      quoteDepth: 2,
      isQuote: true
    });
  });

  test('should handle empty lines', () => {
    expect(processQuoteLine('')).toEqual({
      content: '',
      quoteDepth: 0,
      isQuote: false
    });
  });

  test('should handle lines with only quote markers', () => {
    expect(processQuoteLine('>>>')).toEqual({
      content: '',
      quoteDepth: 3,
      isQuote: true
    });
  });

  test('should preserve content after complex quote patterns', () => {
    expect(processQuoteLine(' > > >  deep quote with text ')).toEqual({
      content: 'deep quote with text',
      quoteDepth: 3,
      isQuote: true
    });
  });
});

describe('isInInlineMathEnvironment', () => {
  describe('Basic formula detection', () => {
    test('should recognize valid math environments', () => {
      expect(isInInlineMathEnvironment('$123$', 1)).toBe(true);
      expect(isInInlineMathEnvironment('$123$', 2)).toBe(true);
      expect(isInInlineMathEnvironment('$123$', 3)).toBe(true);
    });
    test('should exclude formula boundary positions', () => {
      expect(isInInlineMathEnvironment('$123$', 0)).toBe(false); // opening $
      expect(isInInlineMathEnvironment('$123$', 4)).toBe(true);  // closing $
      expect(isInInlineMathEnvironment('$123$', 5)).toBe(false); // after $
    });

    test('should handle empty formulas', () => {
      expect(isInInlineMathEnvironment('$$', 0)).toBe(false);
      expect(isInInlineMathEnvironment('$$', 1)).toBe(false);
    });
  });

  describe('Whitespace handling', () => {
    test('should reject cases with space after $', () => {
      expect(isInInlineMathEnvironment('$ 123$', 1)).toBe(false);
      expect(isInInlineMathEnvironment('$ 123$', 2)).toBe(false);
      expect(isInInlineMathEnvironment('$ 123$', 3)).toBe(false);
    });

    test('should reject cases with space before $', () => {
      expect(isInInlineMathEnvironment('$123 $', 1)).toBe(false);
      expect(isInInlineMathEnvironment('$123 $', 2)).toBe(false);
      expect(isInInlineMathEnvironment('$123 $', 3)).toBe(false);
    });

    test('should reject cases with spaces on both sides', () => {
      expect(isInInlineMathEnvironment('$ 123 $', 2)).toBe(false);
      expect(isInInlineMathEnvironment('$ 123 $', 3)).toBe(false);
      expect(isInInlineMathEnvironment('$ 123 $', 4)).toBe(false);
    });
  });

  describe('Multiple formulas', () => {
    test('should correctly handle multiple independent formulas', () => {
      const line = '$a$ and $b$';
      expect(isInInlineMathEnvironment(line, 1)).toBe(true);  // in $a$
      expect(isInInlineMathEnvironment(line, 3)).toBe(false); // in ' and '
      expect(isInInlineMathEnvironment(line, 5)).toBe(false); // in ' and '
      expect(isInInlineMathEnvironment(line, 9)).toBe(true);  // in $b$
    });

    test('should handle consecutive formulas', () => {
      const line = '$a$$b$';
      expect(isInInlineMathEnvironment(line, 1)).toBe(true);  // in $a$
      expect(isInInlineMathEnvironment(line, 4)).toBe(true);  // in $b$
    });
  });

  describe('Code block handling', () => {
    test('should ignore $ symbols within code blocks', () => {
      const line = '`$not math$` text';
      expect(isInInlineMathEnvironment(line, 2)).toBe(false); // $ inside code block
      expect(isInInlineMathEnvironment(line, 6)).toBe(false); // code block content
      expect(isInInlineMathEnvironment(line, 10)).toBe(false); // $ inside code block
    });

    test('should correctly handle math environments after code blocks', () => {
      const line = '`$not math$` $real math$';
      expect(isInInlineMathEnvironment(line, 5)).toBe(false);  // inside code block
      expect(isInInlineMathEnvironment(line, 19)).toBe(true);  // in real math environment
    });

    test('should handle multiple code blocks', () => {
      const line = '`code1` $math$ `code2`';
      expect(isInInlineMathEnvironment(line, 3)).toBe(false);  // first code block
      expect(isInInlineMathEnvironment(line, 11)).toBe(true);  // math environment
      expect(isInInlineMathEnvironment(line, 18)).toBe(false); // second code block
    });

    test('should handle nested backticks', () => {
      const line = '`code with \\` inside` $math$';
      expect(isInInlineMathEnvironment(line, 10)).toBe(false); // inside code block
      expect(isInInlineMathEnvironment(line, 25)).toBe(true);  // math environment
    });
  });

  describe('Escape handling', () => {
    test('should ignore escaped $ symbols', () => {
      expect(isInInlineMathEnvironment('\\$not math\\$', 5)).toBe(false);
    });

    test('should handle mixed escaped and real $ symbols', () => {
      const line = '\\$escaped\\$ $real math$';
      expect(isInInlineMathEnvironment(line, 5)).toBe(false);  // escaped area
      expect(isInInlineMathEnvironment(line, 19)).toBe(true);  // real math environment
    });

    test('should handle escaped backslashes', () => {
      const line = '\\\\$math$'; // \\$math$ - escaped \ plus math environment
      expect(isInInlineMathEnvironment(line, 5)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty strings', () => {
      expect(isInInlineMathEnvironment('', 0)).toBe(false);
    });

    test('should handle out-of-bound positions', () => {
      expect(isInInlineMathEnvironment('$math$', -1)).toBe(false);
      expect(isInInlineMathEnvironment('$math$', 10)).toBe(false);
    });

    test('should handle single $ symbol', () => {
      expect(isInInlineMathEnvironment('$', 0)).toBe(false);
      expect(isInInlineMathEnvironment('text $ text', 5)).toBe(false);
    });

    test('should handle odd number of $ symbols', () => {
      expect(isInInlineMathEnvironment('$a$b$', 2)).toBe(true);  // in $a$
      expect(isInInlineMathEnvironment('$a$b$', 3)).toBe(false); // in b, not math environment
      expect(isInInlineMathEnvironment('$a$b$', 4)).toBe(false); // last $ has no match
    });
  });

  describe('Complex scenarios', () => {
    test('should handle math environments with special characters', () => {
      const line = '$\\alpha + \\beta = \\gamma$';
      expect(isInInlineMathEnvironment(line, 10)).toBe(true);
    });

    test('should handle math environments with nested parentheses', () => {
      const line = '$f(x) = {a \\over b}$';
      expect(isInInlineMathEnvironment(line, 8)).toBe(true);
    });

    test('should handle mixed content', () => {
      const line = 'text `code $fake$` more text $real^{math}$ end';
      expect(isInInlineMathEnvironment(line, 12)).toBe(false); // fake math in code block
      expect(isInInlineMathEnvironment(line, 37)).toBe(true);  // real math environment
    });

    test('should handle math at end of line', () => {
      const line = 'The answer is $42$';
      expect(isInInlineMathEnvironment(line, 16)).toBe(true);
    });

    test('should handle math at start of line', () => {
      const line = '$E=mc^2$ is famous';
      expect(isInInlineMathEnvironment(line, 3)).toBe(true);
    });
  });

  describe('Performance tests', () => {
    test('should handle long text', () => {
      const longLine = 'start ' + '$math$'.repeat(100) + ' end';
      expect(isInInlineMathEnvironment(longLine, 505)).toBe(true);
    });

    test('should handle many code blocks', () => {
      const longLine = '`code`'.repeat(50) + '$math$';
      expect(isInInlineMathEnvironment(longLine, 300)).toBe(false);
      expect(isInInlineMathEnvironment(longLine, 301)).toBe(true);
      expect(isInInlineMathEnvironment(longLine, 302)).toBe(true);
      expect(isInInlineMathEnvironment(longLine, 303)).toBe(true);
      expect(isInInlineMathEnvironment(longLine, 304)).toBe(true);
      expect(isInInlineMathEnvironment(longLine, 305)).toBe(true);
    });
  });

  describe('Display math block ($$...$$) should not be treated as inline', () => {
    test('should not treat $$...$$ as inline math', () => {
      const line = '$$E=mc^2$$';
      for (let i = 0; i < line.length; i++) {
        expect(isInInlineMathEnvironment(line, i)).toBe(false);
      }
    });

    test('should not treat mixed single/double $ as valid inline math', () => {
      const line = '$$E=mc^2$'; // unbalanced, invalid inline
      for (let i = 0; i < line.length; i++) {
        expect(isInInlineMathEnvironment(line, i)).toBe(false);
      }
    });

    test('should skip over display math block and detect inline math only', () => {
      const line = '$$display$$ and then $inline$';
      // display math block: 0–10
      for (let i = 0; i <= 10; i++) {
        expect(isInInlineMathEnvironment(line, i)).toBe(false);
      }
      // inline math block: starts at 21
      expect(isInInlineMathEnvironment(line, 23)).toBe(true);  // 'l' in "inline"
    });
  });
});

describe('findLastUnescapedDollar', () => {
  describe('Basic functionality', () => {
    test('should return -1 when no dollar signs exist', () => {
      expect(findLastUnescapedDollar('hello world', 11)).toBe(-1);
      expect(findLastUnescapedDollar('', 0)).toBe(-1);
      expect(findLastUnescapedDollar('abc def ghi', 5)).toBe(-1);
    });

    test('should find single unescaped dollar sign', () => {
      expect(findLastUnescapedDollar('hello $world', 12)).toBe(6);
      expect(findLastUnescapedDollar('$start', 6)).toBe(0);
      expect(findLastUnescapedDollar('end$', 4)).toBe(3);
    });

    test('should find the last unescaped dollar when multiple exist', () => {
      expect(findLastUnescapedDollar('$first $second $third', 21)).toBe(15);
      expect(findLastUnescapedDollar('$a $b $c', 8)).toBe(6);
      expect(findLastUnescapedDollar('$1 $2 $3 $4', 11)).toBe(9);
    });
  });

  describe('Position handling', () => {
    test('should respect position parameter', () => {
      const line = '$first $second $third';
      expect(findLastUnescapedDollar(line, 21)).toBe(15); // finds $third
      expect(findLastUnescapedDollar(line, 15)).toBe(7);  // finds $second
      expect(findLastUnescapedDollar(line, 7)).toBe(0);   // finds $first
      expect(findLastUnescapedDollar(line, 5)).toBe(0);   // finds $first
    });

    test('should handle position at dollar sign', () => {
      expect(findLastUnescapedDollar('hello $world', 6)).toBe(-1); // pos is at $, searches before it
      expect(findLastUnescapedDollar('$test $more', 6)).toBe(0);   // finds first $
    });

    test('should handle edge positions', () => {
      expect(findLastUnescapedDollar('$test', 0)).toBe(-1); // pos 0, nothing before
      expect(findLastUnescapedDollar('$test', 1)).toBe(0);  // pos 1, finds $ at 0
    });
  });

  describe('Escape handling', () => {
    test('should ignore escaped dollar signs', () => {
      expect(findLastUnescapedDollar('hello \\$world', 13)).toBe(-1);
      expect(findLastUnescapedDollar('\\$escaped', 9)).toBe(-1);
      expect(findLastUnescapedDollar('start \\$middle end', 18)).toBe(-1);
    });

    test('should find unescaped dollar after escaped ones', () => {
      expect(findLastUnescapedDollar('\\$escaped $unescaped', 21)).toBe(10);
      expect(findLastUnescapedDollar('\\$first \\$second $third', 23)).toBe(17);
    });

    test('should handle double backslashes (escaped backslash)', () => {
      // \\$ means escaped backslash followed by unescaped dollar
      expect(findLastUnescapedDollar('hello \\\\$world', 14)).toBe(8);
      expect(findLastUnescapedDollar('\\\\$test', 7)).toBe(2);
    });

    test('should handle triple backslashes', () => {
      // \\\$ means backslash, escaped backslash, escaped dollar
      expect(findLastUnescapedDollar('hello \\\\\\$world', 15)).toBe(-1);
      expect(findLastUnescapedDollar('\\\\\\$test', 8)).toBe(-1);
    });

    test('should handle quadruple backslashes', () => {
      // \\\\$ means two escaped backslashes followed by unescaped dollar
      expect(findLastUnescapedDollar('hello \\\\\\\\$world', 16)).toBe(10);
      expect(findLastUnescapedDollar('\\\\\\\\$test', 9)).toBe(4);
    });

    test('should handle complex escape patterns', () => {
      expect(findLastUnescapedDollar('\\$a \\\\$b \\\\\\$c \\\\\\\\$d', 25)).toBe(19); // finds $d
      expect(findLastUnescapedDollar('\\$a \\\\$b \\\\\\$c \\\\\\\\$d', 12)).toBe(6);  // finds $b
      expect(findLastUnescapedDollar('\\$a \\\\$b \\\\\\$c \\\\\\\\$d', 6)).toBe(-1);  // no unescaped $ before pos 7
    });
  });

  describe('Mixed scenarios', () => {
    test('should handle mixed escaped and unescaped dollars', () => {
      const line = '$start \\$escaped $middle \\\\$unescaped \\\\\\$escaped2 $end';
      expect(findLastUnescapedDollar(line, line.length)).toBe(51); // $end
      expect(findLastUnescapedDollar(line, 51)).toBe(27);          // $unescaped  
      expect(findLastUnescapedDollar(line, 33)).toBe(27);          // $middle
      expect(findLastUnescapedDollar(line, 17)).toBe(0);           // $start
    });

    test('should handle dollars at various positions with escapes', () => {
      expect(findLastUnescapedDollar('$\\$$\\\\$', 7)).toBe(6); // last $ is unescaped
    });
  });

  describe('Edge cases', () => {
    test('should handle empty string', () => {
      expect(findLastUnescapedDollar('', 0)).toBe(-1);
    });

    test('should handle string with only backslashes', () => {
      expect(findLastUnescapedDollar('\\\\\\\\', 4)).toBe(-1);
    });

    test('should handle string ending with backslashes', () => {
      expect(findLastUnescapedDollar('test$\\\\', 7)).toBe(4);
      expect(findLastUnescapedDollar('test$\\', 6)).toBe(4);
    });

    test('should handle consecutive dollars', () => {
      expect(findLastUnescapedDollar('$$$$', 4)).toBe(3);
      expect(findLastUnescapedDollar('$$$$', 3)).toBe(2);
      expect(findLastUnescapedDollar('$$$$', 2)).toBe(1);
      expect(findLastUnescapedDollar('$$$$', 1)).toBe(0);
    });

    test('should handle mixed consecutive dollars and escapes', () => {
      expect(findLastUnescapedDollar('$\\$$', 4)).toBe(3); // $ \$ $
      expect(findLastUnescapedDollar('\\$$\\$', 5)).toBe(2); // \$ $ \$
    });
  });

  describe('Performance edge cases', () => {
    test('should handle long strings efficiently', () => {
      const longString = 'a'.repeat(1000) + '$' + 'b'.repeat(1000);
      expect(findLastUnescapedDollar(longString, longString.length)).toBe(1000);
    });

    test('should handle many escaped dollars', () => {
      const manyEscaped = '\\$'.repeat(100) + '$';
      expect(findLastUnescapedDollar(manyEscaped, manyEscaped.length)).toBe(200);
    });
  });
});