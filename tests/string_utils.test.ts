// escapeString.test.ts
import { escapeString, processQuoteLine } from "@/utils/string_utils";

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