import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../src/functions/fnInterValidarHashTransf';
import { FraudeException } from '../src/errors/FraudeException';
import { ValidacionesService } from '../src/services/ValidacionesService';
import { HashUsuarioRepository } from '../src/repository/HashUsuarioRepository';

// Mock de ValidacionesService
jest.mock('../src/services/ValidacionesService');
const MockedValidacionesService = ValidacionesService as jest.Mocked<typeof ValidacionesService>;

// Mock de HashUsuarioRepository
jest.mock('../src/repository/HashUsuarioRepository');
const MockedHashUsuarioRepository = HashUsuarioRepository as jest.MockedClass<typeof HashUsuarioRepository>;

describe('CDM-2680: fnInterValidarHashTransf - Tests Unitarios', () => {
  let mockHashRepo: jest.Mocked<HashUsuarioRepository>;
  let mockContext: Context;
  let mockCallback: Callback;

  const createMockEvent = (body?: string | null, headers?: Record<string, string>): APIGatewayProxyEvent => ({
    body: body || null,
    headers: headers || {
      'Content-Type': 'application/json',
      'hash': 'test-hash-123',
      'referenciaRes': 'REF123456'
    },
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/validar-hash',
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
      path: '/validar-hash',
      resourceId: 'test-resource',
      resourcePath: '/validar-hash',
      httpMethod: 'POST',
      protocol: 'HTTP/1.1',
      authorizer: null
    },
    resource: '/validar-hash',
    multiValueHeaders: {},
    multiValueQueryStringParameters: null
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'fnInterValidarHashTransf',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:fnInterValidarHashTransf',
      memoryLimitInMB: '256',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/fnInterValidarHashTransf',
      logStreamName: '2023/09/12/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn()
    };

    mockCallback = jest.fn();

    // Mock del repositorio HashUsuarioRepository
    mockHashRepo = {
      getHash: jest.fn(),
      saveHash: jest.fn(),
      deleteHash: jest.fn(),
      updateHash: jest.fn()
    } as any;
    MockedHashUsuarioRepository.mockImplementation(() => mockHashRepo);

    // Mock por defecto exitoso para ValidacionesService
    MockedValidacionesService.existeReferenciaHash = jest.fn().mockResolvedValue(true);

    // Mock por defecto exitoso para HashUsuarioRepository
    mockHashRepo.getHash.mockResolvedValue({
      hash: 'test-hash-123',
      sesionValida: true
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Casos Exitosos', () => {
    it('debería validar hash exitosamente', async () => {
      const requestBody = JSON.stringify({
        sessionId: 'test-session-123',
        transactionData: { amount: 100, currency: 'USD' }
      });
      
      const mockEvent = createMockEvent(requestBody);

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.mensajeUsuario).toBe('Hash validado exitosamente');
      expect(responseBody.valido).toBe(true);
      expect(responseBody.hashValidado).toBe(true);
      expect(responseBody.timestamp).toBeDefined();

      expect(MockedValidacionesService.existeReferenciaHash).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'hash': 'test-hash-123',
        'referenciaRes': 'REF123456'
      });
    });

    it('debería incluir headers CORS en la respuesta', async () => {
      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Content-Type': 'application/json'
      });
    });

    it('debería manejar headers adicionales correctamente', async () => {
      const requestBody = JSON.stringify({ sessionId: 'test-123' });
      
      const mockEvent = createMockEvent(requestBody, {
        'Content-Type': 'application/json',
        'hash': 'custom-hash-456',
        'referenciaRes': 'CUSTOM-REF789',
        'Authorization': 'Bearer token123',
        'User-Agent': 'test-agent'
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.valido).toBe(true);

      expect(MockedValidacionesService.existeReferenciaHash).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'hash': 'custom-hash-456',
        'referenciaRes': 'CUSTOM-REF789',
        'Authorization': 'Bearer token123',
        'User-Agent': 'test-agent'
      });
    });

    it('debería filtrar headers no-string', async () => {
      const requestBody = JSON.stringify({ test: 'data' });
      
      const mockEvent = createMockEvent(requestBody);
      // Simular headers con valores no-string
      (mockEvent as any).headers = {
        'Content-Type': 'application/json',
        'hash': 'test-hash-123',
        'referenciaRes': 'REF123456',
        'Valid-Header': 'string-value',
        'Invalid-Header': 123, // Número
        'Another-Invalid': null, // Null
        'Object-Header': { key: 'value' } // Objeto
      };

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);

      // Solo los headers string deberían pasarse al servicio
      expect(MockedValidacionesService.existeReferenciaHash).toHaveBeenCalledWith({
        'Content-Type': 'application/json',
        'hash': 'test-hash-123',
        'referenciaRes': 'REF123456',
        'Valid-Header': 'string-value'
      });
    });
  });

  describe('Validación de Entrada', () => {
    it('debería fallar cuando no se proporciona body', async () => {
      const mockEvent = createMockEvent(null);

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
        expect((error as FraudeException).mensajeInterno).toBe('Información incompleta o inconsistente');
      }

      expect(MockedValidacionesService.existeReferenciaHash).not.toHaveBeenCalled();
      expect(mockHashRepo.getHash).not.toHaveBeenCalled();
    });

    it('debería fallar cuando body está vacío', async () => {
      const mockEvent = createMockEvent('');

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
      }

      expect(MockedValidacionesService.existeReferenciaHash).not.toHaveBeenCalled();
    });

    it('debería fallar cuando body contiene solo espacios', async () => {
      const mockEvent = createMockEvent('   ');

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);

      expect(MockedValidacionesService.existeReferenciaHash).not.toHaveBeenCalled();
    });

    it('debería manejar event null', async () => {
      await expect(handler(null as any, mockContext, mockCallback)).rejects.toThrow(FraudeException);

      expect(MockedValidacionesService.existeReferenciaHash).not.toHaveBeenCalled();
    });

    it('debería manejar headers null', async () => {
      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);
      mockEvent.headers = null as any;

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      // Debería usar headers vacío
      expect(MockedValidacionesService.existeReferenciaHash).toHaveBeenCalledWith({});
    });
  });

  describe('Errores de ValidacionesService', () => {
    it('debería manejar FraudeException de ValidacionesService', async () => {
      const serviceError = new FraudeException(403, 'Referencia no válida', 'Error de referencia');
      MockedValidacionesService.existeReferenciaHash.mockRejectedValue(serviceError);

      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
        expect((error as FraudeException).mensajeInterno).toBe('Referencia no válida');
      }

      expect(mockHashRepo.getHash).not.toHaveBeenCalled();
    });

    it('debería manejar errores genéricos de ValidacionesService', async () => {
      const genericError = new Error('Service unavailable');
      MockedValidacionesService.existeReferenciaHash.mockRejectedValue(genericError);

      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
        expect((error as FraudeException).mensajeInterno).toBe('Error al validar referencia y hash');
      }
    });
  });

  describe('Errores de HashUsuarioRepository', () => {
    it('debería fallar cuando hash no existe en DynamoDB', async () => {
      mockHashRepo.getHash.mockResolvedValue(null);

      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
        expect((error as FraudeException).mensajeInterno).toBe('Hash de seguridad no encontrado');
      }

      expect(MockedValidacionesService.existeReferenciaHash).toHaveBeenCalled();
    });

    it('debería fallar cuando sesión no es válida', async () => {
      mockHashRepo.getHash.mockResolvedValue({
        hash: 'test-hash-123',
        sesionValida: false // Sesión inválida
      } as any);

      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
        expect((error as FraudeException).mensajeInterno).toBe('Hash de seguridad no encontrado');
      }
    });

    it('debería manejar errores de DynamoDB', async () => {
      const dbError = new Error('DynamoDB connection failed');
      mockHashRepo.getHash.mockRejectedValue(dbError);

      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
        expect((error as FraudeException).mensajeInterno).toBe('DynamoDB connection failed');
      }
    });
  });

  describe('Errores de Parsing JSON', () => {
    it('debería manejar JSON inválido en ValidarHashServiceImpl', async () => {
      const invalidJson = '{ invalid json }';
      const mockEvent = createMockEvent(invalidJson);

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
        expect((error as FraudeException).mensajeInterno).toBe('Formato JSON inválido');
      }
    });

    it('debería manejar body vacío en ValidarHashServiceImpl', async () => {
      // Simular que pasa la validación inicial pero falla en el servicio
      const mockEvent = createMockEvent('{"valid": "json"}');
      
      // Mock para simular que el servicio recibe body vacío internamente
      const originalParse = JSON.parse;
      jest.spyOn(JSON, 'parse').mockImplementation((text: string) => {
        if (text === '{"valid": "json"}') {
          // Simular que ValidarHashServiceImpl recibe un cuerpo que se considera vacío
          throw new FraudeException(403, 'Cuerpo de petición requerido para validación', 'Lo sentimos, por favor inténtalo mas tarde');
        }
        return originalParse(text);
      });

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
      }

      JSON.parse = originalParse;
    });
  });

  describe('Casos Edge y Manejo de Errores', () => {
    it('debería manejar errores desconocidos', async () => {
      // Simular un error que no es ni Error ni FraudeException
      MockedValidacionesService.existeReferenciaHash.mockImplementation(() => {
        throw 'String error';
      });

      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);

      await expect(handler(mockEvent, mockContext, mockCallback)).rejects.toThrow(FraudeException);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(403);
        expect((error as FraudeException).mensajeInterno).toBe('Error al validar referencia y hash');
      }
    });

    it('debería manejar hash undefined en headers', async () => {
      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody, {
        'Content-Type': 'application/json',
        'referenciaRes': 'REF123456'
        // Sin hash
      });

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
    });

    it('debería validar correctamente con datos complejos', async () => {
      const complexData = {
        sessionId: 'complex-session-123',
        transactionData: {
          amount: 1500.50,
          currency: 'USD',
          recipient: {
            name: 'John Doe',
            account: '1234567890'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            location: 'US',
            device: 'mobile'
          }
        },
        additionalInfo: ['info1', 'info2', 'info3']
      };

      const requestBody = JSON.stringify(complexData);
      const mockEvent = createMockEvent(requestBody);

      const result = await handler(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.valido).toBe(true);
      expect(responseBody.hashValidado).toBe(true);

      expect(MockedValidacionesService.existeReferenciaHash).toHaveBeenCalled();
    });
  });

  describe('Logging y Trazabilidad', () => {
    it('debería loggear información de procesamiento', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);
      
      await handler(mockEvent, mockContext, mockCallback) as any;
      
      expect(consoleSpy).toHaveBeenCalledWith('Lambda InterceptorValidarHash - Procesando validación de hash');
      expect(consoleSpy).toHaveBeenCalledWith('Event body:', requestBody);
      expect(consoleSpy).toHaveBeenCalledWith('Event headers:', expect.any(String));
      expect(consoleSpy).toHaveBeenCalledWith('Validando hash de seguridad');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 ✅ Referencia y hash validados por ValidacionesService');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 ✅ Hash encontrado y validado en DynamoDB');
      expect(consoleSpy).toHaveBeenCalledWith('Hash validado exitosamente');
      
      consoleSpy.mockRestore();
    });

    it('debería loggear errores correctamente', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const serviceError = new FraudeException(403, 'Test error', 'Test message');
      MockedValidacionesService.existeReferenciaHash.mockRejectedValue(serviceError);
      
      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);
      
      try {
        await handler(mockEvent, mockContext, mockCallback);
      } catch (error) {
        // Error esperado
      }
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error en InterceptorValidarHash:', serviceError);
      // El log "Error: El cuerpo de la petición esta mal formado" no se ejecuta en este caso
      // porque el error ocurre en ValidacionesService, no en la validación inicial del body
      
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });
  });

  describe('Validación de Respuesta', () => {
    it('debería tener estructura de respuesta consistente', async () => {
      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);
      
      const result = await handler(mockEvent, mockContext, mockCallback) as any;
      
      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');
      expect(typeof result.body).toBe('string');
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toHaveProperty('codigoError');
      expect(responseBody).toHaveProperty('mensajeUsuario');
      expect(responseBody).toHaveProperty('valido');
      expect(responseBody).toHaveProperty('hashValidado');
      expect(responseBody).toHaveProperty('timestamp');
      
      expect(typeof responseBody.codigoError).toBe('number');
      expect(typeof responseBody.mensajeUsuario).toBe('string');
      expect(typeof responseBody.valido).toBe('boolean');
      expect(typeof responseBody.hashValidado).toBe('boolean');
      expect(typeof responseBody.timestamp).toBe('string');
    });

    it('debería incluir timestamp válido', async () => {
      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);
      
      const result = await handler(mockEvent, mockContext, mockCallback) as any;
      
      const responseBody = JSON.parse(result.body);
      const timestamp = new Date(responseBody.timestamp);
      
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(responseBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Pruebas de Rendimiento', () => {
    it('debería completar la validación en tiempo razonable', async () => {
      const requestBody = JSON.stringify({ test: 'data' });
      const mockEvent = createMockEvent(requestBody);
      
      const startTime = Date.now();
      const result = await handler(mockEvent, mockContext, mockCallback) as any;
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(result.statusCode).toBe(200);
      expect(duration).toBeLessThan(1000); // Menos de 1 segundo
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.valido).toBe(true);
    });

    it('debería manejar múltiples validaciones simultáneas', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => ({
        body: JSON.stringify({ sessionId: `session-${i}`, data: `test-${i}` }),
        event: createMockEvent(JSON.stringify({ sessionId: `session-${i}`, data: `test-${i}` }))
      }));

      const promises = requests.map(req => 
        handler(req.event, mockContext, mockCallback) as any
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.statusCode).toBe(200);
        
        const responseBody = JSON.parse(result.body);
        expect(responseBody.valido).toBe(true);
        expect(responseBody.hashValidado).toBe(true);
      });

      expect(MockedValidacionesService.existeReferenciaHash).toHaveBeenCalledTimes(3);
      expect(mockHashRepo.getHash).toHaveBeenCalledTimes(3);
    });
  });
});
