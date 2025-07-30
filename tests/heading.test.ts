import { Heading, relativeHeadingLevel } from "@/utils/heading";

describe("relativeHeadingLevel", () => {
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    // mock console.error
    console.error = jest.fn();
  });

  afterAll(() => {
    // restore console.error
    console.error = originalConsoleError;
  });

  describe("when first heading is ##", () => {
    const headings = [
      { level: 2, line: 0, text: "Section Start" },
      { level: 3, line: 4, text: "Sub A" },
      { level: 2, line: 6, text: "Section Next" },
    ];

    it("should return 1 for index 0", () => {
      expect(relativeHeadingLevel(headings as Heading[], 0)).toBe(1);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should return 2 for index 1", () => {
      expect(relativeHeadingLevel(headings as Heading[], 1)).toBe(2);
      expect(console.error).not.toHaveBeenCalled();
    });
    
    it("should return 1 for index 2", () => {
      expect(relativeHeadingLevel(headings as Heading[], 2)).toBe(1);
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("when first heading is #", () => {
    const headings = [
      { level: 1, line: 0, text: "Chapter 1" },
      { level: 2, line: 2, text: "Section A" },
      { level: 4, line: 4, text: "Subsection A1" },
      { level: 3, line: 6, text: "Section B" },
      { level: 1, line: 10, text: "Chapter 2" },
    ];

    it("should return 1 for index 0", () => {
      expect(relativeHeadingLevel(headings as Heading[], 0)).toBe(1);
    });

    it("should return 2 for index 1", () => {
      expect(relativeHeadingLevel(headings as Heading[], 1)).toBe(2);
    });

    it("should return 3 for index 2", () => {
      expect(relativeHeadingLevel(headings as Heading[], 2)).toBe(3);
    });

    it("should return 3 for index 3", () => {
      expect(relativeHeadingLevel(headings as Heading[], 3)).toBe(3);
    });

    it("should return 1 for index 4", () => {
      expect(relativeHeadingLevel(headings as Heading[], 4)).toBe(1);
    });
  });

  describe("with complex level jumps", () => {
    const headings = [
      { level: 2, line: 0, text: "Start" },
      { level: 4, line: 2, text: "Deep" },
      { level: 3, line: 4, text: "Mid" },
      { level: 5, line: 6, text: "Deeper" },
    ];

    it("should return 1 for index 0", () => {
      expect(relativeHeadingLevel(headings as Heading[], 0)).toBe(1);
    });

    it("should return 2 for index 1", () => {
      expect(relativeHeadingLevel(headings as Heading[], 1)).toBe(2);
    });

    it("should return 2 for index 2", () => {
      expect(relativeHeadingLevel(headings as Heading[], 2)).toBe(2);
    });

    it("should return 3 for index 3", () => {
      expect(relativeHeadingLevel(headings as Heading[], 3)).toBe(3);
    });
  });

  describe("with empty input", () => {
    const headings: Heading[] = [];

    it("should return 0 for index 0", () => {
      expect(relativeHeadingLevel(headings, 0)).toBe(0);
    });
  });

  describe("with out of bounds index", () => {
    const headings = [
      { level: 2, line: 0, text: "Section" },
    ];

    it("should return 0 for index -1", () => {
      expect(relativeHeadingLevel(headings as Heading[], -1)).toBe(0);
    });

    it("should return 0 for index 1", () => {
      expect(relativeHeadingLevel(headings as Heading[], 1)).toBe(0);
    });
  });
});