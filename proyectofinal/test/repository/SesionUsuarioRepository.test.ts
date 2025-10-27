/**
 * Unit Tests para SesionUsuarioRepository
 * 
 * Este test cubre todas las funciones del repositorio de sesión de usuario:
 * - getSesionUnica: Obtener sesión única de usuario desde DynamoDB
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de entrada
 * - Casos edge (valores vacíos, null, etc.)
 * - Diferentes configuraciones de variables de entorno
 * - Validación de expiración de sesión
 */

// Mock de dependencias antes de importar
const mockSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: mockSend
  })),
  GetItemCommand: jest.fn().mockImplementation((params) => params)
}));

jest.mock('moment', () => {
  const originalMoment = jest.requireActual('moment');
  return {
    __esModule: true,
    default: jest.fn((date?: any, format?: string) => {
      if (date && format) {
        // Mock para parsing de fecha
        return {
          isBefore: jest.fn().mockReturnValue(false)
        };
      }
      // Mock para fecha actual
      return {
        subtract: jest.fn().mockReturnThis(),
        isBefore: jest.fn().mockReturnValue(false)
      };
    })
  };
});

import { SesionUsuarioRepository } from '../../src/repository/SesionUsuarioRepository';
import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { IUsuarioSesionDb } from '../../src/beans/general.interface';
import { DiccionarioMensajes } from '../../src/constant/response-dictionary';

