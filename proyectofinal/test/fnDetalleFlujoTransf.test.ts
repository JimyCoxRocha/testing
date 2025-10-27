import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/functions/fnDetalleFlujoTransf';
import { FraudeException, IntegrationException } from '../src/errors';
import { Constants } from '../src/constant/Constants';
import { DiccionarioMensajes } from '../src/constant/response-dictionary';

// Mock de AWS X-Ray
jest.mock('aws-xray-sdk-core', () => ({
  getSegment: jest.fn().mockReturnValue({
    addNewSubsegment: jest.fn().mockReturnValue({
      addError: jest.fn(),
      close: jest.fn()
    }),
    close: jest.fn()
  }),
  captureHTTPsGlobal: jest.fn()
}));

jest.mock('aws-xray-sdk', () => ({
  captureHTTPsGlobal: jest.fn()
}));

// Mock de crypto
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('mocked-hash-value')
    })
  }),
  // Mock para randomBytes usado en generateTransactionId y generateTransactionHash
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('abc123def456')
  })
}));

// Mock de http y https
jest.mock('http', () => ({}));
jest.mock('https', () => ({}));

// Mock del servicio de configuración
const mockProcesarFlujo = jest.fn();
jest.mock('../src/services/ConfiguracionFlujoService', () => {
  return jest.fn().mockImplementation(() => ({
    procesarFlujo: mockProcesarFlujo
  }));
});

