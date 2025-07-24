import { getEquationNumber } from "@/view/editor";

describe("getEquationNumber", () => {
  const testCases = [
    { input: "E=mc^2 tag{A-1.2}", expected: "A-1.2" },
    { input: "F=ma tag{eq-001}", expected: "eq-001" },
    { input: "x^2+y^2=z^2 tag{123}", expected: "123" },
    { input: "no tag here", expected: undefined },
    { input: "tag{A.B-C}", expected: "A.B-C" },
    { input: "tag{A-1.2} tag{B-2.3}", expected: "A-1.2" },
  ];

  testCases.forEach(({ input, expected }, idx) => {
    test(`case ${idx + 1}: '${input}' => '${expected}'`, () => {
      expect(getEquationNumber(input)).toBe(expected);
    });
  });
});
