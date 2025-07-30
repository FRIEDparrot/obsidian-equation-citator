// escapeString.test.ts
import { escapeString } from "@/utils/string_utils";

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
