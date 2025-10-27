/**
 * Unit Tests para AutorizacionService
 * 
 * Este test cubre todas las funciones del servicio de autorización:
 * - existClientId: Validación de existencia y validez de clientId en DynamoDB
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de sesión
 * - Casos edge (valores vacíos, null, etc.)
 * - Diferentes tipos de errores
 */

import { AutorizacionService } from '../../src/services/AutorizacionService';
import { SesionUsuarioRepository } from '../../src/repository/SesionUsuarioRepository';
import { FraudeException } from '../../src/errors/FraudeException';
import { IUsuarioSesionDb } from '../../src/beans/general.interface';

// Mock del repositorio
jest.mock('../../src/repository/SesionUsuarioRepository');

const mockSesionUsuarioRepository = SesionUsuarioRepository as jest.MockedClass<typeof SesionUsuarioRepository>;

describe('AutorizacionService - Unit Tests', () => {
  let autorizacionService: AutorizacionService;
  let mockSesionRepo: jest.Mocked<SesionUsuarioRepository>;
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

    // Setup mock
    mockSesionRepo = {
      getSesionUnica: jest.fn()
    } as any;

    mockSesionUsuarioRepository.mockImplementation(() => mockSesionRepo);

    autorizacionService = new AutorizacionService();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('existClientId', () => {
    it('✅ should validate clientId successfully when session is valid', async () => {
      // Arrange
      const r2ClientId = 'valid-client-id-123';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'valid-client-id-123',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('❌ should throw FraudeException when session is not valid', async () => {
      // Arrange
      const r2ClientId = 'invalid-client-id-456';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'invalid-client-id-456',
        sessionId: 'session456',
        token: 'token456',
        uriTech: 'uri456',
        expires_date: '2024-01-01T00:00:00',
        sesionValida: false
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9403);
        expect((error as FraudeException).mensajeInterno).toBe('Se detectó un posible fraude. La sesión no existe o ha expirado');
        expect((error as FraudeException).mensajeUsuario).toBe('No hemos podido validar su información');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).toHaveBeenCalledWith('Sesión no válida o expirada para clientId');
      expect(consoleSpy.log).not.toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('❌ should throw FraudeException when getSesionUnica throws FraudeException', async () => {
      // Arrange
      const r2ClientId = 'fraud-client-id-789';
      const originalFraudeException = new FraudeException(9401, 'Fraude detectado', 'Acceso denegado');

      mockSesionRepo.getSesionUnica.mockRejectedValue(originalFraudeException);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9401);
        expect((error as FraudeException).mensajeInterno).toBe('Fraude detectado');
        expect((error as FraudeException).mensajeUsuario).toBe('Acceso denegado');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('❌ should throw FraudeException when getSesionUnica throws generic error', async () => {
      // Arrange
      const r2ClientId = 'error-client-id-999';
      const genericError = new Error('Database connection failed');

      mockSesionRepo.getSesionUnica.mockRejectedValue(genericError);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9500);
        expect((error as FraudeException).mensajeInterno).toBe('Error interno al validar la sesión');
        expect((error as FraudeException).mensajeUsuario).toBe('No hemos podido validar su información');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al validar sesión en DynamoDB:', genericError);
      expect(consoleSpy.log).not.toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('❌ should throw FraudeException when getSesionUnica throws TypeError', async () => {
      // Arrange
      const r2ClientId = 'type-error-client-id';
      const typeError = new TypeError('Cannot read property of undefined');

      mockSesionRepo.getSesionUnica.mockRejectedValue(typeError);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9500);
        expect((error as FraudeException).mensajeInterno).toBe('Error interno al validar la sesión');
        expect((error as FraudeException).mensajeUsuario).toBe('No hemos podido validar su información');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al validar sesión en DynamoDB:', typeError);
    });

    it('❌ should throw FraudeException when getSesionUnica throws network error', async () => {
      // Arrange
      const r2ClientId = 'network-error-client-id';
      const networkError = new Error('Network timeout');

      mockSesionRepo.getSesionUnica.mockRejectedValue(networkError);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9500);
        expect((error as FraudeException).mensajeInterno).toBe('Error interno al validar la sesión');
        expect((error as FraudeException).mensajeUsuario).toBe('No hemos podido validar su información');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al validar sesión en DynamoDB:', networkError);
    });

    it('✅ should handle empty clientId', async () => {
      // Arrange
      const r2ClientId = '';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: '',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith('');
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('✅ should handle clientId with special characters', async () => {
      // Arrange
      const r2ClientId = 'client-id-with-special-chars!@#$%^&*()';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'client-id-with-special-chars!@#$%^&*()',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('✅ should handle very long clientId', async () => {
      // Arrange
      const r2ClientId = 'a'.repeat(1000); // Very long clientId
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: r2ClientId,
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('❌ should handle session with null sesionValida', async () => {
      // Arrange
      const r2ClientId = 'null-session-valid-id';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'null-session-valid-id',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: null as any
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9403);
        expect((error as FraudeException).mensajeInterno).toBe('Se detectó un posible fraude. La sesión no existe o ha expirado');
        expect((error as FraudeException).mensajeUsuario).toBe('No hemos podido validar su información');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).toHaveBeenCalledWith('Sesión no válida o expirada para clientId');
    });

    it('❌ should handle session with undefined sesionValida', async () => {
      // Arrange
      const r2ClientId = 'undefined-session-valid-id';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'undefined-session-valid-id',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: undefined as any
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9403);
        expect((error as FraudeException).mensajeInterno).toBe('Se detectó un posible fraude. La sesión no existe o ha expirado');
        expect((error as FraudeException).mensajeUsuario).toBe('No hemos podido validar su información');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).toHaveBeenCalledWith('Sesión no válida o expirada para clientId');
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle complete successful validation flow', async () => {
      // Arrange
      const r2ClientId = 'integration-test-client-id';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'integration-test-client-id',
        sessionId: 'integration-session-123',
        token: 'integration-token-456',
        uriTech: 'integration-uri-789',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('🔄 should handle complete fraud detection flow', async () => {
      // Arrange
      const r2ClientId = 'fraud-detection-client-id';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'fraud-detection-client-id',
        sessionId: 'fraud-session-123',
        token: 'fraud-token-456',
        uriTech: 'fraud-uri-789',
        expires_date: '2024-01-01T00:00:00', // Expired date
        sesionValida: false
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9403);
        expect((error as FraudeException).mensajeInterno).toBe('Se detectó un posible fraude. La sesión no existe o ha expirado');
        expect((error as FraudeException).mensajeUsuario).toBe('No hemos podido validar su información');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).toHaveBeenCalledWith('Sesión no válida o expirada para clientId');
      expect(consoleSpy.log).not.toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('🔄 should handle complete error handling flow', async () => {
      // Arrange
      const r2ClientId = 'error-handling-client-id';
      const databaseError = new Error('DynamoDB connection lost');

      mockSesionRepo.getSesionUnica.mockRejectedValue(databaseError);

      // Act & Assert
      await expect(autorizacionService.existClientId(r2ClientId)).rejects.toThrow(FraudeException);
      
      try {
        await autorizacionService.existClientId(r2ClientId);
      } catch (error) {
        expect(error).toBeInstanceOf(FraudeException);
        expect((error as FraudeException).codigoError).toBe(9500);
        expect((error as FraudeException).mensajeInterno).toBe('Error interno al validar la sesión');
        expect((error as FraudeException).mensajeUsuario).toBe('No hemos podido validar su información');
      }

      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(r2ClientId);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al validar sesión en DynamoDB:', databaseError);
      expect(consoleSpy.log).not.toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });
  });

  describe('Edge cases and error handling', () => {
    it('🚫 should handle null clientId', async () => {
      // Arrange
      const r2ClientId = null as any;
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: null as any,
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(null);
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('🚫 should handle undefined clientId', async () => {
      // Arrange
      const r2ClientId = undefined as any;
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: undefined as any,
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith(undefined);
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('🚫 should handle clientId with only whitespace', async () => {
      // Arrange
      const r2ClientId = '   ';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: '   ',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith('   ');
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('🚫 should handle clientId with newlines and tabs', async () => {
      // Arrange
      const r2ClientId = 'client\nid\twith\nspecial\tchars';
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'client\nid\twith\nspecial\tchars',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      await autorizacionService.existClientId(r2ClientId);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith('client\nid\twith\nspecial\tchars');
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
    });

    it('📏 should handle multiple concurrent calls', async () => {
      // Arrange
      const clientIds = ['client1', 'client2', 'client3'];
      const mockSesionUsuario: IUsuarioSesionDb = {
        id: 'test-id',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      mockSesionRepo.getSesionUnica.mockResolvedValue(mockSesionUsuario);

      // Act
      const promises = clientIds.map(clientId => autorizacionService.existClientId(clientId));
      await Promise.all(promises);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledTimes(3);
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith('client1');
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith('client2');
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledWith('client3');
      expect(consoleSpy.log).toHaveBeenCalledTimes(3);
    });

    it('📏 should handle mixed success and failure scenarios', async () => {
      // Arrange
      const validClientId = 'valid-client-id';
      const invalidClientId = 'invalid-client-id';
      
      const validSesion: IUsuarioSesionDb = {
        id: 'valid-client-id',
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        expires_date: '2024-12-31T23:59:59',
        sesionValida: true
      };

      const invalidSesion: IUsuarioSesionDb = {
        id: 'invalid-client-id',
        sessionId: 'session456',
        token: 'token456',
        uriTech: 'uri456',
        expires_date: '2024-01-01T00:00:00',
        sesionValida: false
      };

      mockSesionRepo.getSesionUnica
        .mockResolvedValueOnce(validSesion)
        .mockResolvedValueOnce(invalidSesion);

      // Act
      await autorizacionService.existClientId(validClientId);
      
      await expect(autorizacionService.existClientId(invalidClientId)).rejects.toThrow(FraudeException);

      // Assert
      expect(mockSesionRepo.getSesionUnica).toHaveBeenCalledTimes(2);
      expect(consoleSpy.log).toHaveBeenCalledWith('Sesión validada exitosamente en DynamoDB');
      expect(consoleSpy.error).toHaveBeenCalledWith('Sesión no válida o expirada para clientId');
    });
  });
});