describe('SesionUsuarioRepository - Unit Tests', () => {
  let sesionUsuarioRepository: SesionUsuarioRepository;
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
    process.env.TABLA_SESION_USUARIO = 'test-sesion-usuario-table';

    sesionUsuarioRepository = new SesionUsuarioRepository();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    delete process.env.TABLA_SESION_USUARIO;
  });

  describe('getSesionUnica', () => {
    it('✅ should get valid session successfully', async () => {
      // Arrange
      const id = 'test-user-id-123';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'test-session-id-456' },
          token: { S: 'test-token-789' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(GetItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: id } }
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('resultado => ' + JSON.stringify(mockDynamoResult));
      expect(result).toEqual({
        sessionId: 'test-session-id-456',
        token: 'test-token-789',
        uriTech: 'test-uri-tech',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('✅ should get session with special characters in id', async () => {
      // Arrange
      const id = 'user-id-with-special-chars!@#$%^&*()';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'test-session-id' },
          token: { S: 'test-token' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('✅ should get session with very long id', async () => {
      // Arrange
      const id = 'a'.repeat(1000);
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'test-session-id' },
          token: { S: 'test-token' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('✅ should handle undefined table name', async () => {
      // Arrange
      delete process.env.TABLA_SESION_USUARIO;
      const id = 'test-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'test-session-id' },
          token: { S: 'test-token' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(GetItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: id } }
      });
      expect(result).toEqual({
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('✅ should return invalid session when item does not exist', async () => {
      // Arrange
      const id = 'non-existent-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: undefined,
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('resultado => ' + JSON.stringify(mockDynamoResult));
      expect(result).toEqual({ sesionValida: false } as IUsuarioSesionDb);
    });

    it('✅ should return invalid session when item is null', async () => {
      // Arrange
      const id = 'null-item-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: undefined,
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({ sesionValida: false } as IUsuarioSesionDb);
    });

    it('✅ should handle item with missing fields', async () => {
      // Arrange
      const id = 'test-user-missing-fields';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id }
          // Other fields are missing
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: '',
        token: '',
        uriTech: '',
        id: id,
        expires_date: '',
        sesionValida: false
      });
    });

    it('✅ should handle item with null fields', async () => {
      // Arrange
      const id = 'test-user-null-fields';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'null' },
          token: { S: 'null' },
          uriTech: { S: 'null' },
          expires_date: { S: 'null' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'null',
        token: 'null',
        uriTech: 'null',
        id: id,
        expires_date: 'null',
        sesionValida: false
      });
    });

    it('✅ should handle empty id', async () => {
      // Arrange
      const id = '';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'test-session-id' },
          token: { S: 'test-token' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: '',
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('✅ should handle null id', async () => {
      // Arrange
      const id = null as any;
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: 'null' },
          sessionId: { S: 'test-session-id' },
          token: { S: 'test-token' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: 'null',
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('✅ should handle undefined id', async () => {
      // Arrange
      const id = undefined as any;
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: 'undefined' },
          sessionId: { S: 'test-session-id' },
          token: { S: 'test-token' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: 'undefined',
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('✅ should handle session with valid expiration (isBefore returns true)', async () => {
      // Arrange
      const id = 'test-user-valid-session';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'test-session-id' },
          token: { S: 'test-token' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Mock moment to return isBefore: true for valid session
      const mockMoment = require('moment');
      mockMoment.default.mockImplementation((date?: any, format?: string) => {
        if (date && format) {
          // Mock para parsing de fecha almacenada
          return {
            isBefore: jest.fn().mockReturnValue(true) // Session is valid
          };
        }
        // Mock para fecha actual
        return {
          subtract: jest.fn().mockReturnThis(),
          isBefore: jest.fn().mockReturnValue(true)
        };
      });

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: true
      });
    });

    it('✅ should handle session with invalid expiration (isBefore returns false)', async () => {
      // Arrange
      const id = 'test-user-invalid-session';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'test-session-id' },
          token: { S: 'test-token' },
          uriTech: { S: 'test-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Mock moment to return isBefore: false for invalid session
      const mockMoment = require('moment');
      mockMoment.default.mockImplementation((date?: any, format?: string) => {
        if (date && format) {
          // Mock para parsing de fecha almacenada
          return {
            isBefore: jest.fn().mockReturnValue(false) // Session is invalid
          };
        }
        // Mock para fecha actual
        return {
          subtract: jest.fn().mockReturnThis(),
          isBefore: jest.fn().mockReturnValue(false)
        };
      });

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('❌ should handle DynamoDB error and return invalid session', async () => {
      // Arrange
      const id = 'error-user-id';
      const dynamoError = new Error('DynamoDB error');
      mockSend.mockRejectedValue(dynamoError);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al consultar sesión:', dynamoError);
      expect(result).toEqual({ sesionValida: false } as IUsuarioSesionDb);
    });

    it('❌ should handle DynamoDB timeout error and return invalid session', async () => {
      // Arrange
      const id = 'timeout-user-id';
      const timeoutError = new Error('Request timeout');
      mockSend.mockRejectedValue(timeoutError);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al consultar sesión:', timeoutError);
      expect(result).toEqual({ sesionValida: false } as IUsuarioSesionDb);
    });

    it('❌ should handle DynamoDB permission error and return invalid session', async () => {
      // Arrange
      const id = 'permission-user-id';
      const permissionError = new Error('Access Denied');
      mockSend.mockRejectedValue(permissionError);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al consultar sesión:', permissionError);
      expect(result).toEqual({ sesionValida: false } as IUsuarioSesionDb);
    });

    it('❌ should handle DynamoDB network error and return invalid session', async () => {
      // Arrange
      const id = 'network-user-id';
      const networkError = new Error('Network error');
      mockSend.mockRejectedValue(networkError);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al consultar sesión:', networkError);
      expect(result).toEqual({ sesionValida: false } as IUsuarioSesionDb);
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle complete session validation lifecycle', async () => {
      // Arrange
      const id = 'lifecycle-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'lifecycle-session-id' },
          token: { S: 'lifecycle-token' },
          uriTech: { S: 'lifecycle-uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        sessionId: 'lifecycle-session-id',
        token: 'lifecycle-token',
        uriTech: 'lifecycle-uri-tech',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('🔄 should handle multiple concurrent session requests', async () => {
      // Arrange
      const ids = ['user1', 'user2', 'user3'];
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: 'user1' },
          sessionId: { S: 'session1' },
          token: { S: 'token1' },
          uriTech: { S: 'uri1' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const promises = ids.map(id => sesionUsuarioRepository.getSesionUnica(id));
      const results = await Promise.all(promises);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toEqual({
          sessionId: 'session1',
          token: 'token1',
          uriTech: 'uri1',
          id: 'user1',
          expires_date: '2024-12-31 23:59:59',
          sesionValida: false
        });
      });
    });

    it('🔄 should handle mixed success and error scenarios', async () => {
      // Arrange
      const id1 = 'success-user-id';
      const id2 = 'error-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id1 },
          sessionId: { S: 'session-id' },
          token: { S: 'token' },
          uriTech: { S: 'uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      const dynamoError = new Error('DynamoDB error');
      
      mockSend
        .mockResolvedValueOnce(mockDynamoResult) // Success
        .mockRejectedValueOnce(dynamoError); // Error

      // Act & Assert
      const result1 = await sesionUsuarioRepository.getSesionUnica(id1);
      expect(result1).toEqual({
        sessionId: 'session-id',
        token: 'token',
        uriTech: 'uri-tech',
        id: id1,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
      
      const result2 = await sesionUsuarioRepository.getSesionUnica(id2);
      expect(result2).toEqual({ sesionValida: false } as IUsuarioSesionDb);
    });
  });

  describe('Edge cases and error handling', () => {
    it('📏 should handle very large DynamoDB responses', async () => {
      // Arrange
      const id = 'large-response-user-id';
      const largeString = 'a'.repeat(10000);
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: largeString },
          token: { S: largeString },
          uriTech: { S: largeString },
          expires_date: { S: largeString }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: largeString,
        token: largeString,
        uriTech: largeString,
        id: id,
        expires_date: largeString,
        sesionValida: false
      });
    });

    it('📏 should handle complex DynamoDB item structure', async () => {
      // Arrange
      const id = 'complex-structure-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'session-id' },
          token: { S: 'token' },
          uriTech: { S: 'uri-tech' },
          expires_date: { S: '2024-12-31 23:59:59' },
          // Additional fields that should be ignored
          extra_field: { S: 'extra_value' },
          another_field: { N: '123' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'session-id',
        token: 'token',
        uriTech: 'uri-tech',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });

    it('📏 should handle malformed expires_date', async () => {
      // Arrange
      const id = 'malformed-date-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'session-id' },
          token: { S: 'token' },
          uriTech: { S: 'uri-tech' },
          expires_date: { S: 'invalid-date-format' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'session-id',
        token: 'token',
        uriTech: 'uri-tech',
        id: id,
        expires_date: 'invalid-date-format',
        sesionValida: false
      });
    });

    it('📏 should handle empty expires_date', async () => {
      // Arrange
      const id = 'empty-date-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'session-id' },
          token: { S: 'token' },
          uriTech: { S: 'uri-tech' },
          expires_date: { S: '' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'session-id',
        token: 'token',
        uriTech: 'uri-tech',
        id: id,
        expires_date: '',
        sesionValida: false
      });
    });

    it('📏 should handle null expires_date', async () => {
      // Arrange
      const id = 'null-date-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'session-id' },
          token: { S: 'token' },
          uriTech: { S: 'uri-tech' },
          expires_date: { S: 'null' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'session-id',
        token: 'token',
        uriTech: 'uri-tech',
        id: id,
        expires_date: 'null',
        sesionValida: false
      });
    });

    it('📏 should handle undefined expires_date', async () => {
      // Arrange
      const id = 'undefined-date-user-id';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'session-id' },
          token: { S: 'token' },
          uriTech: { S: 'uri-tech' }
          // expires_date is missing
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'session-id',
        token: 'token',
        uriTech: 'uri-tech',
        id: id,
        expires_date: '',
        sesionValida: false
      });
    });

    it('📏 should handle unicode characters in session data', async () => {
      // Arrange
      const id = 'unicode-user-id-ñáéíóú-中文-🚀';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          sessionId: { S: 'unicode-session-ñáéíóú-中文-🚀' },
          token: { S: 'unicode-token-ñáéíóú-中文-🚀' },
          uriTech: { S: 'unicode-uri-ñáéíóú-中文-🚀' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await sesionUsuarioRepository.getSesionUnica(id);

      // Assert
      expect(result).toEqual({
        sessionId: 'unicode-session-ñáéíóú-中文-🚀',
        token: 'unicode-token-ñáéíóú-中文-🚀',
        uriTech: 'unicode-uri-ñáéíóú-中文-🚀',
        id: id,
        expires_date: '2024-12-31 23:59:59',
        sesionValida: false
      });
    });
  });
});
