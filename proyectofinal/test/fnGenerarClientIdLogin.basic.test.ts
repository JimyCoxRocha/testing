import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { fnGenerarClientIdLogin } from '../src/functions/fnGenerarClientIdLogin';
import { AuthService } from '../src/services/AuthService.GenerarClientId';
import { Util } from '../src/utils/utils';

// Mocks simplificados
jest.mock('../src/services/AuthService.GenerarClientId');
jest.mock('../src/utils/utils');
jest.mock('aws-xray-sdk-core', () => ({
  getSegment: jest.fn().mockReturnValue({
    addNewSubsegment: jest.fn().mockReturnValue({
      addError: jest.fn(),
      close: jest.fn()
    })
  })
}));
jest.mock('aws-xray-sdk', () => ({
  captureHTTPsGlobal: jest.fn()
}));

const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;
const MockedUtil = Util as jest.MockedClass<typeof Util>;

describe('CDM-2680: fnGenerarClientIdLogin - Tests Básicos', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;
  let mockCallback: Callback;

  const createBasicEvent = (body?: string | null): APIGatewayProxyEvent => ({
    body: body || null,
    headers: {
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

    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'fnGenerarClientIdLogin',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:fnGenerarClientIdLogin',
      memoryLimitInMB: '256',
      awsRequestId: 'basic-test-request-id',
      logGroupName: '/aws/lambda/fnGenerarClientIdLogin',
      logStreamName: '2023/09/12/[$LATEST]basic-stream',
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, identificacion, secuencial'
      }
    });

    // Mock exitoso por defecto
    mockAuthService.peticionLogin.mockResolvedValue({
      body: JSON.stringify({
        codigoError: 0,
        mensajeUsuario: 'Login básico exitoso',
        mensajeSistema: 'Autenticación completada',
        clientId: 'basic-test-client-id-123',
        sesionUnica: {
          sessionId: 'basic-session-456',
          token: 'basic-token-789',
          uriTech: '/api/basic'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      })
    });

    mockEvent = createBasicEvent();
  });

  describe('Funcionalidad Básica', () => {
    it('debería generar clientId con datos mínimos', async () => {
      const simpleBody = JSON.stringify({
        usuario: 'basic_user',
        clave: 'basic_pass'
      });

      mockEvent = createBasicEvent(simpleBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.clientId).toBe('basic-test-client-id-123');
      expect(responseBody.sesionUnica).toBeDefined();

      expect(mockAuthService.peticionLogin).toHaveBeenCalledWith(simpleBody, mockEvent.headers);
    });

    it('debería retornar headers CORS correctos', async () => {
      const requestBody = JSON.stringify({
        usuario: 'cors_user',
        clave: 'cors_pass'
      });

      mockEvent = createBasicEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, identificacion, secuencial'
      });
    });

    it('debería procesar login con identificación de cédula', async () => {
      const cedulaBody = JSON.stringify({
        usuario: 'cedula_user',
        clave: 'cedula_pass',
        tipoIdentificacion: 'C',
        identificacion: '1234567890'
      });

      mockEvent = createBasicEvent(cedulaBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.cliente.identificacion.tipoIdentificacion).toBe('C');
      expect(responseBody.cliente.identificacion.identificacion).toBe('1234567890');
    });

    it('debería procesar login con identificación de pasaporte', async () => {
      const pasaporteResponse = {
        body: JSON.stringify({
          codigoError: 0,
          mensajeUsuario: 'Login exitoso',
          clientId: 'passport-client-id',
          sesionUnica: {
            sessionId: 'passport-session',
            token: 'passport-token',
            uriTech: '/api/passport'
          },
          cliente: {
            identificacion: {
              tipoIdentificacion: 'P',
              identificacion: '1234567890123'
            }
          }
        })
      };

      mockAuthService.peticionLogin.mockResolvedValue(pasaporteResponse);

      const pasaporteBody = JSON.stringify({
        usuario: 'passport_user',
        clave: 'passport_pass',
        tipoIdentificacion: 'P',
        identificacion: '1234567890123'
      });

      mockEvent = createBasicEvent(pasaporteBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.cliente.identificacion.tipoIdentificacion).toBe('P');
      expect(responseBody.cliente.identificacion.identificacion).toBe('1234567890123');
    });
  });

  describe('Validaciones Simples', () => {
    it('debería rechazar request sin body', async () => {
      mockEvent = createBasicEvent(null);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999); // Se captura en catch y se convierte a 9999
      expect(responseBody.mensajeSistema).toBe('No se proporcionó el cuerpo de la petición');

      expect(mockAuthService.peticionLogin).not.toHaveBeenCalled();
    });

    it('debería rechazar body vacío', async () => {
      mockEvent = createBasicEvent('');

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999); // Se captura en catch y se convierte a 9999
      expect(responseBody.mensajeSistema).toBe('No se proporcionó el cuerpo de la petición');

      expect(mockAuthService.peticionLogin).not.toHaveBeenCalled();
    });

    it('debería procesar body con solo espacios (comportamiento real)', async () => {
      // La función real procesa espacios en blanco como válidos porque no son falsy
      mockEvent = createBasicEvent('   ');

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0); // Se procesa exitosamente

      expect(mockAuthService.peticionLogin).toHaveBeenCalledWith('   ', mockEvent.headers);
    });
  });

  describe('Manejo de Errores Simples', () => {
    it('debería manejar error genérico', async () => {
      mockAuthService.peticionLogin.mockRejectedValue(new Error('Error simple de prueba'));

      const requestBody = JSON.stringify({
        usuario: 'error_user',
        clave: 'error_pass'
      });

      mockEvent = createBasicEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999);
      expect(responseBody.mensajeSistema).toBe('Error simple de prueba');
    });

    it('debería manejar error sin mensaje', async () => {
      mockAuthService.peticionLogin.mockRejectedValue(new Error());

      const requestBody = JSON.stringify({
        usuario: 'no_message_user',
        clave: 'no_message_pass'
      });

      mockEvent = createBasicEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(9999);
      expect(responseBody.mensajeSistema).toBe('');
    });
  });

  describe('Casos de Respuesta', () => {
    it('debería incluir todos los campos de respuesta básicos', async () => {
      const completeResponse = {
        body: JSON.stringify({
          codigoError: 0,
          mensajeUsuario: 'Autenticación completa',
          mensajeSistema: 'Usuario validado exitosamente',
          clientId: 'complete-client-id-789',
          sesionUnica: {
            sessionId: 'complete-session-123',
            token: 'complete-token-456',
            uriTech: '/api/complete'
          },
          cliente: {
            identificacion: {
              tipoIdentificacion: 'C',
              identificacion: '1234567890'
            },
            nombre: 'Usuario Completo',
            estado: 'ACTIVO'
          },
          timestamp: '2023-09-12T10:30:00Z'
        })
      };

      mockAuthService.peticionLogin.mockResolvedValue(completeResponse);

      const requestBody = JSON.stringify({
        usuario: 'complete_user',
        clave: 'complete_pass'
      });

      mockEvent = createBasicEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe(completeResponse.body);

      const responseBody = JSON.parse(result.body);
      expect(responseBody.codigoError).toBe(0);
      expect(responseBody.clientId).toBe('complete-client-id-789');
      expect(responseBody.cliente.nombre).toBe('Usuario Completo');
      expect(responseBody.timestamp).toBe('2023-09-12T10:30:00Z');
    });

    it('debería manejar respuesta con clientId nulo', async () => {
      const nullClientIdResponse = {
        body: JSON.stringify({
          codigoError: 0,
          mensajeUsuario: 'Login exitoso',
          clientId: null,
          sesionUnica: {
            sessionId: 'null-session',
            token: 'null-token',
            uriTech: '/api/null'
          }
        })
      };

      mockAuthService.peticionLogin.mockResolvedValue(nullClientIdResponse);

      const requestBody = JSON.stringify({
        usuario: 'null_client_user',
        clave: 'null_client_pass'
      });

      mockEvent = createBasicEvent(requestBody);

      const result = await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback) as any;

      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.clientId).toBeNull();
    });
  });

  describe('Logging Básico', () => {
    it('debería logear evento de entrada', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const requestBody = JSON.stringify({
        usuario: 'log_test_user',
        clave: 'log_test_pass'
      });

      mockEvent = createBasicEvent(requestBody);

      await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith('Event header:', mockEvent.headers);
      expect(consoleSpy).toHaveBeenCalledWith('Event body:', requestBody);

      consoleSpy.mockRestore();
    });

    it('debería logear respuesta exitosa', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const mockResponse = {
        body: JSON.stringify({
          codigoError: 0,
          mensajeUsuario: 'Test exitoso',
          clientId: 'logged-client-id'
        })
      };

      mockAuthService.peticionLogin.mockResolvedValue(mockResponse);

      const requestBody = JSON.stringify({
        usuario: 'success_log_user',
        clave: 'success_log_pass'
      });

      mockEvent = createBasicEvent(requestBody);

      await fnGenerarClientIdLogin(mockEvent, mockContext, mockCallback);

      expect(consoleSpy).toHaveBeenCalledWith(
        'ClientId generado correctamente: ' + JSON.stringify(mockResponse)
      );

      consoleSpy.mockRestore();
    });
  });
});
