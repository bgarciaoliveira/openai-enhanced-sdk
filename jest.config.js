   // jest.config.js
   module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    testMatch: ['**/tests/**/*.test.ts'],
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
    },
  };