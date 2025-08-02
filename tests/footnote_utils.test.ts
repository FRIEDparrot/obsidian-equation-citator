import { parseFootnoteInMarkdown } from '@/utils/footnote_utils';

describe('parseFootnoteInMarkdown', () => {
  it('should parse a single valid footnote with label', () => {
    const input = '[^1]: [[some/file.md|Custom label]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '1', path: 'some/file.md', label: 'Custom label' },
    ]);
  });

  it('should parse a single valid footnote without label', () => {
    const input = '[^ref]: [[other/file]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'ref', path: 'other/file', label: null },
    ]);
  });

  it('should ignore lines with footnotes inside code blocks', () => {
    const input = [
      '```',
      '[^2]: [[inside/code]]',
      '```',
      '[^3]: [[outside/code]]'
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '3', path: 'outside/code', label: null },
    ]);
  });

  it('should ignore lines that don’t start with [^ (even if they contain a valid-looking footnote)', () => {
    const input = '  [^ignored]: [[file]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([]);
  });
  
  it('should correctly parse multiple footnotes and ignore malformed ones', () => {
    const input = [
      '[^a]: [[valid/file|label A]]',
      '[^b]: [[valid2]]',
      '[^c]: invalid format',
      '[^d]: [[path|]]',
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'a', path: 'valid/file', label: 'label A' },
      { num: 'b', path: 'valid2', label: null },
    ]);
  });

  it('should handle multiple code blocks and still extract valid footnotes', () => {
    const input = [
      '[^x]: [[outside|label]]',
      '```',
      'code line 1',
      '[^ignored]: [[codeblock]]',
      '```',
      '[^y]: [[still/ok]]',
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'x', path: 'outside', label: 'label' },
      { num: 'y', path: 'still/ok', label: null },
    ]);
  });

  it('should ignore footnotes with missing brackets or malformed syntax', () => {
    const input = [
      '[^1: [[file]]', // missing ]
      '[^2]: [file]]', // missing leading [[
      '[^3]: [[file|label]', // missing ]]
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([]);
  });

  it('should not be confused by backticks in lines that don’t actually open or close a code block', () => {
    const input = [
      '[^1]: [[outside]]',
      'This is a line with `code` but not a block',
      '[^2]: [[also/valid|Yes]]'
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '1', path: 'outside', label: null },
      { num: '2', path: 'also/valid', label: 'Yes' },
    ]);
  });

  it('should toggle inCodeBlock state properly when encountering multiple ``` on the same line', () => {
    const input = [
      '`````````',
      '[^bad]: [[inside]]',
      '`````````',
      '[^good]: [[outside]]',
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'good', path: 'outside', label: null },
    ]);
  });
});
