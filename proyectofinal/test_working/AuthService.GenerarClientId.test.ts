import { AuthService } from '../../src/services/AuthService.GenerarClientId';
import { SemillaRepository } from '../../src/repository/SemillaRepository.GenerarClientId';
import { SesionUsuarioRepository } from '../../src/repository/SesionUsuarioRepository.GenerarClientId';
import PeticionesService from '../../src/services/PeticionesService';
import { Util } from '../../src/utils/utils';
import { Constants } from '../../src/constant/Constants';
import { ISesionUnicaUsuario, IUsuarioSesion } from '../../src/beans/general.interface';
import { IiniciarSesion } from '../../src/beans/usuariopy.interface';
import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../src/repository/SemillaRepository.GenerarClientId');
jest.mock('../../src/repository/SesionUsuarioRepository.GenerarClientId');
jest.mock('../../src/services/PeticionesService');
jest.mock('../../src/utils/utils');
jest.mock('jsonwebtoken');

const mockSemillaRepository = SemillaRepository as jest.MockedClass<typeof SemillaRepository>;
const mockSesionUsuarioRepository = SesionUsuarioRepository as jest.MockedClass<typeof SesionUsuarioRepository>;
const mockPeticionesService = PeticionesService as jest.MockedClass<typeof PeticionesService>;
const mockUtil = Util as jest.Mocked<typeof Util>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService.GenerarClientId Tests', () => {
  let authService: AuthService;
  let mockSemillaRepo: jest.Mocked<SemillaRepository>;
  let mockSesionRepo: jest.Mocked<SesionUsuarioRepository>;
  let mockPeticiones: jest.Mocked<PeticionesService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
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
    
    authService = new AuthService();
    
    // Mock process.env
    process.env.DURACION_SESION = '30';
  });

  describe('generarAutorizacion', () => {
    it('should generate authorization successfully', async () => {
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890'
      };
      
      const semilla = 'test-semilla';
      const clientId = 'test-client-id';
      
      mockSemillaRepo.obtenerSemilla.mockResolvedValue(semilla);
      (mockJwt.sign as jest.Mock).mockReturnValue(clientId);
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.generarAutorizacion(sesionUnica);

      expect(mockSemillaRepo.obtenerSemilla).toHaveBeenCalled();
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { ...sesionUnica },
        semilla,
        { algorithm: 'HS512' }
      );
      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(30, {
        ...sesionUnica,
        id: clientId
      });
      expect(result).toBe(clientId);
    });

    it('should handle special characters in session data', async () => {
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'session@#$%',
        token: 'token@#$%',
        uriTech: 'uri@#$%',
        identificacion: '1234567890@#$%'
      };
      
      const semilla = 'test-semilla';
      const clientId = 'test-client-id';
      
      mockSemillaRepo.obtenerSemilla.mockResolvedValue(semilla);
      (mockJwt.sign as jest.Mock).mockReturnValue(clientId);
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.generarAutorizacion(sesionUnica);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { ...sesionUnica },
        semilla,
        { algorithm: 'HS512' }
      );
      expect(result).toBe(clientId);
    });

    it('should handle unicode characters in session data', async () => {
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'sesión-ñé',
        token: 'token-ñé',
        uriTech: 'uri-ñé',
        identificacion: '1234567890'
      };
      
      const semilla = 'test-semilla';
      const clientId = 'test-client-id';
      
      mockSemillaRepo.obtenerSemilla.mockResolvedValue(semilla);
      (mockJwt.sign as jest.Mock).mockReturnValue(clientId);
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.generarAutorizacion(sesionUnica);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { ...sesionUnica },
        semilla,
        { algorithm: 'HS512' }
      );
      expect(result).toBe(clientId);
    });

    it('should handle semilla repository errors', async () => {
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890'
      };
      
      const error = new Error('Semilla repository error');
      mockSemillaRepo.obtenerSemilla.mockRejectedValue(error);

      await expect(authService.generarAutorizacion(sesionUnica)).rejects.toThrow('Semilla repository error');
    });

    it('should handle session repository errors', async () => {
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890'
      };
      
      const semilla = 'test-semilla';
      const clientId = 'test-client-id';
      const error = new Error('Session repository error');
      
      mockSemillaRepo.obtenerSemilla.mockResolvedValue(semilla);
      (mockJwt.sign as jest.Mock).mockReturnValue(clientId);
      mockSesionRepo.guardarSesion.mockRejectedValue(error);

      await expect(authService.generarAutorizacion(sesionUnica)).rejects.toThrow('Session repository error');
    });
  });

  describe('generarClientId', () => {
    it('should generate client ID with JWT', async () => {
      const semilla = 'test-semilla';
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890'
      };
      const expectedClientId = 'jwt-client-id';
      
      (mockJwt.sign as jest.Mock).mockReturnValue(expectedClientId);

      const result = await authService.generarClientId(semilla, sesionUnica);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { ...sesionUnica },
        semilla,
        { algorithm: 'HS512' }
      );
      expect(result).toBe(expectedClientId);
    });

    it('should handle different session data', async () => {
      const semilla = 'test-semilla';
      const testCases = [
        {
          sessionId: 'session-1',
          token: 'token-1',
          uriTech: 'uri-1',
          identificacion: '1111111111'
        },
        {
          sessionId: 'session-2',
          token: 'token-2',
          uriTech: 'uri-2',
          identificacion: '2222222222'
        }
      ];

      for (const sesionUnica of testCases) {
        (mockJwt.sign as jest.Mock).mockClear();
        (mockJwt.sign as jest.Mock).mockReturnValue(`client-id-${sesionUnica.sessionId}`);

        const result = await authService.generarClientId(semilla, sesionUnica);

        expect(mockJwt.sign).toHaveBeenCalledWith(
          { ...sesionUnica },
          semilla,
          { algorithm: 'HS512' }
        );
        expect(result).toBe(`client-id-${sesionUnica.sessionId}`);
      }
    });

    it('should handle empty session data', async () => {
      const semilla = 'test-semilla';
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: '',
        token: '',
        uriTech: '',
        identificacion: ''
      };
      const expectedClientId = 'empty-client-id';
      
      (mockJwt.sign as jest.Mock).mockReturnValue(expectedClientId);

      const result = await authService.generarClientId(semilla, sesionUnica);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { ...sesionUnica },
        semilla,
        { algorithm: 'HS512' }
      );
      expect(result).toBe(expectedClientId);
    });
  });

  describe('guardarTokenSesion', () => {
    it('should save session token successfully', async () => {
      const clientId = 'test-client-id';
      const usuarioSesion: ISesionUnicaUsuario = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890'
      };
      
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      await authService.guardarTokenSesion(clientId, usuarioSesion);

      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(30, {
        ...usuarioSesion,
        id: clientId
      });
    });

    it('should handle different duration values', async () => {
      process.env.DURACION_SESION = '60';
      
      const clientId = 'test-client-id';
      const usuarioSesion: ISesionUnicaUsuario = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890'
      };
      
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      await authService.guardarTokenSesion(clientId, usuarioSesion);

      expect(mockSesionRepo.guardarSesion).toHaveBeenCalledWith(60, {
        ...usuarioSesion,
        id: clientId
      });
    });

    it('should handle session repository errors', async () => {
      const clientId = 'test-client-id';
      const usuarioSesion: ISesionUnicaUsuario = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890'
      };
      
      const error = new Error('Session repository error');
      mockSesionRepo.guardarSesion.mockRejectedValue(error);

      await expect(authService.guardarTokenSesion(clientId, usuarioSesion)).rejects.toThrow('Session repository error');
    });
  });

  describe('peticionLogin', () => {
    let mockHeaders: APIGatewayProxyEventHeaders;
    let mockBody: string;
    let mockValueHeader: any;

    beforeEach(() => {
      mockHeaders = {
        'Content-Type': 'application/json',
        'identificacion': '1234567890',
        'secuencial': '12345678'
      };
      
      mockBody = JSON.stringify({
        usuario: 'testuser',
        password: 'testpass'
      });
      
      mockValueHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };
      
      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(mockValueHeader);
      mockUtil.validateBodySize.mockImplementation(() => {});
      mockUtil.validarCaracteresEspeciales.mockImplementation(() => {});
    });

    it('should process login request successfully with OK response', async () => {
      const mockWsResponse: IiniciarSesion = {
        codigoError: Constants.CODIGO_ERROR_OK as number,
        mensajeUsuario: 'Login exitoso',
        mensajeSistema: 'Login successful',
        sesionUnica: {
          sessionId: 'test-session-id',
          token: 'test-token',
          uriTech: 'test-uri-tech'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };
      
      const clientId = 'test-client-id';
      
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      (mockJwt.sign as jest.Mock).mockReturnValue(clientId);
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.peticionLogin(mockBody, mockHeaders);

      expect(mockUtil.adicionaClienteMigradoHeader).toHaveBeenCalledWith(mockHeaders);
      expect(mockUtil.validateBodySize).toHaveBeenCalledWith(mockBody);
      expect(mockUtil.validarCaracteresEspeciales).toHaveBeenCalled();
      expect(mockPeticiones.llamarServicioIniciarSesionStf).toHaveBeenCalledWith(mockBody, mockValueHeader);
      expect(result.body).toContain('"clientId":"test-client-id"');
    });

    it('should process login request successfully with expiration code', async () => {
      const mockWsResponse: IiniciarSesion = {
        codigoError: Constants.CODIGO_ERROR_EXPIRACION_CLAVE as number,
        mensajeUsuario: 'Clave expirada',
        mensajeSistema: 'Password expired',
        sesionUnica: {
          sessionId: 'test-session-id',
          token: 'test-token',
          uriTech: 'test-uri-tech'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };
      
      const clientId = 'test-client-id';
      
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      (mockJwt.sign as jest.Mock).mockReturnValue(clientId);
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.peticionLogin(mockBody, mockHeaders);

      expect(result.body).toContain('"clientId":"test-client-id"');
    });

    it('should not generate client ID for error responses', async () => {
      const mockWsResponse: IiniciarSesion = {
        codigoError: 500,
        mensajeUsuario: 'Error en login',
        mensajeSistema: 'Login error',
        sesionUnica: {
          sessionId: '',
          token: '',
          uriTech: ''
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };
      
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);

      const result = await authService.peticionLogin(mockBody, mockHeaders);

      expect(mockSemillaRepo.obtenerSemilla).not.toHaveBeenCalled();
      expect(mockJwt.sign).not.toHaveBeenCalled();
      expect(mockSesionRepo.guardarSesion).not.toHaveBeenCalled();
      expect(result.body).toContain('"clientId":""');
    });

    it('should handle special characters in body and headers', async () => {
      const specialBody = JSON.stringify({
        usuario: 'test@#$%',
        password: 'pass@#$%'
      });
      
      const specialHeaders: APIGatewayProxyEventHeaders = {
        'Content-Type': 'application/json',
        'identificacion': '1234567890@#$%',
        'secuencial': '12345678@#$%'
      };
      
      const specialValueHeader = {
        identificacion: '1234567890@#$%',
        secuencial: '12345678@#$%',
        codigoMis: '0',
        pais: 'EC'
      };
      
      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(specialValueHeader);
      
      const mockWsResponse: IiniciarSesion = {
        codigoError: Constants.CODIGO_ERROR_OK as number,
        mensajeUsuario: 'Login exitoso',
        mensajeSistema: 'Login successful',
        sesionUnica: {
          sessionId: 'test-session-id',
          token: 'test-token',
          uriTech: 'test-uri-tech'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };
      
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      (mockJwt.sign as jest.Mock).mockReturnValue('test-client-id');
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.peticionLogin(specialBody, specialHeaders);

      expect(mockUtil.validarCaracteresEspeciales).toHaveBeenCalled();
      expect(result.body).toContain('"clientId":"test-client-id"');
    });

    it('should handle unicode characters in body and headers', async () => {
      const unicodeBody = JSON.stringify({
        usuario: 'usuario-ñé',
        password: 'password-ñé'
      });
      
      const unicodeHeaders: APIGatewayProxyEventHeaders = {
        'Content-Type': 'application/json',
        'identificacion': '1234567890',
        'secuencial': '12345678'
      };
      
      const unicodeValueHeader = {
        identificacion: '1234567890',
        secuencial: '12345678',
        codigoMis: '0',
        pais: 'EC'
      };
      
      mockUtil.adicionaClienteMigradoHeader.mockReturnValue(unicodeValueHeader);
      
      const mockWsResponse: IiniciarSesion = {
        codigoError: Constants.CODIGO_ERROR_OK as number,
        mensajeUsuario: 'Login exitoso',
        mensajeSistema: 'Login successful',
        sesionUnica: {
          sessionId: 'test-session-id',
          token: 'test-token',
          uriTech: 'test-uri-tech'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };
      
      mockPeticiones.llamarServicioIniciarSesionStf.mockResolvedValue(mockWsResponse);
      mockSemillaRepo.obtenerSemilla.mockResolvedValue('test-semilla');
      (mockJwt.sign as jest.Mock).mockReturnValue('test-client-id');
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.peticionLogin(unicodeBody, unicodeHeaders);

      expect(result.body).toContain('"clientId":"test-client-id"');
    });

    it('should handle body size validation errors', async () => {
      const error = new Error('Body size exceeded');
      mockUtil.validateBodySize.mockImplementation(() => {
        throw error;
      });

      await expect(authService.peticionLogin(mockBody, mockHeaders)).rejects.toThrow('Body size exceeded');
    });

    it('should handle special characters validation errors', async () => {
      const error = new Error('Invalid characters');
      mockUtil.validarCaracteresEspeciales.mockImplementation(() => {
        throw error;
      });

      await expect(authService.peticionLogin(mockBody, mockHeaders)).rejects.toThrow('Invalid characters');
    });

    it('should handle service call errors', async () => {
      const error = new Error('Service error');
      mockPeticiones.llamarServicioIniciarSesionStf.mockRejectedValue(error);

      await expect(authService.peticionLogin(mockBody, mockHeaders)).rejects.toThrow('Service error');
    });

    it('should handle invalid JSON in body', async () => {
      const invalidBody = 'invalid json';
      
      await expect(authService.peticionLogin(invalidBody, mockHeaders)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', async () => {
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: null as any,
        token: undefined as any,
        uriTech: '',
        identificacion: '1234567890'
      };
      
      const semilla = 'test-semilla';
      const clientId = 'test-client-id';
      
      mockSemillaRepo.obtenerSemilla.mockResolvedValue(semilla);
      (mockJwt.sign as jest.Mock).mockReturnValue(clientId);
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.generarAutorizacion(sesionUnica);

      expect(result).toBe(clientId);
    });

    it('should handle very long session data', async () => {
      const longString = 'a'.repeat(1000);
      const sesionUnica: ISesionUnicaUsuario = {
        sessionId: longString,
        token: longString,
        uriTech: longString,
        identificacion: longString
      };
      
      const semilla = 'test-semilla';
      const clientId = 'test-client-id';
      
      mockSemillaRepo.obtenerSemilla.mockResolvedValue(semilla);
      (mockJwt.sign as jest.Mock).mockReturnValue(clientId);
      mockSesionRepo.guardarSesion.mockResolvedValue(undefined);

      const result = await authService.generarAutorizacion(sesionUnica);

      expect(result).toBe(clientId);
    });
  });
});
