import { createDefaultPreset } from "ts-jest";

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest', // use ts-jest preset 
  testEnvironment: 'jsdom', // use jsdom environment for simulate browser environment
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
