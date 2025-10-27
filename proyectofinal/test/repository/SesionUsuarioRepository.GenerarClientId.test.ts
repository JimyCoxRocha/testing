/**
 * Unit Tests para SesionUsuarioRepository.GenerarClientId
 * 
 * Este test cubre todas las funciones del repositorio de sesión de usuario:
 * - guardarSesion: Guardar sesión de usuario en DynamoDB
 * - obtenerExpiresAt: Calcular timestamp de expiración
 * - obtenerExpiresAtDate: Calcular fecha de expiración formateada
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de entrada
 * - Casos edge (valores vacíos, null, etc.)
 * - Diferentes configuraciones de variables de entorno
 */

// Mock de dependencias antes de importar
const mockPutItem = jest.fn();

jest.mock('../../src/datsource/dynamodb', () => ({
  putItem: mockPutItem
}));

jest.mock('moment', () => {
  const originalMoment = jest.requireActual('moment');
  return {
    __esModule: true,
    default: jest.fn(() => ({
      subtract: jest.fn().mockReturnThis(),
      add: jest.fn().mockReturnThis(),
      format: jest.fn().mockReturnValue('2024-12-31 23:59:59')
    }))
  };
});

import { SesionUsuarioRepository } from '../../src/repository/SesionUsuarioRepository.GenerarClientId';
import { IUsuarioSesion } from '../../src/beans/general.interface';
import { DiccionarioMensajes } from '../../src/constant/response-dictionary';

