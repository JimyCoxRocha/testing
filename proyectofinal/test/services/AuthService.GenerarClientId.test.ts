/**
 * Unit Tests para AuthService.GenerarClientId
 * 
 * Este test cubre todas las funciones del servicio de autenticación:
 * - generarAutorizacion: Flujo completo de generación de autorización
 * - generarClientId: Generación de JWT token
 * - guardarTokenSesion: Guardado de sesión en DynamoDB
 * - peticionLogin: Flujo completo de login con validaciones
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de entrada
 * - Diferentes códigos de respuesta
 * - Casos edge (valores vacíos, null, etc.)
 */

import { AuthService } from '../../src/services/AuthService.GenerarClientId';
import { SemillaRepository } from '../../src/repository/SemillaRepository.GenerarClientId';
import { SesionUsuarioRepository } from '../../src/repository/SesionUsuarioRepository.GenerarClientId';
import PeticionesService from '../../src/services/PeticionesService';
import { Util } from '../../src/utils/utils';
import { Constants } from '../../src/constant/Constants';
import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { ISesionUnicaUsuario, IUsuarioSesion, IResponseAuth } from '../../src/beans/general.interface';
import { IiniciarSesion } from '../../src/beans/usuariopy.interface';

// Mock de jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mocked-jwt-token')
}));

// Mock de los repositorios
jest.mock('../../src/repository/SemillaRepository.GenerarClientId');
jest.mock('../../src/repository/SesionUsuarioRepository.GenerarClientId');

// Mock del servicio de peticiones
jest.mock('../../src/services/PeticionesService');

// Mock de Util
jest.mock('../../src/utils/utils');

const mockSemillaRepository = SemillaRepository as jest.MockedClass<typeof SemillaRepository>;
const mockSesionUsuarioRepository = SesionUsuarioRepository as jest.MockedClass<typeof SesionUsuarioRepository>;
const mockPeticionesService = PeticionesService as jest.MockedClass<typeof PeticionesService>;
const mockUtil = Util as jest.Mocked<typeof Util>;

