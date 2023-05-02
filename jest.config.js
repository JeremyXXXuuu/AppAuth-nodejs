/** @type {import('ts-jest').JestConfigWithTsJest} */
const seconds = 1000;

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: seconds*1000,
};
