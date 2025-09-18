export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  roots: ['<rootDir>/src'],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.spec.{ts,js}'
  ],
  coverageDirectory: 'coverage',
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,js}',
    '<rootDir>/src/**/?(*.)+(spec|test).{ts,js}'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/templates/',
    '/test-app/',
    '/test-js-app/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/templates/',
    '<rootDir>/test-app/',
    '<rootDir>/test-js-app/'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }]
  }
};