describe('CDM-2680: fnDetalleFlujoTransf - Tests Completos', () => {
  const createMockEvent = (customBody?: any, customHeaders?: any, customResource?: string): APIGatewayProxyEvent => ({
    body: customBody ? JSON.stringify(customBody) : JSON.stringify({
      usuario: 'testuser',
      monto: 100.00,
      cuentaOrigen: '1234567890',
      cuentaDestino: '0987654321'
    }),
    headers: customHeaders || {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: customResource || '/api/transferencia',
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
      path: customResource || '/api/transferencia',
      resourceId: 'test-resource',
      resourcePath: customResource || '/api/transferencia',
      httpMethod: 'POST',
      protocol: 'HTTP/1.1',
      authorizer: null
    },
    resource: customResource || '/api/transferencia',
    multiValueHeaders: {},
    multiValueQueryStringParameters: null
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Configurar respuesta por defecto del mock
    mockProcesarFlujo.mockResolvedValue({
      accion: 'TRANSFERENCIA',
      configuracion: {
        accion: 'TRANSFERENCIA',
        urlServicio: 'https://test-service.com/api',
        acciones: ['validarHash', 'llamarServicioUrl'],
        validarHash: true,
        llamarServicioUrl: true,
        borrarHash: false,
        crearClientId: false,
        validarClientId: false,
        requiereAutorizacion: true
      },
      nextSteps: ['validarHash', 'llamarServicioUrl'],
      shouldContinue: true
    });
  });

  describe('Casos Exitosos', () => {
    it('debería procesar exitosamente una transferencia', async () => {
      const mockEvent = createMockEvent();

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.body.codigoError).toBe(0);
      expect(result.body.mensajeUsuario).toBe('Detalle flujo TRANSFERENCIA validado exitosamente');
      expect(result.body.data.accion).toBe('TRANSFERENCIA');
      expect(result.body.data.transactionId).toMatch(/^TXN_/);
      expect(result.body.data.hash).toBe('mocked-hash-value');
      expect(result.body.data.shouldContinue).toBe(true);
    });

    it('debería procesar una consulta de saldo', async () => {
      mockProcesarFlujo.mockResolvedValue({
        accion: 'CONSULTA_SALDO',
        configuracion: {
          accion: 'CONSULTA_SALDO',
          urlServicio: 'https://test-service.com/saldo',
          acciones: ['validarClientId'],
          validarHash: false,
          llamarServicioUrl: true,
          borrarHash: false,
          crearClientId: false,
          validarClientId: true,
          requiereAutorizacion: true
        },
        nextSteps: ['validarClientId'],
        shouldContinue: true
      });

      const mockEvent = createMockEvent(
        { usuario: 'testuser', cuenta: '1234567890' },
        { 'Content-Type': 'application/json' },
        '/api/consulta-saldo'
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.body.codigoError).toBe(0);
      expect(result.body.data.accion).toBe('CONSULTA_SALDO');
      expect(result.body.data.urlServicio).toBe('https://test-service.com/saldo');
      expect(result.body.data.configuracion.validarClientId).toBe(true);
      expect(result.body.data.configuracion.validarHash).toBe(false);
    });

    it('debería manejar diferentes tipos de recursos', async () => {
      const recursos = [
        '/api/transferencia',
        '/api/consulta-saldo',
        '/api/pago-servicios',
        '/api/recargas'
      ];

      for (const recurso of recursos) {
        const mockEvent = createMockEvent(undefined, undefined, recurso);
        const result = await handler(mockEvent);

        expect(result.statusCode).toBe(200);
        expect(result.body.codigoError).toBe(0);
        expect(mockProcesarFlujo).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          recurso
        );
      }
    });
  });

  describe('Validación de Entrada', () => {
    it('debería fallar cuando no se proporciona body', async () => {
      const mockEvent = createMockEvent();
      mockEvent.body = null;

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      expect(result.body.codigoError).toBe(403);
      expect(result.body.mensajeUsuario).toBe(DiccionarioMensajes.msgErrorUsuarioGeneral);
    });

    it('debería fallar cuando no se proporciona resource', async () => {
      const mockEvent = createMockEvent();
      mockEvent.resource = null as any;

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      expect(result.body.codigoError).toBe(403);
      expect(result.body.mensajeUsuario).toBe(DiccionarioMensajes.msgErrorUsuarioGeneral);
    });

    it('debería fallar cuando el body no es JSON válido', async () => {
      const mockEvent = createMockEvent();
      mockEvent.body = '{ invalid json }';

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      expect(result.body.codigoError).toBe(403);
      expect(result.body.mensajeUsuario).toBe(DiccionarioMensajes.msgErrorUsuarioGeneral);
    });

    it('debería procesar body cuando viene como object (desde Step Function)', async () => {
      const mockEvent = createMockEvent();
      // Simular que viene de Step Function donde body es object
      mockEvent.body = {
        usuario: 'stepfunction-user',
        monto: 200.00
      } as any;

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.body.codigoError).toBe(0);
      expect(result.body.data.accion).toBe('TRANSFERENCIA');
    });
  });

  describe('Manejo de Errores', () => {
    it('debería manejar FraudeException correctamente', async () => {
      const fraudeError = new FraudeException(403, 'Test fraude error', 'Error de fraude para usuario');
      mockProcesarFlujo.mockRejectedValue(fraudeError);

      const mockEvent = createMockEvent();
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      expect(result.body.codigoError).toBe(403);
      expect(result.body.mensajeUsuario).toBe('Error de fraude para usuario');
    });

    it('debería manejar IntegrationException correctamente', async () => {
      const integrationError = new IntegrationException(502, 'Test integration error', 'Error de integración');
      mockProcesarFlujo.mockRejectedValue(integrationError);

      const mockEvent = createMockEvent();
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(502);
      expect(result.body.codigoError).toBe(502);
      expect(result.body.mensajeUsuario).toBe('Error de integración');
    });

    it('debería manejar SyntaxError correctamente', async () => {
      const syntaxError = new SyntaxError('Invalid JSON syntax');
      mockProcesarFlujo.mockRejectedValue(syntaxError);

      const mockEvent = createMockEvent();
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      expect(result.body.codigoError).toBe(9400);
      expect(result.body.mensajeUsuario).toBe('Formato JSON inválido');
    });

    it('debería manejar errores genéricos', async () => {
      const genericError = new Error('Generic test error');
      mockProcesarFlujo.mockRejectedValue(genericError);

      const mockEvent = createMockEvent();
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      expect(result.body.codigoError).toBe(9999);
      expect(result.body.mensajeUsuario).toBe('Generic test error');
    });
  });

  describe('Casos de Datos Complejos', () => {
    it('debería manejar datos grandes', async () => {
      const largeData = {
        usuario: 'testuser',
        monto: 1000000.00,
        descripcion: 'x'.repeat(5000), // String muy largo
        metadata: Array(100).fill({ key: 'value', timestamp: Date.now() })
      };

      const mockEvent = createMockEvent(largeData);
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.body.codigoError).toBe(0);
      expect(result.body.data.transactionId).toMatch(/^TXN_/);
    });

    it('debería manejar caracteres especiales', async () => {
      const specialData = {
        usuario: 'test@user.com',
        descripcion: 'Pago con ñ, é, ü y símbolos: @#$%^&*()',
        concepto: '测试数据 🏦💰'
      };

      const mockEvent = createMockEvent(specialData);
      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.body.codigoError).toBe(0);
      expect(result.body.data.hash).toBe('mocked-hash-value');
    });
  });

  describe('Pruebas de Concurrencia', () => {
    it('debería manejar múltiples requests simultáneos', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const mockEvent = createMockEvent({
          usuario: `user${i}`,
          monto: 100 * (i + 1)
        });
        promises.push(handler(mockEvent));
      }

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.statusCode).toBe(200);
        expect(result.body.codigoError).toBe(0);
        expect(result.body.data.transactionId).toMatch(/^TXN_/);
      });

      expect(mockProcesarFlujo).toHaveBeenCalledTimes(5);
    });
  });

  describe('Configuraciones Específicas', () => {
    it('debería configurar correctamente para recargas móviles', async () => {
      mockProcesarFlujo.mockResolvedValue({
        accion: 'RECARGA_MOVIL',
        configuracion: {
          accion: 'RECARGA_MOVIL',
          urlServicio: 'https://test-service.com/recargas',
          acciones: ['validarHash', 'crearClientId'],
          validarHash: true,
          llamarServicioUrl: true,
          borrarHash: true,
          crearClientId: true,
          validarClientId: false,
          requiereAutorizacion: false
        },
        nextSteps: ['validarHash', 'crearClientId'],
        shouldContinue: true
      });

      const mockEvent = createMockEvent(
        { telefono: '0999123456', operadora: 'CLARO', monto: 5.00 },
        { 'Content-Type': 'application/json' },
        '/api/recargas'
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.body.data.accion).toBe('RECARGA_MOVIL');
      expect(result.body.data.configuracion.crearClientId).toBe(true);
      expect(result.body.data.configuracion.borrarHash).toBe(true);
      expect(result.body.data.configuracion.requiereAutorizacion).toBe(false);
    });

    it('debería configurar correctamente para pagos de servicios', async () => {
      mockProcesarFlujo.mockResolvedValue({
        accion: 'PAGO_SERVICIOS',
        configuracion: {
          accion: 'PAGO_SERVICIOS',
          urlServicio: 'https://test-service.com/pagos',
          acciones: ['validarClientId', 'llamarServicioUrl'],
          validarHash: false,
          llamarServicioUrl: true,
          borrarHash: false,
          crearClientId: false,
          validarClientId: true,
          requiereAutorizacion: true
        },
        nextSteps: ['validarClientId', 'llamarServicioUrl'],
        shouldContinue: true
      });

      const mockEvent = createMockEvent(
        { empresa: 'EMELEC', cuenta: '123456789', monto: 45.67 },
        { 'Content-Type': 'application/json', 'clientId': 'test-client-123' },
        '/api/pago-servicios'
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.body.data.accion).toBe('PAGO_SERVICIOS');
      expect(result.body.data.configuracion.validarClientId).toBe(true);
      expect(result.body.data.configuracion.validarHash).toBe(false);
    });
  });
});
