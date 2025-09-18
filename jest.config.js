export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.spec.{ts,js}'
  ],
  coverageDirectory: 'coverage',
  testMatch: [
    'src/**/__tests__/**/*.{ts,js}',
    'src/**/?(*.)+(spec|test).{ts,js}'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/templates/',
    '/test-app/',
    '/test-js-app/'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  }
};
