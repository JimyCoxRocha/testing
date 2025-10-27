const baseTestDir = '<rootDir>/test';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'report',
        outputName: 'report.xml',
      },
    ],
    ['jest-html-reporters', {
      publicPath: './report',
      filename: 'prueba_unitaria.html',
      pageTitle: "BANCO BOLIVARIANO - PRUEBA UNITARIA - HISTORIA CDM-2680",
      expand: true
    }]
  ],
  coverageReporters: ['html'],
  coverageDirectory: './report/cobertura',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.spec.{ts,js}'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};