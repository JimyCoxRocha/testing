// Configuración global para todos los tests de fnDetalleFlujoTransf

// Mock global de AWS X-Ray
jest.mock('aws-xray-sdk-core', () => {
  const mockSegment = {
    close: jest.fn(),
    addNewSubsegment: jest.fn().mockReturnValue({
      addNewSubsegment: jest.fn(),
      addAnnotation: jest.fn(),
      addError: jest.fn(),
      close: jest.fn()
    }),
    addError: jest.fn()
  };
  return {
    getSegment: jest.fn().mockReturnValue(mockSegment),
    captureHTTPsGlobal: jest.fn(),
    captureAWS: jest.fn(),
    captureFunc: jest.fn()
  };
});

// Mock global de AWS X-Ray SDK
jest.mock('aws-xray-sdk', () => ({
  captureHTTPsGlobal: jest.fn(),
  captureAWS: jest.fn()
}));

// Mock global de crypto
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mocked-hash-value')
    })
  })
}));

// Mock global de http y https
jest.mock('http', () => ({}));
jest.mock('https', () => ({}));

// Configuración global de console para tests
const originalConsole = global.console;

beforeEach(() => {
  // Silenciar logs durante tests a menos que se especifique lo contrario
  if (!process.env.VERBOSE_TESTS) {
    global.console = {
      ...originalConsole,
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };
  }
});

afterEach(() => {
  // Restaurar console original
  global.console = originalConsole;
  
  // Limpiar todos los mocks después de cada test
  jest.clearAllMocks();
});

// Configuración de timeouts para tests
jest.setTimeout(10000);

// Test básico para que Jest reconozca este archivo como válido
describe('Setup Configuration', () => {
  it('should have proper global configuration', () => {
    // Verificar que los mocks globales estén configurados
    expect(jest.isMockFunction(require('crypto').createHash)).toBe(true);
    expect(jest.isMockFunction(require('aws-xray-sdk-core').getSegment)).toBe(true);
  });
});

export {};
