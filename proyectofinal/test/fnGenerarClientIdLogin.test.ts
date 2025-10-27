import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { fnGenerarClientIdLogin } from '../src/functions/fnGenerarClientIdLogin';
import { AuthService } from '../src/services/AuthService.GenerarClientId';
import { FraudeException } from '../src/errors';
import { Constants } from '../src/constant/Constants';
import { Util } from '../src/utils/utils';

// Mocks
jest.mock('../src/services/AuthService.GenerarClientId');
jest.mock('../src/utils/utils');
jest.mock('aws-xray-sdk-core', () => {
  const mockSegment = {
    addNewSubsegment: jest.fn().mockReturnValue({
      addError: jest.fn(),
      close: jest.fn()
    }),
    close: jest.fn()
  };
  return {
    getSegment: jest.fn().mockReturnValue(mockSegment),
    captureHTTPsGlobal: jest.fn()
  };
});
jest.mock('aws-xray-sdk', () => ({
  captureHTTPsGlobal: jest.fn()
}));

const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const MockedUtil = Util as jest.MockedClass<typeof Util>;

describe('CDM-2680: fnGenerarClientIdLogin', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;
  let mockCallback: Callback;

  const createMockEvent = (body?: string | null, headers?: any): APIGatewayProxyEvent => ({
    body: body || null,
    headers: headers || {
      'Content-Type': 'application/json',
      'identificacion': '1234567890',
      'secuencial': '12345'
    },
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/generar-client-id',
    pathParameters: null,
    queryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      httpMethod: 'POST',
      path: '/generar-client-id',
      stage: 'test',
      requestId: 'test-request-id',
      requestTime: '09/Sep/2023:12:34:56 +0000',
      requestTimeEpoch: 1694522096,
      resourceId: 'test-resource',
      resourcePath: '/generar-client-id',
      identity: {
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
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
        clientCert: null
      },
      authorizer: null,
      protocol: 'HTTP/1.1'
    },
    resource: '/generar-client-id',
    multiValueHeaders: {},
    multiValueQueryStringParameters: null
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock del contexto de Lambda
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'fnGenerarClientIdLogin',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:fnGenerarClientIdLogin',
      memoryLimitInMB: '256',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/fnGenerarClientIdLogin',
      logStreamName: '2023/09/12/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn()
    };

    mockCallback = jest.fn();

    // Mock del AuthService
    mockAuthService = {
      generarAutorizacion: jest.fn(),
      generarClientId: jest.fn(),
      guardarTokenSesion: jest.fn(),
      peticionLogin: jest.fn()
    } as unknown as jest.Mocked<AuthService>;
    MockedAuthService.mockImplementation(() => mockAuthService);

    // Mock de Util
    (MockedUtil.getResponseHeader as jest.Mock).mockReturnValue({
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

    // Mock exitoso por defecto
    mockAuthService.peticionLogin.mockResolvedValue({
      body: JSON.stringify({
        codigoError: 0,
        mensajeUsuario: 'Login exitoso',
        mensajeSistema: 'Usuario autenticado correctamente',
        clientId: 'test-client-id-12345',
        sesionUnica: {
          sessionId: 'session-123',
          token: 'token-456',
          uriTech: '/api/test'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      })
    });

    mockEvent = createMockEvent();
  });

  describe('Casos Exitosos', () => {
    it('debería generar clientId exitosamente', async () => {
      const requestBody = JSON.stringify({
        usuario: 'test_user',
        clave: 'test_password',
        tipoIdentificacion: 'C',
        identificacion: '1234567890'
      });

      mockEvent = createMockEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });

      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.mensajeUsuario).toBe('Login exitoso');
      expect(responseBody.clientId).toBe('test-client-id-12345');
      expect(responseBody.sesionUnica).toBeDefined();
      expect(responseBody.cliente).toBeDefined();

      expect(mockAuthService.peticionLogin).toHaveBeenCalledWith(requestBody, mockEvent.headers);
    });

    it('debería manejar headers personalizados correctamente', async () => {
      const customHeaders = {
        'Content-Type': 'application/json',
        'identificacion': '0987654321',
        'secuencial': '54321',
        'user-agent': 'mobile-app/1.0'
      };

      const requestBody = JSON.stringify({
        usuario: 'mobile_user',
        clave: 'mobile_pass',
        tipoIdentificacion: 'C',
        identificacion: '0987654321'
      });

      mockEvent = createMockEvent(requestBody, customHeaders);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      expect(mockAuthService.peticionLogin).toHaveBeenCalledWith(requestBody, customHeaders);
    });

    it('debería incluir todos los datos de respuesta del servicio', async () => {
      const complexResponseBody = JSON.stringify({
        codigoError: 0,
        mensajeUsuario: 'Autenticación exitosa',
        mensajeSistema: 'Usuario válido',
        clientId: 'complex-client-id-789',
        sesionUnica: {
          sessionId: 'complex-session-456',
          token: 'complex-token-789',
          uriTech: '/api/complex'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'P',
            identificacion: '1234567890123'
          },
          nombre: 'Usuario Test',
          email: 'test@example.com'
        },
        metadata: {
          timestamp: '2023-09-12T10:30:00Z',
          version: '1.0'
        }
      });

      mockAuthService.peticionLogin.mockResolvedValue({
        body: complexResponseBody
      });

      const requestBody = JSON.stringify({
        usuario: 'complex_user',
        clave: 'complex_pass'
      });

      mockEvent = createMockEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe(complexResponseBody);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.clientId).toBe('complex-client-id-789');
      expect(responseBody.metadata).toBeDefined();
      expect(responseBody.cliente.nombre).toBe('Usuario Test');
    });
  });

  describe('Validaciones de Entrada', () => {
    it('debería fallar cuando no se proporciona body', async () => {
      mockEvent = createMockEvent(null);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999); // Se captura en catch y se convierte a 9999
      expect(responseBody.mensajeUsuario).toBe('No pudimos procesar tu información, por favor inténtalo mas tarde');
      expect(responseBody.mensajeSistema).toBe('No se proporcionó el cuerpo de la petición');

      expect(mockAuthService.peticionLogin).not.toHaveBeenCalled();
    });

    it('debería fallar cuando el body está vacío', async () => {
      mockEvent = createMockEvent('');

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999); // Se captura en catch y se convierte a 9999
      expect(responseBody.mensajeUsuario).toBe('No pudimos procesar tu información, por favor inténtalo mas tarde');

      expect(mockAuthService.peticionLogin).not.toHaveBeenCalled();
    });

    it('debería procesar body con solo espacios (comportamiento real)', async () => {
      // La función real procesa espacios en blanco como válidos porque no son falsy
      mockEvent = createMockEvent('   ');

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0); // Se procesa exitosamente

      expect(mockAuthService.peticionLogin).toHaveBeenCalledWith('   ', mockEvent.headers);
    });
  });

  describe('Manejo de Errores del Servicio', () => {
    it('debería manejar FraudeException correctamente', async () => {
      const fraudeError = new FraudeException(9403, 'Credenciales inválidas', 'Usuario no autorizado');
      mockAuthService.peticionLogin.mockRejectedValue(fraudeError);

      const requestBody = JSON.stringify({
        usuario: 'invalid_user',
        clave: 'wrong_password'
      });

      mockEvent = createMockEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999);
      expect(responseBody.mensajeUsuario).toBe(Constants.MSG_ERROR_USUARIO_GENERAL);
      expect(responseBody.mensajeSistema).toBe('Credenciales inválidas');
    });

    it('debería manejar errores genéricos', async () => {
      const genericError = new Error('Error de conexión a base de datos');
      mockAuthService.peticionLogin.mockRejectedValue(genericError);

      const requestBody = JSON.stringify({
        usuario: 'test_user',
        clave: 'test_password'
      });

      mockEvent = createMockEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999);
      expect(responseBody.mensajeUsuario).toBe(Constants.MSG_ERROR_USUARIO_GENERAL);
      expect(responseBody.mensajeSistema).toBe('Error de conexión a base de datos');
    });

    it('debería manejar errores de timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockAuthService.peticionLogin.mockRejectedValue(timeoutError);

      const requestBody = JSON.stringify({
        usuario: 'test_user',
        clave: 'test_password'
      });

      mockEvent = createMockEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999);
      expect(responseBody.mensajeSistema).toBe('Request timeout');
    });

    it('debería manejar errores sin mensaje', async () => {
      const errorWithoutMessage = new Error();
      mockAuthService.peticionLogin.mockRejectedValue(errorWithoutMessage);

      const requestBody = JSON.stringify({
        usuario: 'test_user',
        clave: 'test_password'
      });

      mockEvent = createMockEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999);
      expect(responseBody.mensajeSistema).toBe('');
    });
  });

  describe('Casos Edge', () => {
    it('debería manejar body con caracteres especiales', async () => {
      const specialCharsBody = JSON.stringify({
        usuario: 'test@user.com',
        clave: 'P@ssw0rd!#$%',
        tipoIdentificacion: 'C',
        identificacion: '1234567890'
      });

      mockEvent = createMockEvent(specialCharsBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      expect(mockAuthService.peticionLogin).toHaveBeenCalledWith(specialCharsBody, mockEvent.headers);
    });

    it('debería manejar headers sin identificacion', async () => {
      const headersWithoutId = {
        'Content-Type': 'application/json',
        'secuencial': '12345'
      };

      const requestBody = JSON.stringify({
        usuario: 'test_user',
        clave: 'test_password'
      });

      mockEvent = createMockEvent(requestBody, headersWithoutId);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      expect(mockAuthService.peticionLogin).toHaveBeenCalledWith(requestBody, headersWithoutId);
    });

    it('debería manejar respuesta con clientId vacío', async () => {
      mockAuthService.peticionLogin.mockResolvedValue({
        body: JSON.stringify({
          codigoError: 0,
          mensajeUsuario: 'Login exitoso',
          clientId: '',
          sesionUnica: {
            sessionId: 'session-123',
            token: 'token-456',
            uriTech: '/api/test'
          }
        })
      });

      const requestBody = JSON.stringify({
        usuario: 'test_user',
        clave: 'test_password'
      });

      mockEvent = createMockEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.clientId).toBe('');
    });
  });

  describe('Logging y Debugging', () => {
    it('debería registrar headers y body del evento', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const requestBody = JSON.stringify({
        usuario: 'debug_user',
        clave: 'debug_password'
      });

      mockEvent = createMockEvent(requestBody);

      await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith('Event header:', mockEvent.headers);
      expect(consoleSpy).toHaveBeenCalledWith('Event body:', requestBody);

      consoleSpy.mockRestore();
    });

    it('debería registrar respuesta exitosa', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const responseData = {
        codigoError: 0,
        mensajeUsuario: 'Login exitoso',
        clientId: 'logged-client-id'
      };

      mockAuthService.peticionLogin.mockResolvedValue({
        body: JSON.stringify(responseData)
      });

      const requestBody = JSON.stringify({
        usuario: 'log_user',
        clave: 'log_password'
      });

      mockEvent = createMockEvent(requestBody);

      await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith(
        'ClientId generado correctamente: ' + JSON.stringify({ body: JSON.stringify(responseData) })
      );

      consoleSpy.mockRestore();
    });

    it('debería registrar errores', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error for logging');
      mockAuthService.peticionLogin.mockRejectedValue(error);

      const requestBody = JSON.stringify({
        usuario: 'error_user',
        clave: 'error_password'
      });

      mockEvent = createMockEvent(requestBody);

      await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error en fnGenerarClientIdLogin:', error);

      consoleErrorSpy.mockRestore();
    });
  });
});