describe('AuthService.GenerarClientId - Unit Tests', () => {
  let authService: AuthService;
  let mockSemillaRepo: jest.Mocked<SemillaRepository>;
  let mockSesionRepo: jest.Mocked<SesionUsuarioRepository>;
  let mockPeticiones: jest.Mocked<PeticionesService>;
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de console
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };

    // Mock de process.env
    process.env.DURACION_SESION = '30';
    process.env.TABLA_SESION_USUARIO = 'test-table';

    // Setup mocks
    mockSemillaRepo = {
      obtenerSemilla: jest.fn()
    } as any;

    mockSesionRepo = {
      guardarSesion: jest.fn()
    } as any;

    mockPeticiones = {
      llamarServicioIniciarSesionStf: jest.fn()
    } as any;

    mockSemillaRepository.mockImplementation(() => mockSemillaRepo);
    mockSesionUsuarioRepository.mockImplementation(() => mockSesionRepo);
    mockPeticionesService.mockImplementation(() => mockPeticiones);

    // Mock de Util methods
    mockUtil.adicionaClienteMigradoHeader = jest.fn();
    mockUtil.validateBodySize = jest.fn();
    mockUtil.validarCaracteresEspeciales = jest.fn();

    authService = new AuthService();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('generarAutorizacion', () => {
    it('✅ should generate authorization successfully', async () => {
      // Arrange
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      };

      const mockSemilla = 'test-semilla';
      mockSemillaRepo.obtenerSemilla.mockResolvedValue(mockSemilla);
      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      const result = await authService.generarAutorizacion(sesionUnica);

      // Assert
      expect(result).toBe('mocked-jwt-token');
      expect(mockSemillaRepo.obtenerSemilla).toHaveBeenCalledTimes(1);
      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(30, {
        id: 'mocked-jwt-token',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      });
      expect(consoleSpy.log).toHaveBeenCalledWith('token: ', 'mocked-jwt-token');
    });

    it('❌ should handle error when obtenerSemilla fails', async () => {
      // Arrange
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      };

      const error = new Error('Semilla error');
      mockSemillaRepo.obtenerSemilla.mockRejectedValue(error);

      // Act & Assert
      await expect(authService.generarAutorizacion(sesionUnica)).rejects.toThrow('Semilla error');
      expect(mockSemillaRepo.obtenerSemilla).toHaveBeenCalledTimes(1);
      expect(mockSesionRepo.guardarSesion).not.toHaveBeenCalled();
    });

    it('❌ should handle error when guardarSesion fails', async () => {
      // Arrange
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      };

      const mockSemilla = 'test-semilla';
      mockSemillaRepo.obtenerSemilla.mockResolvedValue(mockSemilla);
      const error = new Error('Guardar sesion error');
      mockSesionRepo.guardarSesion.mockRejectedValue(error);

      // Act & Assert
      await expect(authService.generarAutorizacion(sesionUnica)).rejects.toThrow('Guardar sesion error');
      expect(mockSemillaRepo.obtenerSemilla).toHaveBeenCalledTimes(1);
      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledTimes(1);
    });
  });

  describe('generarClientId', () => {
    it('✅ should generate client ID successfully', async () => {
      // Arrange
      const semilla = 'test-semilla';
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      };

      // Act
      const result = await authService.generarClientId(semilla, sesionUnica);

      // Assert
      expect(result).toBe('mocked-jwt-token');
    });

    it('✅ should generate client ID with empty values', async () => {
      // Arrange
      const semilla = '';
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: '',
        token: '',
        uriTech: '',
        identificacion: ''
      };

      // Act
      const result = await authService.generarClientId(semilla, sesionUnica);

      // Assert
      expect(result).toBe('mocked-jwt-token');
    });

    it('✅ should generate client ID with special characters', async () => {
      // Arrange
      const semilla = 'semilla-con-caracteres-especiales!@#$%';
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'session|with|pipes',
        token: 'token-with-dashes',
        uriTech: 'uri.with.dots',
        identificacion: '123-456-789'
      };

      // Act
      const result = await authService.generarClientId(semilla, sesionUnica);

      // Assert
      expect(result).toBe('mocked-jwt-token');
    });
  });

  describe('guardarTokenSesion', () => {
    it('✅ should save token session successfully', async () => {
      // Arrange
      const clientId = 'test-client-id';
      const usuarioSesion: ISesionUnicaUsuario = {
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      };

      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      await authService.guardarTokenSesion(clientId, usuarioSesion);

      // Assert
      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(30, {
        id: 'test-client-id',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      });
    });

    it('❌ should handle error when guardarSesion fails', async () => {
      // Arrange
      const clientId = 'test-client-id';
      const usuarioSesion: ISesionUnicaUsuario = {
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      };

      const error = new Error('Database error');
      mockSesionRepo.guardarSesion.mockRejectedValue(error);

      // Act & Assert
      await expect(authService.guardarTokenSesion(clientId, usuarioSesion)).rejects.toThrow('Database error');
      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(30, {
        id: 'test-client-id',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      });
    });

    it('✅ should handle empty clientId', async () => {
      // Arrange
      const clientId = '';
      const usuarioSesion: ISesionUnicaUsuario = {
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      };

      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      await authService.guardarTokenSesion(clientId, usuarioSesion);

      // Assert
      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(30, {
        id: '',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      });
    });
  });

  describe('peticionLogin', () => {
    it('✅ should handle successful login with CODIGO_ERROR_OK', async () => {
      // Arrange
      const body = JSON.stringify({
        usuario: 'testuser',
        password: 'testpass'
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };

      const mockWsResponse: IiniciarSesion = {
        codigoError: 0,
        mensajeUsuario: 'Login exitoso',
        mensajeSistema: 'Success',
        sesionUnica: {
          sessionId: 'session123',
          token: 'token123',
          uriTech: 'uri123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      const result = await authService.peticionLogin(body, header);

      // Assert
      expect(result).toEqual({
        body: expect.stringContaining('"codigoError":0')
      });
      expect(result.body).toContain('"clientId":"mocked-jwt-token"');
      expect(mockUtil.adicionaClienteMigradoHeader).toHaveBeenCalledWith(header);
      expect(mockUtil.validateBodySize).toHaveBeenCalledWith(body);
      expect(mockUtil.validarCaracteresEspeciales).toHaveBeenCalled();
      expect(mockPeticiones.llamarServicioIniciarSesionStf).toHaveBeenCalledWith(body, mockHeader);
    });

    it('✅ should handle successful login with CODIGO_ERROR_EXPIRACION_CLAVE', async () => {
      // Arrange
      const body = JSON.stringify({
        usuario: 'testuser',
        password: 'testpass'
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };

      const mockWsResponse: IiniciarSesion = {
        codigoError: 1040,
        mensajeUsuario: 'Clave expirada',
        mensajeSistema: 'Password expired',
        sesionUnica: {
          sessionId: 'session123',
          token: 'token123',
          uriTech: 'uri123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      const result = await authService.peticionLogin(body, header);

      // Assert
      expect(result).toEqual({
        body: expect.stringContaining('"codigoError":1040')
      });
      expect(result.body).toContain('"clientId":"mocked-jwt-token"');
    });

    it('✅ should handle failed login with other error codes', async () => {
      // Arrange
      const body = JSON.stringify({
        usuario: 'testuser',
        password: 'wrongpass'
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };

      const mockWsResponse: IiniciarSesion = {
        codigoError: 9999,
        mensajeUsuario: 'Credenciales inválidas',
        mensajeSistema: 'Invalid credentials',
        sesionUnica: {
          sessionId: 'session123',
          token: 'token123',
          uriTech: 'uri123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);

      // Act
      const result = await authService.peticionLogin(body, header);

      // Assert
      expect(result).toEqual({
        body: expect.stringContaining('"codigoError":9999')
      });
      expect(result.body).toContain('"clientId":""');
      expect(mockSemillaRepo.obtenerSemilla).not.toHaveBeenCalled();
      expect(mockSesionRepo.guardarSesion).not.toHaveBeenCalled();
    });

    it('❌ should handle validation errors', async () => {
      // Arrange
      const body = JSON.stringify({
        usuario: 'testuser',
        password: 'testpass'
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      const validationError = new Error('Entrada inválida: contiene caracteres no permitidos.');
      mockUtil.validarCaracteresEspeciales.mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(authService.peticionLogin(body, header)).rejects.toThrow('Entrada inválida: contiene caracteres no permitidos.');
      expect(mockUtil.adicionaClienteMigradoHeader).toHaveBeenCalledWith(header);
      expect(mockUtil.validateBodySize).toHaveBeenCalledWith(body);
      expect(mockUtil.validarCaracteresEspeciales).toHaveBeenCalled();
      expect(mockPeticiones.llamarServicioIniciarSesionStf).not.toHaveBeenCalled();
    });

    it('❌ should handle body size validation errors', async () => {
      // Arrange
      const body = JSON.stringify({
        usuario: 'testuser',
        password: 'testpass'
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      const bodySizeError = new Error('Se excedió el peso de request permitido.');
      mockUtil.validateBodySize.mockImplementation(() => {
        throw bodySizeError;
      });

      // Act & Assert
      await expect(authService.peticionLogin(body, header)).rejects.toThrow('Se excedió el peso de request permitido.');
      expect(mockUtil.adicionaClienteMigradoHeader).toHaveBeenCalledWith(header);
      expect(mockUtil.validateBodySize).toHaveBeenCalledWith(body);
      expect(mockUtil.validarCaracteresEspeciales).not.toHaveBeenCalled();
      expect(mockPeticiones.llamarServicioIniciarSesionStf).not.toHaveBeenCalled();
    });

    it('❌ should handle service call errors', async () => {
      // Arrange
      const body = JSON.stringify({
        usuario: 'testuser',
        password: 'testpass'
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();
      const serviceError = new Error('Service unavailable');
      mockPeticiones.llamarServicioIniciarSesionStf.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(authService.peticionLogin(body, header)).rejects.toThrow('Service unavailable');
      expect(mockUtil.adicionaClienteMigradoHeader).toHaveBeenCalledWith(header);
      expect(mockUtil.validateBodySize).toHaveBeenCalledWith(body);
      expect(mockUtil.validarCaracteresEspeciales).toHaveBeenCalled();
      expect(mockPeticiones.llamarServicioIniciarSesionStf).toHaveBeenCalledWith(body, mockHeader);
    });

    it('✅ should handle empty body', async () => {
      // Arrange
      const body = '{}';
      const header: APIGatewayProxyEventHeaders = {};

      const mockHeader = {
        identificacion: '0999999999',
        secuencial: undefined,
        codigoMis: '0',
        pais: 'EC'
      };

      const mockWsResponse: IiniciarSesion = {
        codigoError: 0,
        mensajeUsuario: 'Login exitoso',
        mensajeSistema: 'Success',
        sesionUnica: {
          sessionId: 'session123',
          token: 'token123',
          uriTech: 'uri123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      const result = await authService.peticionLogin(body, header);

      // Assert
      expect(result).toEqual({
        body: expect.stringContaining('"codigoError":0')
      });
      expect(result.body).toContain('"clientId":"mocked-jwt-token"');
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle complete successful login flow', async () => {
      // Arrange
      const body = JSON.stringify({
        usuario: 'testuser',
        password: 'testpass'
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678',
        ip: '192.168.1.1',
        usuario: 'testuser'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC',
        ip: '192.168.1.1',
        usuario: 'testuser'
      };

      const mockWsResponse: IiniciarSesion = {
        codigoError: 0,
        mensajeUsuario: 'Login exitoso',
        mensajeSistema: 'Success',
        sesionUnica: {
          sessionId: 'session123',
          token: 'token123',
          uriTech: 'uri123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      const result = await authService.peticionLogin(body, header);

      // Assert
      expect(result).toEqual({
        body: expect.stringContaining('"codigoError":0')
      });
      expect(result.body).toContain('"clientId":"mocked-jwt-token"');
      expect(result.body).toContain('"sessionId":"session123"');
      expect(result.body).toContain('"token":"token123"');
      expect(result.body).toContain('"uriTech":"uri123"');
    });

    it('🔄 should handle complete failed login flow', async () => {
      // Arrange
      const body = JSON.stringify({
        usuario: 'testuser',
        password: 'wrongpass'
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };

      const mockWsResponse: IiniciarSesion = {
        codigoError: 9999,
        mensajeUsuario: 'Credenciales inválidas',
        mensajeSistema: 'Invalid credentials',
        sesionUnica: {
          sessionId: 'session123',
          token: 'token123',
          uriTech: 'uri123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);

      // Act
      const result = await authService.peticionLogin(body, header);

      // Assert
      expect(result).toEqual({
        body: expect.stringContaining('"codigoError":9999')
      });
      expect(result.body).toContain('"clientId":""');
      expect(result.body).toContain('"mensajeUsuario":"Credenciales inválidas"');
    });
  });

  describe('Edge cases and error handling', () => {
    it('🚫 should handle null/undefined values in generarClientId', async () => {
      // Arrange
      const semilla = null as any;
      const sesionUnica = null as any;

      // Act
      const result = await authService.generarClientId(semilla, sesionUnica);

      // Assert
      expect(result).toBe('mocked-jwt-token');
    });

    it('🚫 should handle null/undefined values in guardarTokenSesion', async () => {
      // Arrange
      const clientId = null as any;
      const usuarioSesion = null as any;

      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      await authService.guardarTokenSesion(clientId, usuarioSesion);

      // Assert
      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(30, {
        id: null,
        sessionId: undefined,
        token: undefined,
        uriTech: undefined,
        identificacion: undefined
      });
    });

    it('🚫 should handle malformed JSON in peticionLogin', async () => {
      // Arrange
      const body = 'invalid-json';
      const header: APIGatewayProxyEventHeaders = {};

      const mockHeader = {
        identificacion: '0999999999',
        secuencial: undefined,
        codigoMis: '0',
        pais: 'EC'
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();

      // Act & Assert
      await expect(authService.peticionLogin(body, header)).rejects.toThrow();
    });

    it('🚫 should handle undefined environment variables', async () => {
      // Arrange
      delete process.env.DURACION_SESION;
      const clientId = 'test-client-id';
      const usuarioSesion: ISesionUnicaUsuario = {
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      };

      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      await authService.guardarTokenSesion(clientId, usuarioSesion);

      // Assert
      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(NaN, {
        id: 'test-client-id',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890'
      });
    });

    it('📏 should handle very large objects in peticionLogin', async () => {
      // Arrange
      const largeBody = JSON.stringify({
        usuario: 'testuser',
        password: 'testpass',
        data: Array(1000).fill('large-data')
      });
      const header: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        secuencial: '12345678'
      };

      const mockHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };

      const mockWsResponse: IiniciarSesion = {
        codigoError: 0,
        mensajeUsuario: 'Login exitoso',
        mensajeSistema: 'Success',
        sesionUnica: {
          sessionId: 'session123',
          token: 'token123',
          uriTech: 'uri123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockHeader);
      mockUtil.validateBodySize.mockImplementation();
      mockUtil.validarCaracteresEspeciales.mockImplementation();
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      mockSesionRepo.guardarSesion.mockResolvedValue();

      // Act
      const result = await authService.peticionLogin(largeBody, header);

      // Assert
      expect(result).toEqual({
        body: expect.stringContaining('"codigoError":0')
      });
      expect(result.body).toContain('"clientId":"mocked-jwt-token"');
    });
  });
});