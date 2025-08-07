import { parseFootnoteInMarkdown } from '@/utils/footnote_utils';

describe('parseFootnoteInMarkdown', () => {
  it('should parse a single valid footnote with custom label', () => {
    const input = '[^1]: [[some/file.md|Custom label]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '1', path: 'some/file.md', label: 'Custom label' },
    ]);
  });

  it('should parse a single valid footnote without label (use filename as label)', () => {
    const input = '[^ref]: [[other/file.md]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'ref', path: 'other/file.md', label: 'file.md' },
    ]);
  });

  it('should use filename as label when path has no extension', () => {
    const input = '[^test]: [[folder/document]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'test', path: 'folder/document', label: 'document' },
    ]);
  });

  it('should use filename as label for nested paths', () => {
    const input = '[^nested]: [[deep/nested/folder/file.txt]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'nested', path: 'deep/nested/folder/file.txt', label: 'file.txt' },
    ]);
  });

  it('should use full path as label when path has no separators', () => {
    const input = '[^single]: [[filename]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'single', path: 'filename', label: 'filename' },
    ]);
  });

  it('should handle empty alias (use filename)', () => {
    const input = '[^empty]: [[path/file.md|]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'empty', path: 'path/file.md', label: 'file.md' },
    ]);
  });

  it('should handle whitespace-only alias (use filename)', () => {
    const input = '[^whitespace]: [[path/file.md|   ]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'whitespace', path: 'path/file.md', label: 'file.md' },
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
      { num: '3', path: 'outside/code.md', label: 'code.md' },
    ]);
  });

  it('should ignore lines that don\'t start with [^ (even if they contain a valid-looking footnote)', () => {
    const input = '  [^ignored]: [[file.md]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([]);
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
      { num: 'a', path: 'valid/file.md', label: 'label A' },
      { num: 'b', path: 'valid2.txt', label: 'valid2.txt' },
      { num: 'd', path: 'path/document.pdf', label: 'document.pdf' },
    ]);
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
      { num: 'x', path: 'outside/readme.md', label: 'Custom Label' },
      { num: 'y', path: 'still/ok.txt', label: 'ok.txt' },
    ]);
  });

  it('should ignore footnotes with missing brackets or malformed syntax', () => {
    const input = [
      '[^1: [[file.md]]', // missing ]
      '[^2]: [file.md]]', // missing leading [[
      '[^3]: [[file.md|label]', // missing ]]
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([]);
  });

  it('should not be confused by backticks in lines that don\'t actually open or close a code block', () => {
    const input = [
      '[^1]: [[outside/file.md]]',
      'This is a line with `code` but not a block',
      '[^2]: [[also/valid.txt|Custom Yes]]'
    ].join('\n');
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: '1', path: 'outside/file.md', label: 'file.md' },
      { num: '2', path: 'also/valid.txt', label: 'Custom Yes' },
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
      { num: 'good', path: 'outside/visible.md', label: 'visible.md' },
    ]);
  });

  it('should handle complex filenames with multiple dots', () => {
    const input = '[^complex]: [[folder/file.name.with.dots.md]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'complex', path: 'folder/file.name.with.dots.md', label: 'file.name.with.dots.md' },
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
      { num: '1', path: 'path1/file1.md', label: 'file1.md' },
      { num: 'abc', path: 'path2/file2.md', label: 'file2.md' },
      { num: '123abc', path: 'path3/file3.md', label: 'file3.md' },
      { num: 'note-1', path: 'path4/file4.md', label: 'file4.md' },
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
      { num: '1', path: 'path/file.md', label: 'Label with spaces' },
      { num: '2', path: 'path/file.md', label: 'Label-with-dashes' },
      { num: '3', path: 'path/file.md', label: 'Label_with_underscores' },
      { num: '4', path: 'path/file.md', label: 'Label.with.dots' },
    ]);
  });

  it('should handle paths with no filename (ending with slash)', () => {
    const input = '[^folder]: [[some/path/]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'folder', path: 'some/path/', label: null },
    ]);
  });

  it('should handle edge case with only slashes in path', () => {
    const input = '[^slashes]: [[///]]';
    const result = parseFootnoteInMarkdown(input);
    expect(result).toEqual([
      { num: 'slashes', path: '///', label: null },
    ]);
  });
});
