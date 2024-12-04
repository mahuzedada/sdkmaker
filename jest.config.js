module.exports = {
  preset: 'ts-jest',
  clearMocks: true,
  testEnvironment: 'node',
  testMatch: ['**/*.test.(ts|tsx|js)'], // Match both JS and TS test files
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'node'],
};