describe('SesionUsuarioRepository.GenerarClientId - Unit Tests', () => {
  let sesionUsuarioRepository: SesionUsuarioRepository;
  let consoleSpy: {
    log: jest.SpyInstance;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de console
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
    };

    // Mock de process.env
    process.env.TABLA_SESION_USUARIO = 'test-sesion-usuario-table';

    sesionUsuarioRepository = new SesionUsuarioRepository();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    delete process.env.TABLA_SESION_USUARIO;
  });

  describe('guardarSesion', () => {
    it('✅ should save session successfully', async () => {
      // Arrange
      const duracionMinutos = 30;
      const props: IUsuarioSesion = {
        id: 'test-user-id-123',
        sessionId: 'test-session-id-456',
        token: 'test-token-789',
        uriTech: 'test-uri-tech'
      };
      mockPutItem.mockResolvedValue({});

      // Act
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(mockPutItem).toHaveBeenCalledWith(
        {
          'id': { S: 'test-user-id-123' },
          'expires_at': { N: expect.any(String) },
          'sessionId': { S: 'test-session-id-456' },
          'token': { S: 'test-token-789' },
          'uriTech': { S: 'test-uri-tech' },
          'expires_date': { S: '2024-12-31 23:59:59' }
        },
        'test-sesion-usuario-table'
      );
      expect(consoleSpy.log).toHaveBeenCalledWith('guardarSesion - obtenerExpiresAtDate 2024-12-31 23:59:59');
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringMatching(/^guardarSesion \d+$/));
    });

    it('✅ should save session with zero duration', async () => {
      // Arrange
      const duracionMinutos = 0;
      const props: IUsuarioSesion = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };
      mockPutItem.mockResolvedValue({});

      // Act
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          'id': { S: 'test-user-id' },
          'expires_at': { N: expect.any(String) },
          'sessionId': { S: 'test-session-id' },
          'token': { S: 'test-token' },
          'uriTech': { S: 'test-uri-tech' },
          'expires_date': { S: '2024-12-31 23:59:59' }
        }),
        'test-sesion-usuario-table'
      );
    });

    it('✅ should save session with negative duration', async () => {
      // Arrange
      const duracionMinutos = -10;
      const props: IUsuarioSesion = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };
      mockPutItem.mockResolvedValue({});

      // Act
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          'id': { S: 'test-user-id' },
          'expires_at': { N: expect.any(String) },
          'sessionId': { S: 'test-session-id' },
          'token': { S: 'test-token' },
          'uriTech': { S: 'test-uri-tech' },
          'expires_date': { S: '2024-12-31 23:59:59' }
        }),
        'test-sesion-usuario-table'
      );
    });

    it('✅ should save session with very large duration', async () => {
      // Arrange
      const duracionMinutos = 999999;
      const props: IUsuarioSesion = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };
      mockPutItem.mockResolvedValue({});

      // Act
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          'id': { S: 'test-user-id' },
          'expires_at': { N: expect.any(String) },
          'sessionId': { S: 'test-session-id' },
          'token': { S: 'test-token' },
          'uriTech': { S: 'test-uri-tech' },
          'expires_date': { S: '2024-12-31 23:59:59' }
        }),
        'test-sesion-usuario-table'
      );
    });

    it('✅ should save session with special characters in props', async () => {
      // Arrange
      const duracionMinutos = 60;
      const props: IUsuarioSesion = {
        id: 'user-id-with-special-chars!@#$%^&*()',
        sessionId: 'session-id-with-special-chars!@#$%^&*()',
        token: 'token-with-special-chars!@#$%^&*()',
        uriTech: 'uri-tech-with-special-chars!@#$%^&*()'
      };
      mockPutItem.mockResolvedValue({});

      // Act
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          'id': { S: 'user-id-with-special-chars!@#$%^&*()' },
          'sessionId': { S: 'session-id-with-special-chars!@#$%^&*()' },
          'token': { S: 'token-with-special-chars!@#$%^&*()' },
          'uriTech': { S: 'uri-tech-with-special-chars!@#$%^&*()' },
          'expires_date': { S: '2024-12-31 23:59:59' }
        }),
        'test-sesion-usuario-table'
      );
    });

    it('✅ should save session with very long strings in props', async () => {
      // Arrange
      const duracionMinutos = 120;
      const longString = 'a'.repeat(1000);
      const props: IUsuarioSesion = {
        id: longString,
        sessionId: longString,
        token: longString,
        uriTech: longString
      };
      mockPutItem.mockResolvedValue({});

      // Act
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          'id': { S: longString },
          'sessionId': { S: longString },
          'token': { S: longString },
          'uriTech': { S: longString },
          'expires_date': { S: '2024-12-31 23:59:59' }
        }),
        'test-sesion-usuario-table'
      );
    });

    it('✅ should handle undefined table name', async () => {
      // Arrange
      delete process.env.TABLA_SESION_USUARIO;
      const duracionMinutos = 30;
      const props: IUsuarioSesion = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };
      mockPutItem.mockResolvedValue({});

      // Act
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          'id': { S: 'test-user-id' },
          'sessionId': { S: 'test-session-id' },
          'token': { S: 'test-token' },
          'uriTech': { S: 'test-uri-tech' },
          'expires_date': { S: '2024-12-31 23:59:59' }
        }),
        undefined
      );
    });

    it('✅ should handle empty strings in props', async () => {
      // Arrange
      const duracionMinutos = 30;
      const props: IUsuarioSesion = {
        id: '',
        sessionId: '',
        token: '',
        uriTech: ''
      };
      mockPutItem.mockResolvedValue({});

      // Act
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          'id': { S: '' },
          'sessionId': { S: '' },
          'token': { S: '' },
          'uriTech': { S: '' },
          'expires_date': { S: '2024-12-31 23:59:59' }
        }),
        'test-sesion-usuario-table'
      );
    });

    it('❌ should handle DynamoDB error', async () => {
      // Arrange
      const duracionMinutos = 30;
      const props: IUsuarioSesion = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };
      const dynamoError = new Error('DynamoDB error');
      mockPutItem.mockRejectedValue(dynamoError);

      // Act & Assert
      await expect(sesionUsuarioRepository.guardarSesion(duracionMinutos, props)).rejects.toThrow(dynamoError);
    });

    it('❌ should handle DynamoDB timeout error', async () => {
      // Arrange
      const duracionMinutos = 30;
      const props: IUsuarioSesion = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };
      const timeoutError = new Error('Request timeout');
      mockPutItem.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(sesionUsuarioRepository.guardarSesion(duracionMinutos, props)).rejects.toThrow(timeoutError);
    });

    it('❌ should handle DynamoDB permission error', async () => {
      // Arrange
      const duracionMinutos = 30;
      const props: IUsuarioSesion = {
        id: 'test-user-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };
      const permissionError = new Error('Access Denied');
      mockPutItem.mockRejectedValue(permissionError);

      // Act & Assert
      await expect(sesionUsuarioRepository.guardarSesion(duracionMinutos, props)).rejects.toThrow(permissionError);
    });
  });

  describe('obtenerExpiresAt', () => {
    it('✅ should calculate expires at correctly for 30 minutes', () => {
      // Arrange
      const duracionMinutos = 30;
      const beforeCall = Math.floor(Date.now() / 1000) + (duracionMinutos * 60);

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);

      // Assert
      const afterCall = Math.floor(Date.now() / 1000) + (duracionMinutos * 60);
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it('✅ should calculate expires at correctly for 0 minutes', () => {
      // Arrange
      const duracionMinutos = 0;
      const beforeCall = Math.floor(Date.now() / 1000);

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);

      // Assert
      const afterCall = Math.floor(Date.now() / 1000);
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it('✅ should calculate expires at correctly for negative minutes', () => {
      // Arrange
      const duracionMinutos = -10;
      const beforeCall = Math.floor(Date.now() / 1000) + (duracionMinutos * 60);

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);

      // Assert
      const afterCall = Math.floor(Date.now() / 1000) + (duracionMinutos * 60);
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it('✅ should calculate expires at correctly for very large minutes', () => {
      // Arrange
      const duracionMinutos = 999999;
      const beforeCall = Math.floor(Date.now() / 1000) + (duracionMinutos * 60);

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);

      // Assert
      const afterCall = Math.floor(Date.now() / 1000) + (duracionMinutos * 60);
      expect(result).toBeGreaterThanOrEqual(beforeCall);
      expect(result).toBeLessThanOrEqual(afterCall);
    });

    it('✅ should return integer value', () => {
      // Arrange
      const duracionMinutos = 60;

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);

      // Assert
      expect(Number.isInteger(result)).toBe(true);
    });

    it('✅ should handle decimal minutes (should be floored)', () => {
      // Arrange
      const duracionMinutos = 30.5;

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);

      // Assert
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('obtenerExpiresAtDate', () => {
    it('✅ should return formatted date string', () => {
      // Arrange
      const duracionMinutos = 30;

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(result).toBe('2024-12-31 23:59:59');
    });

    it('✅ should return formatted date string for zero minutes', () => {
      // Arrange
      const duracionMinutos = 0;

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(result).toBe('2024-12-31 23:59:59');
    });

    it('✅ should return formatted date string for negative minutes', () => {
      // Arrange
      const duracionMinutos = -10;

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(result).toBe('2024-12-31 23:59:59');
    });

    it('✅ should return formatted date string for very large minutes', () => {
      // Arrange
      const duracionMinutos = 999999;

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(result).toBe('2024-12-31 23:59:59');
    });

    it('✅ should return string type', () => {
      // Arrange
      const duracionMinutos = 60;

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(typeof result).toBe('string');
    });

    it('✅ should handle decimal minutes', () => {
      // Arrange
      const duracionMinutos = 30.5;

      // Act
      const result = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(result).toBe('2024-12-31 23:59:59');
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle complete session lifecycle', async () => {
      // Arrange
      const duracionMinutos = 60;
      const props: IUsuarioSesion = {
        id: 'lifecycle-user-id',
        sessionId: 'lifecycle-session-id',
        token: 'lifecycle-token',
        uriTech: 'lifecycle-uri-tech'
      };
      mockPutItem.mockResolvedValue({});

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);
      await sesionUsuarioRepository.guardarSesion(duracionMinutos, props);

      // Assert
      expect(Number.isInteger(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          'id': { S: 'lifecycle-user-id' },
          'expires_at': { N: expiresAt.toString() },
          'sessionId': { S: 'lifecycle-session-id' },
          'token': { S: 'lifecycle-token' },
          'uriTech': { S: 'lifecycle-uri-tech' },
          'expires_date': { S: expiresAtDate }
        }),
        'test-sesion-usuario-table'
      );
    });

    it('🔄 should handle multiple concurrent sessions', async () => {
      // Arrange
      const sessions = [
        { duracionMinutos: 30, props: { id: 'user1', sessionId: 'session1', token: 'token1', uriTech: 'uri1' } },
        { duracionMinutos: 60, props: { id: 'user2', sessionId: 'session2', token: 'token2', uriTech: 'uri2' } },
        { duracionMinutos: 120, props: { id: 'user3', sessionId: 'session3', token: 'token3', uriTech: 'uri3' } }
      ];
      mockPutItem.mockResolvedValue({});

      // Act
      const promises = sessions.map(({ duracionMinutos, props }) => 
        sesionUsuarioRepository.guardarSesion(duracionMinutos, props)
      );
      await Promise.all(promises);

      // Assert
      expect(mockPutItem).toHaveBeenCalledTimes(3);
    });

    it('🔄 should handle session operations with errors', async () => {
      // Arrange
      const duracionMinutos = 30;
      const props: IUsuarioSesion = {
        id: 'error-user-id',
        sessionId: 'error-session-id',
        token: 'error-token',
        uriTech: 'error-uri-tech'
      };
      const dynamoError = new Error('DynamoDB error');
      mockPutItem.mockRejectedValue(dynamoError);

      // Act & Assert
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);
      
      expect(Number.isInteger(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
      
      await expect(sesionUsuarioRepository.guardarSesion(duracionMinutos, props)).rejects.toThrow(dynamoError);
    });
  });

  describe('Edge cases and error handling', () => {
    it('📏 should handle very large numbers in duration', () => {
      // Arrange
      const duracionMinutos = Number.MAX_SAFE_INTEGER;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(Number.isInteger(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle very small numbers in duration', () => {
      // Arrange
      const duracionMinutos = Number.MIN_SAFE_INTEGER;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(Number.isInteger(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle NaN duration', () => {
      // Arrange
      const duracionMinutos = NaN;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(Number.isNaN(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle Infinity duration', () => {
      // Arrange
      const duracionMinutos = Infinity;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(expiresAt).toBe(Infinity);
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle -Infinity duration', () => {
      // Arrange
      const duracionMinutos = -Infinity;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(expiresAt).toBe(-Infinity);
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle null duration', () => {
      // Arrange
      const duracionMinutos = null as any;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(Number.isInteger(expiresAt)).toBe(true); // null converts to 0, so result is current timestamp
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle undefined duration', () => {
      // Arrange
      const duracionMinutos = undefined as any;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(Number.isNaN(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle string duration', () => {
      // Arrange
      const duracionMinutos = '30' as any;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(Number.isInteger(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle object duration', () => {
      // Arrange
      const duracionMinutos = {} as any;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(Number.isNaN(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
    });

    it('📏 should handle array duration', () => {
      // Arrange
      const duracionMinutos = [30] as any;

      // Act
      const expiresAt = sesionUsuarioRepository.obtenerExpiresAt(duracionMinutos);
      const expiresAtDate = sesionUsuarioRepository.obtenerExpiresAtDate(duracionMinutos);

      // Assert
      expect(Number.isInteger(expiresAt)).toBe(true);
      expect(typeof expiresAtDate).toBe('string');
    });
  });
});
