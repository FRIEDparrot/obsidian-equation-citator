import { parseFootnoteInMarkdown } from '@/utils/parsers/footnote_parser';

describe('parseFootnoteInMarkdown', () => {
  it('should parse a single valid footnote with custom label', () => {
    const input = '[^1]: [[some/file.md|Custom label]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '1', path: 'some/file.md', label: 'Custom label', text: '[[some/file.md|Custom label]]', url: null },
    ]);
  });

  it('should parse a single valid footnote without label (use filename as label)', () => {
    const input = '[^ref]: [[other/file.md]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'ref', path: 'other/file.md', label: null, text: '[[other/file.md]]', url: null },
    ]);
  });

  it('should use filename as label when path has no extension', () => {
    const input = '[^test]: [[folder/document]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'test', path: 'folder/document', label: null, text: '[[folder/document]]', url: null },
    ]);
  });

  it('should use filename as label for nested paths', () => {
    const input = '[^nested]: [[deep/nested/folder/file.txt]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'nested', path: 'deep/nested/folder/file.txt', label: null, text: '[[deep/nested/folder/file.txt]]', url: null },
    ]);
  });

  it('should use full path as label when path has no separators', () => {
    const input = '[^single]: [[filename]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'single', path: 'filename', label: null, text: '[[filename]]', url: null },
    ]);
  });

  it('should handle empty alias (use filename)', () => {
    const input = '[^empty]: [[path/file.md|]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'empty', path: 'path/file.md', label: null, text: '[[path/file.md|]]', url: null },
    ]);
  });

  it('should handle whitespace-only alias (use filename)', () => {
    const input = '[^whitespace]: [[path/file.md|   ]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'whitespace', path: 'path/file.md', label: null, text: '[[path/file.md|   ]]', url: null },
    ]);
  });

  it('should ignore lines with footnotes inside code blocks', () => {
    const input = [
      '```',
      '[^2]: [[inside/code.md]]',
      '```',
      '[^3]: [[outside/code.md]]'
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '3', path: 'outside/code.md', label: null, text: '[[outside/code.md]]', url: null },
    ]);
  });

  it('should ignore lines that don\'t start with [^ (even if they contain a valid-looking footnote)', () => {
    const input = '  [^ignored]: [[file.md]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([]);
  });

  it('should handle multiple code blocks and still extract valid footnotes', () => {
    const input = [
      '[^x]: [[outside/readme.md|Custom Label]]',
      '```',
      'code line 1',
      '[^ignored]: [[codeblock/file.md]]',
      '```',
      '[^y]: [[still/ok.txt]]',
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'x', path: 'outside/readme.md', label: 'Custom Label', text: '[[outside/readme.md|Custom Label]]', url: null },
      { num: 'y', path: 'still/ok.txt', label: null, text: '[[still/ok.txt]]', url: null },
    ]);
  });

  it('should correctly parse multiple footnotes and ignore malformed ones', () => {
    const input = [
      '[^a]: [[valid/file.md|label A]]',
      '[^b]: [[valid2.txt]]',
      '[^c]: invalid format',
      '[^d]: [[path/document.pdf|]]', // empty alias, should use filename
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'a', path: 'valid/file.md', label: 'label A', text: '[[valid/file.md|label A]]', url: null },
      { num: 'b', path: 'valid2.txt', label: null, text: '[[valid2.txt]]', url: null },
      { num: 'c', path: null, label: null, text: 'invalid format', url: null },
      { num: 'd', path: 'path/document.pdf', label: null, text: '[[path/document.pdf|]]', url: null },
    ]);
  });

  it('should ignore footnotes with missing brackets or malformed syntax', () => {
    const input = [
      '[^1: [[file.md]]', // missing ]
      '[^2]: [file.md]]', // missing leading [[
      '[^3]: [[file.md|label]', // missing ]]
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '2', path: null, label: null, text: '[file.md]]', url: null },
      { num: '3', path: null, label: null, text: '[[file.md|label]', url: null },
    ]);
  });

  it('should not be confused by backticks in lines that don\'t actually open or close a code block', () => {
    const input = [
      '[^1]: [[outside/file.md]]',
      'This is a line with `code` but not a block',
      '[^2]: [[also/valid.txt|Custom Yes]]'
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '1', path: 'outside/file.md', label: null, text: '[[outside/file.md]]', url: null },
      { num: '2', path: 'also/valid.txt', label: 'Custom Yes', text: '[[also/valid.txt|Custom Yes]]', url: null },
    ]);
  });

  it('should toggle inCodeBlock state properly when encountering multiple ``` on the same line', () => {
    const input = [
      '`````````',
      '[^bad]: [[inside/hidden.md]]',
      '`````````',
      '[^good]: [[outside/visible.md]]',
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'good', path: 'outside/visible.md', label: null, text: '[[outside/visible.md]]', url: null },
    ]);
  });

  it('should handle complex filenames with multiple dots', () => {
    const input = '[^complex]: [[folder/file.name.with.dots.md]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'complex', path: 'folder/file.name.with.dots.md', label: null, text: '[[folder/file.name.with.dots.md]]', url: null },
    ]);
  });

  it('should handle footnote numbers with various characters', () => {
    const input = [
      '[^1]: [[path1/file1.md]]',
      '[^abc]: [[path2/file2.md]]',
      '[^123abc]: [[path3/file3.md]]',
      '[^note-1]: [[path4/file4.md]]',
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '1', path: 'path1/file1.md', label: null, text: '[[path1/file1.md]]', url: null },
      { num: 'abc', path: 'path2/file2.md', label: null, text: '[[path2/file2.md]]', url: null },
      { num: '123abc', path: 'path3/file3.md', label: null, text: '[[path3/file3.md]]', url: null },
      { num: 'note-1', path: 'path4/file4.md', label: null, text: '[[path4/file4.md]]', url: null },
    ]);
  });

  it('should preserve custom labels with special characters', () => {
    const input = [
      '[^1]: [[path/file.md|Label with spaces]]',
      '[^2]: [[path/file.md|Label-with-dashes]]',
      '[^3]: [[path/file.md|Label_with_underscores]]',
      '[^4]: [[path/file.md|Label.with.dots]]',
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '1', path: 'path/file.md', label: 'Label with spaces', text: '[[path/file.md|Label with spaces]]', url: null },
      { num: '2', path: 'path/file.md', label: 'Label-with-dashes', text: '[[path/file.md|Label-with-dashes]]', url: null },
      { num: '3', path: 'path/file.md', label: 'Label_with_underscores', text: '[[path/file.md|Label_with_underscores]]', url: null },
      { num: '4', path: 'path/file.md', label: 'Label.with.dots', text: '[[path/file.md|Label.with.dots]]', url: null },
    ]);
  });

  it('should handle paths with no filename (ending with slash)', () => {
    const input = '[^folder]: [[some/path/]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'folder', path: 'some/path/', label: null, text: '[[some/path/]]', url: null },
    ]);
  });

  it('should handle edge case with only slashes in path', () => {
    const input = '[^slashes]: [[///]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'slashes', path: '///', label: null, text: '[[///]]', url: null },
    ]);
  });
});