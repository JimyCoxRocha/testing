import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../src/functions/fnInterBorrarHashTransf';
import { FraudeException } from '../src/errors/FraudeException';

// Mock de AWS SDK v3 DynamoDB
jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  const mockDynamoDBClient = jest.fn(() => ({
    send: mockSend
  }));
  
  return {
    DynamoDBClient: mockDynamoDBClient,
    DeleteItemCommand: jest.fn(),
    __mockSend: mockSend, // Para acceder al mock desde los tests
    __mockDynamoDBClient: mockDynamoDBClient
  };
});

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = jest.fn();

  // Mock de clase
  class MockDynamoDBDocumentClient {
    static from() {
      return { send: mockSend };
    }
  }
  return {
    DynamoDBDocumentClient: MockDynamoDBDocumentClient,
  };
});

// Obtener referencia al mock
const { __mockSend: mockSend, __mockDynamoDBClient: mockDynamoDBClient } = require('@aws-sdk/client-dynamodb');

describe('CDM-2680: fnInterBorrarHashTransf - Tests Unitarios', () => {
  let mockContext: Context;
  let mockCallback: Callback;

  const createMockEvent = (headers?: Record<string, string>): APIGatewayProxyEvent => ({
    body: null,
    headers: headers || {
      'Content-Type': 'application/json',
      'hash': 'abc123def456789'
    },
    httpMethod: 'DELETE',
    isBase64Encoded: false,
    path: '/borrar-hash',
    pathParameters: null,
    queryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      accountId: 'test-account',
      apiId: 'test-api',
      stage: 'test',
      requestTime: '2023-01-01T00:00:00Z',
      requestTimeEpoch: 1672531200000,
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null,
        clientCert: null
      },
      path: '/borrar-hash',
      resourceId: 'test-resource',
      resourcePath: '/borrar-hash',
      httpMethod: 'DELETE',
      protocol: 'HTTP/1.1',
      authorizer: null
    },
    resource: '/borrar-hash',
    multiValueHeaders: {},
    multiValueQueryStringParameters: null
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.TABLA_HASH_USUARIO_NAME = 'test-hash-table';

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'fnInterBorrarHashTransf',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:fnInterBorrarHashTransf',
      memoryLimitInMB: '256',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/fnInterBorrarHashTransf',
      logStreamName: '2023/09/12/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn()
    };

    mockCallback = jest.fn();

    // Reset mocks to default successful behavior
    mockDynamoDBClient.mockImplementation(() => ({
      send: mockSend
    }));

    // Mock exitoso por defecto para DynamoDB
    mockSend.mockResolvedValue({
      $metadata: {
        httpStatusCode: 200,
        requestId: 'test-request-id'
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Casos Exitosos', () => {
    it('debería eliminar exitosamente un hash válido', async () => {
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': 'abc123def456789'
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.mensajeUsuario).toBe('Hash eliminado exitosamente');
      expect(responseBody.eliminado).toBe(true);
      expect(responseBody.hashId).toBe('abc123def4...');
      expect(responseBody.timestamp).toBeDefined();

      // Verificar que se llamó a DynamoDB
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('debería manejar hash largo correctamente', async () => {
      const longHash = 'a'.repeat(64); // Hash de 64 caracteres (típico SHA-256)
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': longHash
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.eliminado).toBe(true);
      expect(responseBody.hashId).toBe('aaaaaaaaaa...');
    });

    it('debería manejar hash con caracteres especiales', async () => {
      const specialHash = 'ABC123+/def456='; // Base64 con caracteres especiales
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': specialHash
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.eliminado).toBe(true);
      expect(responseBody.hashId).toBe('ABC123+/de...');
    });

    it('debería incluir headers CORS correctos', async () => {
      const mockEvent = createMockEvent();

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.headers).toEqual({
        'Content-Type': 'application/json'
      });
    });

  });

  describe('Validación de Headers', () => {
    it('debería fallar cuando no se proporciona hash', async () => {
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json'
        // Sin hash
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9400);
      expect(responseBody.mensajeUsuario).toBe('Datos incompletos');
      expect(responseBody.eliminado).toBe(false);

      // No debería llamar a DynamoDB
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('debería fallar cuando hash está vacío', async () => {
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': ''
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9400);
      expect(responseBody.mensajeUsuario).toBe('Datos incompletos');
      expect(responseBody.eliminado).toBe(false);
    });

    it('debería fallar cuando hash contiene solo espacios', async () => {
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': '   '
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9400);
      expect(responseBody.mensajeUsuario).toBe('Datos incompletos');
      expect(responseBody.eliminado).toBe(false);
    });

    it('debería manejar headers null', async () => {
      const mockEvent = createMockEvent();
      mockEvent.headers = null as any;

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9400);
      expect(responseBody.mensajeUsuario).toBe('Datos incompletos');
      expect(responseBody.eliminado).toBe(false);
    });

    it('debería manejar headers undefined', async () => {
      const mockEvent = createMockEvent();
      mockEvent.headers = undefined as any;

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9400);
      expect(responseBody.mensajeUsuario).toBe('Datos incompletos');
      expect(responseBody.eliminado).toBe(false);
    });
  });

  describe('Validación de Hash', () => {
    it('debería fallar cuando hash es muy corto', async () => {
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': '123' // Menos de 10 caracteres
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9401);
      expect(responseBody.mensajeUsuario).toBe('Hash muy corto');
      expect(responseBody.eliminado).toBe(false);
    });

    it('debería aceptar hash de exactamente 10 caracteres', async () => {
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': '1234567890' // Exactamente 10 caracteres
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.eliminado).toBe(true);
      expect(responseBody.hashId).toBe('1234567890...');
    });

    it('debería manejar hash con espacios al inicio y final', async () => {
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': '  abc123def456789  ' // Con espacios
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.eliminado).toBe(true);
      // Debería mostrar el hash con espacios tal como se recibe en el header
      expect(responseBody.hashId).toBe('  abc123de...');
    });
  });

  describe('Casos de Diferentes Headers', () => {
    it('debería funcionar con hash en diferentes casos', async () => {
      const testCases = [
        { header: 'hash', value: 'test-123456789' },
        { header: 'Hash', value: 'test-456789123' },
        { header: 'HASH', value: 'test-789123456' }
      ];

      for (const testCase of testCases) {
        const headers = {
          'Content-Type': 'application/json',
          [testCase.header]: testCase.value
        };
        
        const mockEvent = createMockEvent(headers);
        const result = await handler(mockEvent, mockContext, mockCallback) as any;

        // Solo el primer caso (hash) debería funcionar según la implementación
        if (testCase.header === 'hash') {
          expect(result.statusCode).toBe(200);
          const responseBody = JSON.parse(result.body);
          expect(responseBody.eliminado).toBe(true);
        } else {
          expect(result.statusCode).toBe(400);
          const responseBody = JSON.parse(result.body);
          expect(responseBody.eliminado).toBe(false);
        }
      }
    });

    it('debería manejar headers adicionales sin problemas', async () => {
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': 'test-hash-123456789',
        'Authorization': 'Bearer token123',
        'User-Agent': 'test-agent',
        'X-Custom-Header': 'custom-value'
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.eliminado).toBe(true);
      expect(responseBody.hashId).toBe('test-hash-...');
    });
  });

  describe('Errores de DynamoDB', () => {
    it('debería manejar errores de DynamoDB correctamente', async () => {
      // Mock de error de DynamoDB
      mockSend.mockRejectedValue(new Error('DynamoDB connection failed'));

      const mockEvent = createMockEvent();

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9402);
      expect(responseBody.mensajeUsuario).toBe('Error de DynamoDB');
      expect(responseBody.eliminado).toBe(false);
    });

    it('debería manejar errores de acceso denegado en DynamoDB', async () => {
      // Mock de error de acceso denegado
      const accessDeniedError = new Error('AccessDenied');
      accessDeniedError.name = 'AccessDenied';
      mockSend.mockRejectedValue(accessDeniedError);

      const mockEvent = createMockEvent();

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9402);
      expect(responseBody.mensajeUsuario).toBe('Error de DynamoDB');
      expect(responseBody.eliminado).toBe(false);
    });

    it('debería manejar tabla no encontrada en DynamoDB', async () => {
      // Mock de error de tabla no encontrada
      const tableNotFoundError = new Error('Table not found');
      tableNotFoundError.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValue(tableNotFoundError);

      const mockEvent = createMockEvent();

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9402);
      expect(responseBody.mensajeUsuario).toBe('Error de DynamoDB');
      expect(responseBody.eliminado).toBe(false);
    });
  });

  describe('Manejo de Errores Internos', () => {
    it('debería manejar errores genéricos', async () => {
      // Simular error interno mockeando el constructor de DynamoDBClient
      mockDynamoDBClient.mockImplementation(() => {
        throw new Error('Error interno del servicio');
      });

      const mockEvent = createMockEvent();

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(500);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999);
      expect(responseBody.mensajeUsuario).toBe('Error interno del servicio');
      expect(responseBody.eliminado).toBe(false);
    });

    it('debería manejar errores de tipo desconocido', async () => {
      // Mock que lanza un string en lugar de Error
      mockDynamoDBClient.mockImplementation(() => {
        throw 'String error desconocido';
      });

      const mockEvent = createMockEvent();

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(500);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999);
      expect(responseBody.mensajeUsuario).toBe('Error interno al eliminar hash');
      expect(responseBody.eliminado).toBe(false);
    });
  });

  describe('Pruebas de Configuración y Entorno', () => {

    it('debería manejar tabla vacía en variables de entorno', async () => {
      process.env.TABLA_HASH_USUARIO_NAME = '';

      const mockEvent = createMockEvent();
      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      // Debería funcionar normalmente, solo con tabla vacía
      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.eliminado).toBe(true);
    });

    it('debería manejar tabla undefined en variables de entorno', async () => {
      delete process.env.TABLA_HASH_USUARIO_NAME;

      const mockEvent = createMockEvent();
      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.eliminado).toBe(true);
    });
  });

  describe('Pruebas de Rendimiento y Concurrencia', () => {
    it('debería manejar múltiples eliminaciones simultáneas', async () => {
      const hashes = [
        'hash-1-123456789',
        'hash-2-123456789', 
        'hash-3-123456789',
        'hash-4-123456789',
        'hash-5-123456789'
      ];
      
      const promises = hashes.map(hash => {
        const mockEvent = createMockEvent({
          'Content-Type': 'application/json',
          'hash': hash
        });
        return handler(mockEvent, mockContext, mockCallback) as any;
      });

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.statusCode).toBe(200);
        
        const responseBody = JSON.parse(result.body);
        expect(responseBody.codigoError).toBe(0);
        expect(responseBody.eliminado).toBe(true);
        expect(responseBody.hashId).toBe(hashes[index].substring(0, 10) + '...');
      });

      // Verificar que se llamó a DynamoDB 5 veces
      expect(mockSend).toHaveBeenCalledTimes(5);
    });

    it('debería completar la eliminación en tiempo razonable', async () => {
      const mockEvent = createMockEvent();
      
      const startTime = Date.now();
      const result = await handler(mockEvent, mockContext, mockCallback) as any;
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(result.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000); // Menos de 1 segundo
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.eliminado).toBe(true);
    });
  });

  describe('Validación de Respuesta', () => {
    it('debería incluir timestamp válido en respuesta exitosa', async () => {
      const beforeTest = new Date().toISOString();
      
      const mockEvent = createMockEvent();
      const result = await handler(mockEvent, mockContext, mockCallback) as any;
      
      const afterTest = new Date().toISOString();
      
      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.timestamp).toBeDefined();
      expect(new Date(responseBody.timestamp)).toBeInstanceOf(Date);
      expect(responseBody.timestamp).toBeTruthy();
    });

    it('debería incluir timestamp válido en respuesta de error', async () => {
      const beforeTest = new Date().toISOString();
      
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json'
        // Sin hash para generar error
      });
      const result = await handler(mockEvent, mockContext, mockCallback) as any;
      
      const afterTest = new Date().toISOString();
      
      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.timestamp).toBeDefined();
      expect(new Date(responseBody.timestamp)).toBeInstanceOf(Date);
      expect(responseBody.timestamp).toBeTruthy();
    });

    it('debería tener estructura de respuesta consistente', async () => {
      const mockEvent = createMockEvent();
      const result = await handler(mockEvent, mockContext, mockCallback) as any;
      
      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty('codigoError');
      expect(responseBody).toHaveProperty('mensajeUsuario');
      expect(responseBody).toHaveProperty('eliminado');
      expect(responseBody).toHaveProperty('timestamp');
      
      if (result.statusCode === 200) {
        expect(responseBody).toHaveProperty('hashId');
      }
    });
  });

  describe('Logging y Trazabilidad', () => {
    it('debería loggear información de procesamiento', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json',
        'hash': 'logged-hash-123456789'
      });
      
      await handler(mockEvent, mockContext, mockCallback) as any;
      
      expect(consoleSpy).toHaveBeenCalledWith('Lambda InterceptorBorrarHash - Procesando eliminación de hash');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Eliminando hash: logged-has...');
      expect(consoleSpy).toHaveBeenCalledWith('🗑️ Ejecutando delete en DynamoDB para hash: logged-has...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ Hash eliminado exitosamente de DynamoDB');
      
      consoleSpy.mockRestore();
    });

    it('debería loggear errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const mockEvent = createMockEvent({
        'Content-Type': 'application/json'
        // Sin hash para generar error
      });
      
      await handler(mockEvent, mockContext, mockCallback) as any;
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error en InterceptorBorrarHash:', expect.any(FraudeException));
      
      consoleErrorSpy.mockRestore();
    });

    it('debería loggear errores de DynamoDB', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSend.mockRejectedValue(new Error('DynamoDB error'));
      
      const mockEvent = createMockEvent();
      
      await handler(mockEvent, mockContext, mockCallback) as any;
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error al eliminar hash de DynamoDB:', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error en InterceptorBorrarHash:', expect.any(FraudeException));
      
      consoleErrorSpy.mockRestore();
    });
  });
});
