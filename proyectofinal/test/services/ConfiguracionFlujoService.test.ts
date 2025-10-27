/**
 * Unit Tests para ConfiguracionFlujoService
 * 
 * Este test cubre todas las funciones del servicio de configuración de flujo:
 * - determinarAccion: Determinación de acción basada en resource
 * - obtenerConfiguracion: Obtención de configuración para una acción
 * - procesarFlujo: Procesamiento completo del flujo
 * - validarDatosSegunAccion: Validación de datos según acción
 * - determinarProximosPasos: Determinación de próximos pasos
 * - obtenerUrlServicio: Obtención de URL de servicio
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de entrada
 * - Casos edge (valores vacíos, null, etc.)
 * - Todas las configuraciones de flujo
 */

import ConfiguracionFlujoService, { ACCION_FLUJO, IAccionConfig, IFlowResponse } from '../../src/services/ConfiguracionFlujoService';
import { APIGatewayProxyEventHeaders } from 'aws-lambda';

describe('ConfiguracionFlujoService - Unit Tests', () => {
  let configService: ConfiguracionFlujoService;
  let consoleSpy: {
    log: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de console
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };

    // Mock de process.env
    process.env.URL_SERVICIO_CONSULTA = 'https://test-consulta.com';
    process.env.URL_SERVICIO_PAGOS = 'https://test-pagos.com';
    process.env.URL_SERVICIO_AFILIACION = 'https://test-afiliacion.com';
    process.env.URL_SERVICIO_OTP = 'https://test-otp.com';
    process.env.URL_SERVICIO_GENERAR_OTP = 'https://test-generar-otp.com';

    configService = new ConfiguracionFlujoService();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('determinarAccion', () => {
    it('✅ should determine TRANSFERENCIA for transferencia resource', () => {
      // Arrange
      const resource = '/api/transferencia';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.TRANSFERENCIA);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Determinando acción para resource: ${resource}`);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Último segmento extraído: transferencia`);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.TRANSFERENCIA}`);
    });

    it('✅ should determine TRANSFERENCIA for ejecutartransferencia resource', () => {
      // Arrange
      const resource = '/api/ejecutartransferencia';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.TRANSFERENCIA);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.TRANSFERENCIA}`);
    });

    it('✅ should determine CONSULTA_SALDO for consultasaldo resource', () => {
      // Arrange
      const resource = '/api/consultasaldo';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.CONSULTA_SALDO);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.CONSULTA_SALDO}`);
    });

    it('✅ should determine CONSULTA_SALDO for obtenersaldo resource', () => {
      // Arrange
      const resource = '/api/obtenersaldo';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.CONSULTA_SALDO);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.CONSULTA_SALDO}`);
    });

    it('✅ should determine PAGO_SERVICIOS for pagoservicios resource', () => {
      // Arrange
      const resource = '/api/pagoservicios';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.PAGO_SERVICIOS);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.PAGO_SERVICIOS}`);
    });

    it('✅ should determine PAGO_SERVICIOS for pagos resource', () => {
      // Arrange
      const resource = '/api/pagos';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.PAGO_SERVICIOS);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.PAGO_SERVICIOS}`);
    });

    it('✅ should determine AFILIACION for afiliacion resource', () => {
      // Arrange
      const resource = '/api/afiliacion';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.AFILIACION);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.AFILIACION}`);
    });

    it('✅ should determine AFILIACION for afiliar resource', () => {
      // Arrange
      const resource = '/api/afiliar';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.AFILIACION);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.AFILIACION}`);
    });

    it('✅ should determine DESAFILIACION for desafiliacion resource', () => {
      // Arrange
      const resource = '/api/desafiliacion';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.DESAFILIACION);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.DESAFILIACION}`);
    });

    it('✅ should determine DESAFILIACION for desafiliar resource', () => {
      // Arrange
      const resource = '/api/desafiliar';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.DESAFILIACION);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.DESAFILIACION}`);
    });

    it('✅ should determine CAMBIO_CLAVE for cambiarclave resource', () => {
      // Arrange
      const resource = '/api/cambiarclave';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.CAMBIO_CLAVE);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.CAMBIO_CLAVE}`);
    });

    it('✅ should determine VALIDACION_OTP for validarotp resource', () => {
      // Arrange
      const resource = '/api/validarotp';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.VALIDACION_OTP);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.VALIDACION_OTP}`);
    });

    it('✅ should determine GENERAR_OTP for generarotp resource', () => {
      // Arrange
      const resource = '/api/generarotp';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.GENERAR_OTP);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.GENERAR_OTP}`);
    });

    it('✅ should return TRANSFERENCIA as default for unknown resource', () => {
      // Arrange
      const resource = '/api/unknown-action';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.TRANSFERENCIA);
      expect(consoleSpy.log).toHaveBeenCalledWith(`No se encontró mapeo específico, usando TRANSFERENCIA como default`);
    });

    it('✅ should handle case insensitive resource matching', () => {
      // Arrange
      const resource = '/api/TRANSFERENCIA';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.TRANSFERENCIA);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.TRANSFERENCIA}`);
    });

    it('✅ should handle empty resource', () => {
      // Arrange
      const resource = '';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.TRANSFERENCIA);
      expect(consoleSpy.log).toHaveBeenCalledWith(`No se encontró mapeo específico, usando TRANSFERENCIA como default`);
    });

    it('✅ should handle resource with multiple slashes', () => {
      // Arrange
      const resource = '/api/v1/transferencia';

      // Act
      const result = configService.determinarAccion(resource);

      // Assert
      expect(result).toBe(ACCION_FLUJO.TRANSFERENCIA);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Acción determinada: ${ACCION_FLUJO.TRANSFERENCIA}`);
    });
  });

  describe('obtenerConfiguracion', () => {
    it('✅ should return TRANSFERENCIA configuration', () => {
      // Act
      const result = configService.obtenerConfiguracion(ACCION_FLUJO.TRANSFERENCIA);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.TRANSFERENCIA,
        urlServicio: "http://NLB-API-PRD-33c0193af8356ff1.elb.us-east-1.amazonaws.com:9004/cuentaPY/ejecutarTransferencia",
        acciones: ["validarHash", "llamarServicioUrl", "borrarHash", "crearClientId"],
        validarHash: true,
        llamarServicioUrl: true,
        borrarHash: true,
        crearClientId: true,
        requiereAutorizacion: true
      });
      expect(consoleSpy.log).toHaveBeenCalledWith(`Configuración obtenida para ${ACCION_FLUJO.TRANSFERENCIA}:`, expect.any(String));
    });

    it('✅ should return CONSULTA_SALDO configuration', () => {
      // Act
      const result = configService.obtenerConfiguracion(ACCION_FLUJO.CONSULTA_SALDO);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.CONSULTA_SALDO,
        urlServicio: 'https://api-py.bancobolivariano.com/consulta-saldo',
        acciones: ["validarClientId", "llamarServicioUrl"],
        validarClientId: true,
        llamarServicioUrl: true,
        requiereAutorizacion: true
      });
    });

    it('✅ should return PAGO_SERVICIOS configuration', () => {
      // Act
      const result = configService.obtenerConfiguracion(ACCION_FLUJO.PAGO_SERVICIOS);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.PAGO_SERVICIOS,
        urlServicio: 'https://api-py.bancobolivariano.com/pago-servicios',
        acciones: ["validarHash", "llamarServicioUrl", "borrarHash", "crearClientId"],
        validarHash: true,
        llamarServicioUrl: true,
        borrarHash: true,
        crearClientId: true,
        requiereAutorizacion: true
      });
    });

    it('✅ should return AFILIACION configuration', () => {
      // Act
      const result = configService.obtenerConfiguracion(ACCION_FLUJO.AFILIACION);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.AFILIACION,
        urlServicio: 'https://api-py.bancobolivariano.com/afiliacion',
        acciones: ["validarClientId", "llamarServicioUrl"],
        validarClientId: true,
        llamarServicioUrl: true,
        requiereAutorizacion: true
      });
    });

    it('✅ should return GENERAR_OTP configuration', () => {
      // Act
      const result = configService.obtenerConfiguracion(ACCION_FLUJO.GENERAR_OTP);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.GENERAR_OTP,
        urlServicio: 'https://api-py.bancobolivariano.com/generar-otp',
        acciones: ["llamarServicioUrl", "crearClientId"],
        llamarServicioUrl: true,
        crearClientId: true,
        requiereAutorizacion: false
      });
    });

    it('✅ should return TRANSFERENCIA as default for unknown action', () => {
      // Act
      const result = configService.obtenerConfiguracion('UNKNOWN_ACTION' as ACCION_FLUJO);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.TRANSFERENCIA,
        urlServicio: "http://NLB-API-PRD-33c0193af8356ff1.elb.us-east-1.amazonaws.com:9004/cuentaPY/ejecutarTransferencia",
        acciones: ["validarHash", "llamarServicioUrl", "borrarHash", "crearClientId"],
        validarHash: true,
        llamarServicioUrl: true,
        borrarHash: true,
        crearClientId: true,
        requiereAutorizacion: true
      });
      expect(consoleSpy.warn).toHaveBeenCalledWith(`No se encontró configuración para acción: UNKNOWN_ACTION, usando TRANSFERENCIA como default`);
    });
  });

  describe('determinarProximosPasos', () => {
    it('✅ should determine steps for TRANSFERENCIA configuration', () => {
      // Arrange
      const config: IAccionConfig = {
        accion: ACCION_FLUJO.TRANSFERENCIA,
        urlServicio: 'https://test.com',
        acciones: ['validarHash', 'llamarServicioUrl', 'borrarHash', 'crearClientId'],
        validarHash: true,
        llamarServicioUrl: true,
        borrarHash: true,
        crearClientId: true,
        requiereAutorizacion: true
      };

      // Act
      const result = (configService as any).determinarProximosPasos(config);

      // Assert
      expect(result).toEqual([
        'fnInterceptorValidarHash',
        'EjecutarServicioX',
        'fnAuthGenerarClientId',
        'fnInterceptorBorrarHash'
      ]);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Próximos pasos determinados: ${JSON.stringify(result)}`);
    });

    it('✅ should determine steps for CONSULTA_SALDO configuration', () => {
      // Arrange
      const config: IAccionConfig = {
        accion: ACCION_FLUJO.CONSULTA_SALDO,
        urlServicio: 'https://test.com',
        acciones: ['validarClientId', 'llamarServicioUrl'],
        validarClientId: true,
        llamarServicioUrl: true,
        requiereAutorizacion: true
      };

      // Act
      const result = (configService as any).determinarProximosPasos(config);

      // Assert
      expect(result).toEqual([
        'fnValidarClientId',
        'EjecutarServicioX'
      ]);
    });

    it('✅ should determine steps for VALIDACION_OTP configuration', () => {
      // Arrange
      const config: IAccionConfig = {
        accion: ACCION_FLUJO.VALIDACION_OTP,
        urlServicio: 'https://test.com',
        acciones: ['validarHash', 'llamarServicioUrl', 'borrarHash'],
        validarHash: true,
        llamarServicioUrl: true,
        borrarHash: true,
        requiereAutorizacion: false
      };

      // Act
      const result = (configService as any).determinarProximosPasos(config);

      // Assert
      expect(result).toEqual([
        'fnInterceptorValidarHash',
        'EjecutarServicioX',
        'fnInterceptorBorrarHash'
      ]);
    });

    it('✅ should determine steps for GENERAR_OTP configuration', () => {
      // Arrange
      const config: IAccionConfig = {
        accion: ACCION_FLUJO.GENERAR_OTP,
        urlServicio: 'https://test.com',
        acciones: ['llamarServicioUrl', 'crearClientId'],
        llamarServicioUrl: true,
        crearClientId: true,
        requiereAutorizacion: false
      };

      // Act
      const result = (configService as any).determinarProximosPasos(config);

      // Assert
      expect(result).toEqual([
        'EjecutarServicioX',
        'fnAuthGenerarClientId'
      ]);
    });

    it('✅ should determine empty steps for configuration with no flags', () => {
      // Arrange
      const config: IAccionConfig = {
        accion: ACCION_FLUJO.AFILIACION,
        urlServicio: 'https://test.com',
        acciones: [],
        requiereAutorizacion: false
      };

      // Act
      const result = (configService as any).determinarProximosPasos(config);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('obtenerUrlServicio', () => {
    it('✅ should return URL for TRANSFERENCIA', () => {
      // Act
      const result = ConfiguracionFlujoService.obtenerUrlServicio(ACCION_FLUJO.TRANSFERENCIA);

      // Assert
      expect(result).toBe("http://NLB-API-PRD-33c0193af8356ff1.elb.us-east-1.amazonaws.com:9004/cuentaPY/ejecutarTransferencia");
    });

    it('✅ should return URL for CONSULTA_SALDO', () => {
      // Act
      const result = ConfiguracionFlujoService.obtenerUrlServicio(ACCION_FLUJO.CONSULTA_SALDO);

      // Assert
      expect(result).toBe('https://api-py.bancobolivariano.com/consulta-saldo');
    });

    it('✅ should return empty string for unknown action', () => {
      // Act
      const result = ConfiguracionFlujoService.obtenerUrlServicio('UNKNOWN_ACTION' as ACCION_FLUJO);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('procesarFlujo', () => {
    it('✅ should process TRANSFERENCIA flow successfully', async () => {
      // Arrange
      const body = JSON.stringify({ monto: 100, cuentaOrigen: '123', cuentaDestino: '456' });
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '/api/transferencia';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.TRANSFERENCIA,
        configuracion: expect.objectContaining({
          accion: ACCION_FLUJO.TRANSFERENCIA,
          validarHash: true,
          llamarServicioUrl: true,
          borrarHash: true,
          crearClientId: true,
          requiereAutorizacion: true
        }),
        nextSteps: [
          'fnInterceptorValidarHash',
          'EjecutarServicioX',
          'fnAuthGenerarClientId',
          'fnInterceptorBorrarHash'
        ],
        shouldContinue: true
      });

      expect(consoleSpy.log).toHaveBeenCalledWith('=== INICIO PROCESAMIENTO FLUJO ===');
      expect(consoleSpy.log).toHaveBeenCalledWith(`Resource: ${resource}`);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Body: ${body}`);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Headers: ${JSON.stringify(headers)}`);
      expect(consoleSpy.log).toHaveBeenCalledWith('=== RESPUESTA FLUJO ===');
    });

    it('✅ should process CONSULTA_SALDO flow successfully', async () => {
      // Arrange
      const body = JSON.stringify({ numeroCuenta: '1234567890' });
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '/api/consultasaldo';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.CONSULTA_SALDO,
        configuracion: expect.objectContaining({
          accion: ACCION_FLUJO.CONSULTA_SALDO,
          validarClientId: true,
          llamarServicioUrl: true,
          requiereAutorizacion: true
        }),
        nextSteps: [
          'fnValidarClientId',
          'EjecutarServicioX'
        ],
        shouldContinue: true
      });
    });

    it('✅ should process flow with null headers', async () => {
      // Arrange
      const body = JSON.stringify({ data: 'test' });
      const headers = null;
      const resource = '/api/transferencia';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.TRANSFERENCIA,
        configuracion: expect.objectContaining({
          accion: ACCION_FLUJO.TRANSFERENCIA
        }),
        nextSteps: expect.any(Array),
        shouldContinue: true
      });
    });

    it('✅ should handle invalid JSON in procesarFlujo (no error expected)', async () => {
      // Arrange
      const body = 'invalid-json';
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '/api/transferencia';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.TRANSFERENCIA,
        configuracion: expect.objectContaining({
          accion: ACCION_FLUJO.TRANSFERENCIA
        }),
        nextSteps: expect.any(Array),
        shouldContinue: true
      });
    });
  });

  describe('validarDatosSegunAccion', () => {
    it('✅ should validate TRANSFERENCIA data successfully', async () => {
      // Arrange
      const requestData = {
        monto: 100,
        cuentaOrigen: '1234567890',
        cuentaDestino: '0987654321',
        concepto: 'Transferencia test'
      };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.TRANSFERENCIA, requestData, headers)).resolves.not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalledWith(`Validando datos para acción: ${ACCION_FLUJO.TRANSFERENCIA}`);
    });

    it('❌ should throw error for TRANSFERENCIA with missing campo', async () => {
      // Arrange
      const requestData = {
        monto: 100,
        cuentaOrigen: '1234567890'
        // Missing cuentaDestino and concepto
      };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.TRANSFERENCIA, requestData, headers)).rejects.toThrow('Campo obligatorio faltante para transferencia: cuentaDestino');
    });

    it('❌ should throw error for TRANSFERENCIA with invalid monto', async () => {
      // Arrange
      const requestData = {
        monto: 0,
        cuentaOrigen: '1234567890',
        cuentaDestino: '0987654321',
        concepto: 'Transferencia test'
      };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.TRANSFERENCIA, requestData, headers)).rejects.toThrow('Campo obligatorio faltante para transferencia: monto');
    });

    it('❌ should throw error for TRANSFERENCIA with negative monto', async () => {
      // Arrange
      const requestData = {
        monto: -100,
        cuentaOrigen: '1234567890',
        cuentaDestino: '0987654321',
        concepto: 'Transferencia test'
      };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.TRANSFERENCIA, requestData, headers)).rejects.toThrow('El monto debe ser mayor a cero');
    });

    it('✅ should validate CONSULTA_SALDO data successfully', async () => {
      // Arrange
      const requestData = { numeroCuenta: '1234567890' };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.CONSULTA_SALDO, requestData, headers)).resolves.not.toThrow();
    });

    it('❌ should throw error for CONSULTA_SALDO with missing numeroCuenta', async () => {
      // Arrange
      const requestData = {};
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.CONSULTA_SALDO, requestData, headers)).rejects.toThrow('Número de cuenta requerido para consulta');
    });

    it('✅ should validate PAGO_SERVICIOS data successfully', async () => {
      // Arrange
      const requestData = {
        monto: 50,
        empresa: 'Empresa Test',
        referencia: 'REF123456'
      };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.PAGO_SERVICIOS, requestData, headers)).resolves.not.toThrow();
    });

    it('❌ should throw error for PAGO_SERVICIOS with missing campo', async () => {
      // Arrange
      const requestData = {
        monto: 50,
        empresa: 'Empresa Test'
        // Missing referencia
      };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.PAGO_SERVICIOS, requestData, headers)).rejects.toThrow('Campo obligatorio faltante para pago: referencia');
    });

    it('✅ should validate AFILIACION data successfully', async () => {
      // Arrange
      const requestData = {
        telefono: '0987654321',
        email: 'test@example.com',
        tipoDocumento: 'C',
        numeroDocumento: '1234567890'
      };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.AFILIACION, requestData, headers)).resolves.not.toThrow();
    });

    it('❌ should throw error for AFILIACION with missing campo', async () => {
      // Arrange
      const requestData = {
        telefono: '0987654321',
        email: 'test@example.com'
        // Missing tipoDocumento and numeroDocumento
      };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion(ACCION_FLUJO.AFILIACION, requestData, headers)).rejects.toThrow('Campo obligatorio faltante para afiliación: tipoDocumento');
    });

    it('✅ should handle generic validation for unknown action', async () => {
      // Arrange
      const requestData = { data: 'test' };
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };

      // Act & Assert
      await expect((configService as any).validarDatosSegunAccion('UNKNOWN_ACTION' as ACCION_FLUJO, requestData, headers)).resolves.not.toThrow();
      expect(consoleSpy.log).toHaveBeenCalledWith(`Validación genérica para acción: UNKNOWN_ACTION`);
    });
  });

  describe('Edge cases and error handling', () => {
    it('✅ should handle empty body in procesarFlujo', async () => {
      // Arrange
      const body = '';
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '/api/transferencia';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.TRANSFERENCIA,
        configuracion: expect.objectContaining({
          accion: ACCION_FLUJO.TRANSFERENCIA
        }),
        nextSteps: expect.any(Array),
        shouldContinue: true
      });
    });

    it('✅ should handle null body in procesarFlujo', async () => {
      // Arrange
      const body = null as any;
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '/api/transferencia';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.TRANSFERENCIA,
        configuracion: expect.objectContaining({
          accion: ACCION_FLUJO.TRANSFERENCIA
        }),
        nextSteps: expect.any(Array),
        shouldContinue: true
      });
    });

    it('✅ should handle undefined body in procesarFlujo', async () => {
      // Arrange
      const body = undefined as any;
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '/api/transferencia';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result).toEqual({
        accion: ACCION_FLUJO.TRANSFERENCIA,
        configuracion: expect.objectContaining({
          accion: ACCION_FLUJO.TRANSFERENCIA
        }),
        nextSteps: expect.any(Array),
        shouldContinue: true
      });
    });

    it('🚫 should handle empty resource in procesarFlujo', async () => {
      // Arrange
      const body = JSON.stringify({ data: 'test' });
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result.accion).toBe(ACCION_FLUJO.TRANSFERENCIA); // Default action
    });

    it('🚫 should handle null resource in procesarFlujo', async () => {
      // Arrange
      const body = JSON.stringify({ data: 'test' });
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = null as any;

      // Act & Assert
      await expect(configService.procesarFlujo(body, headers, resource)).rejects.toThrow();
    });

    it('📏 should handle very long resource path', async () => {
      // Arrange
      const body = JSON.stringify({ data: 'test' });
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '/api/v1/very/long/path/to/transferencia';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result.accion).toBe(ACCION_FLUJO.TRANSFERENCIA);
    });

    it('📏 should handle resource with special characters', async () => {
      // Arrange
      const body = JSON.stringify({ data: 'test' });
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resource = '/api/transferencia-with-special-chars!@#$%';

      // Act
      const result = await configService.procesarFlujo(body, headers, resource);

      // Assert
      expect(result.accion).toBe(ACCION_FLUJO.TRANSFERENCIA); // Default action
    });

    it('📏 should handle multiple concurrent procesarFlujo calls', async () => {
      // Arrange
      const body = JSON.stringify({ data: 'test' });
      const headers: APIGatewayProxyEventHeaders = { identificacion: '1234567890' };
      const resources = ['/api/transferencia', '/api/consultasaldo', '/api/pagoservicios'];

      // Act
      const promises = resources.map(resource => configService.procesarFlujo(body, headers, resource));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].accion).toBe(ACCION_FLUJO.TRANSFERENCIA);
      expect(results[1].accion).toBe(ACCION_FLUJO.CONSULTA_SALDO);
      expect(results[2].accion).toBe(ACCION_FLUJO.PAGO_SERVICIOS);
    });
  });
});
