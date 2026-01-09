import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/pipeline/**/*.test.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/integration/navigation/'  // Playwright tests - run via npx playwright test
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  verbose: true,
  testTimeout: 10000,
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/tests/$1',
    '^@skills/(.*)$': '<rootDir>/skills/$1'
  }
};

export default config;
