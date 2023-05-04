/** @type {import('ts-jest').JestConfigWithTsJest} */
const seconds = 1000;

module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testTimeout: seconds*1000,
};
