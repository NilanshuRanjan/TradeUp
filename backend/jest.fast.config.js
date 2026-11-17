module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/integration.test.js',
    '<rootDir>/tests/user.model.test.js',
    '<rootDir>/tests/listing.model.test.js',
    '<rootDir>/tests/message.model.test.js'
  ],
  collectCoverageFrom: [
    'models/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js'
  ],
  coverageDirectory: 'coverage',
  testTimeout: 10000
};