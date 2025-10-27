/**
 * Unit Tests para SemillaRepository.GenerarClientId
 * 
 * Este test cubre todas las funciones del repositorio de semillas:
 * - obtenerSemilla: Obtener semilla de seguridad desde AWS Secrets Manager
 * - leerSecretManager: Método privado para leer desde Secrets Manager
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de entrada
 * - Casos edge (valores vacíos, null, etc.)
 * - Diferentes configuraciones de variables de entorno
 */

// Mock de dependencias antes de importar
const mockSend = jest.fn();
const mockGetSecretValueCommand = jest.fn().mockImplementation((params) => params);

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({
    send: mockSend
  })),
  GetSecretValueCommand: mockGetSecretValueCommand
}));

import { SemillaRepository } from '../../src/repository/SemillaRepository.GenerarClientId';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { IntegrationException } from '../../src/errors/IntegrationException';
import { DiccionarioMensajes } from '../../src/constant/response-dictionary';

describe('SemillaRepository.GenerarClientId - Unit Tests', () => {
  let semillaRepository: SemillaRepository;
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
    process.env.region = 'us-east-1';
    process.env.SECRET_NAME = 'test-secret-name';

    semillaRepository = new SemillaRepository();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    delete process.env.region;
    delete process.env.SECRET_NAME;
  });

  describe('obtenerSemilla', () => {
    it('✅ should get semilla successfully', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'test-semilla-value-123'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(GetSecretValueCommand).toHaveBeenCalledWith({
        SecretId: 'test-secret-name',
        VersionStage: 'AWSCURRENT'
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith('creamos cliente - enviando peticion');
      expect(consoleSpy.log).toHaveBeenCalledWith('se obtuvo respuesta de la semilla');
      expect(result).toBe('test-semilla-value-123');
    });

    it('✅ should get semilla with complex JSON structure', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'complex-semilla-value-456',
        other_field: 'other_value',
        nested_object: {
          field1: 'value1',
          field2: 'value2'
        }
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('complex-semilla-value-456');
    });

    it('✅ should get semilla with special characters', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'semilla-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('semilla-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?');
    });

    it('✅ should get semilla with very long value', async () => {
      // Arrange
      const longSemilla = 'a'.repeat(1000);
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: longSemilla
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe(longSemilla);
    });

    it('✅ should handle undefined region', async () => {
      // Arrange
      delete process.env.region;
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'test-semilla-value'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('test-semilla-value');
    });

    it('✅ should handle undefined secret name', async () => {
      // Arrange
      delete process.env.SECRET_NAME;
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'test-semilla-value'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(GetSecretValueCommand).toHaveBeenCalledWith({
        SecretId: undefined,
        VersionStage: 'AWSCURRENT'
      });
      expect(result).toBe('test-semilla-value');
    });

    it('✅ should handle empty secret string', async () => {
      // Arrange
      const mockResponse = {
        SecretString: ''
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBeUndefined();
    });

    it('✅ should handle null secret string', async () => {
      // Arrange
      const mockResponse = {
        SecretString: null
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBeUndefined();
    });

    it('✅ should handle undefined secret string', async () => {
      // Arrange
      const mockResponse = {
        SecretString: undefined
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBeUndefined();
    });

    it('✅ should handle malformed JSON', async () => {
      // Arrange
      const mockResponse = {
        SecretString: 'invalid-json-string'
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(semillaRepository.obtenerSemilla()).rejects.toThrow();
    });

    it('✅ should handle JSON without semilla_seguridad_wap field', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        other_field: 'other_value',
        another_field: 'another_value'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBeUndefined();
    });

    it('✅ should handle JSON with null semilla_seguridad_wap field', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: null
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBeNull();
    });

    it('✅ should handle JSON with empty semilla_seguridad_wap field', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: ''
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('');
    });

    it('❌ should handle Secrets Manager error', async () => {
      // Arrange
      const secretsError = new Error('Secrets Manager error');
      mockSend.mockRejectedValue(secretsError);

      // Act & Assert
      await expect(semillaRepository.obtenerSemilla()).rejects.toThrow(IntegrationException);
      expect(consoleSpy.log).toHaveBeenCalledWith('Se presentó un problema al obtener la semilla: ', secretsError);
    });

    it('❌ should handle Secrets Manager timeout error', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      mockSend.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(semillaRepository.obtenerSemilla()).rejects.toThrow(IntegrationException);
      expect(consoleSpy.log).toHaveBeenCalledWith('Se presentó un problema al obtener la semilla: ', timeoutError);
    });

    it('❌ should handle Secrets Manager permission error', async () => {
      // Arrange
      const permissionError = new Error('Access Denied');
      mockSend.mockRejectedValue(permissionError);

      // Act & Assert
      await expect(semillaRepository.obtenerSemilla()).rejects.toThrow(IntegrationException);
      expect(consoleSpy.log).toHaveBeenCalledWith('Se presentó un problema al obtener la semilla: ', permissionError);
    });

    it('❌ should handle Secrets Manager network error', async () => {
      // Arrange
      const networkError = new Error('Network error');
      mockSend.mockRejectedValue(networkError);

      // Act & Assert
      await expect(semillaRepository.obtenerSemilla()).rejects.toThrow(IntegrationException);
      expect(consoleSpy.log).toHaveBeenCalledWith('Se presentó un problema al obtener la semilla: ', networkError);
    });

    it('❌ should handle JSON parse error', async () => {
      // Arrange
      const mockResponse = {
        SecretString: 'invalid-json-{'
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(semillaRepository.obtenerSemilla()).rejects.toThrow();
    });

    it('❌ should handle IntegrationException with correct properties', async () => {
      // Arrange
      const secretsError = new Error('Secrets Manager error');
      mockSend.mockRejectedValue(secretsError);

      // Act & Assert
      try {
        await semillaRepository.obtenerSemilla();
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrationException);
        expect((error as IntegrationException).codigoError).toBe(9991);
        expect((error as IntegrationException).mensajeInterno).toBe('Secrets Manager error');
        expect((error as IntegrationException).mensajeUsuario).toBe(DiccionarioMensajes.mensajeGenerico);
      }
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle complete semilla lifecycle', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'lifecycle-semilla-value'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('lifecycle-semilla-value');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('🔄 should handle multiple concurrent requests', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'concurrent-semilla-value'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const promises = Array(5).fill(null).map(() => semillaRepository.obtenerSemilla());
      const results = await Promise.all(promises);

      // Assert
      expect(results).toEqual([
        'concurrent-semilla-value',
        'concurrent-semilla-value',
        'concurrent-semilla-value',
        'concurrent-semilla-value',
        'concurrent-semilla-value'
      ]);
      expect(mockSend).toHaveBeenCalledTimes(5);
    });

    it('🔄 should handle mixed success and error scenarios', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'success-semilla-value'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      const secretsError = new Error('Secrets Manager error');
      
      mockSend
        .mockResolvedValueOnce(mockResponse) // Success
        .mockRejectedValueOnce(secretsError) // Error
        .mockResolvedValueOnce(mockResponse); // Success

      // Act & Assert
      const result1 = await semillaRepository.obtenerSemilla();
      expect(result1).toBe('success-semilla-value');
      
      await expect(semillaRepository.obtenerSemilla()).rejects.toThrow(IntegrationException);
      
      const result3 = await semillaRepository.obtenerSemilla();
      expect(result3).toBe('success-semilla-value');
    });
  });

  describe('Edge cases and error handling', () => {
    it('📏 should handle very large secret string', async () => {
      // Arrange
      const largeSemilla = 'a'.repeat(10000);
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: largeSemilla
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe(largeSemilla);
    });

    it('📏 should handle complex nested JSON structure', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'nested-semilla-value',
        config: {
          database: {
            host: 'localhost',
            port: 5432,
            credentials: {
              username: 'user',
              password: 'pass'
            }
          },
          api: {
            endpoints: ['/api/v1', '/api/v2'],
            timeout: 30000
          }
        }
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('nested-semilla-value');
    });

    it('📏 should handle JSON with array values', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'array-semilla-value',
        array_field: ['value1', 'value2', 'value3'],
        nested_array: [
          { field1: 'value1' },
          { field2: 'value2' }
        ]
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('array-semilla-value');
    });

    it('📏 should handle JSON with boolean and number values', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'boolean-number-semilla-value',
        boolean_field: true,
        number_field: 12345,
        float_field: 123.45,
        null_field: null
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('boolean-number-semilla-value');
    });

    it('📏 should handle empty JSON object', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({});
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBeUndefined();
    });

    it('📏 should handle JSON with only whitespace', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: '   '
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('   ');
    });

    it('📏 should handle JSON with unicode characters', async () => {
      // Arrange
      const mockSecretString = JSON.stringify({
        semilla_seguridad_wap: 'semilla-with-unicode-ñáéíóú-中文-🚀'
      });
      const mockResponse = {
        SecretString: mockSecretString
      };
      mockSend.mockResolvedValue(mockResponse);

      // Act
      const result = await semillaRepository.obtenerSemilla();

      // Assert
      expect(result).toBe('semilla-with-unicode-ñáéíóú-中文-🚀');
    });
  });
});
