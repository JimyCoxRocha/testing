/**
 * Unit Tests para HashUsuarioRepository
 * 
 * Este test cubre todas las funciones del repositorio de hash:
 * - guardarHash: Guardar hash en DynamoDB con expiración
 * - existeDigitalHash: Verificar si existe un hash digital
 * - deleteItemByTableName: Eliminar item por tabla
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de entrada
 * - Casos edge (valores vacíos, null, etc.)
 * - Diferentes configuraciones de variables de entorno
 */

import { HashUsuarioRepository } from '../../src/repository/HashUsuarioRepository';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import moment from 'moment';
import { deleteItem, getEstatusDigital } from '../../src/datsource/dynamodb';

// Mock de dependencias
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  PutItemCommand: jest.fn().mockImplementation((params) => params)
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({
      send: jest.fn()
    })
  }
}));
jest.mock('moment', () => {
  const mockMoment = jest.fn(() => ({
    subtract: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnValue('2024-01-01 12:00:00')
  }));
  return mockMoment;
});
jest.mock('../../src/datsource/dynamodb');

const mockDynamoDBClient = DynamoDBClient as jest.MockedClass<typeof DynamoDBClient>;
const mockPutItemCommand = PutItemCommand as jest.MockedClass<typeof PutItemCommand>;
const mockMoment = moment as jest.Mocked<typeof moment>;
const mockDeleteItem = deleteItem as jest.MockedFunction<typeof deleteItem>;
const mockGetEstatusDigital = getEstatusDigital as jest.MockedFunction<typeof getEstatusDigital>;

describe('HashUsuarioRepository - Unit Tests', () => {
  let hashRepository: HashUsuarioRepository;
  let mockSend: jest.Mock;
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
    process.env.TABLA_HASH_USUARIO_NAME = 'test-hash-usuario-table';
    process.env.TABLA_HASH_DIGITAL_NAME = 'test-hash-digital-table';

    // Setup mock
    mockSend = jest.fn();
    
    // Mock the DynamoDBClient constructor to return our mock
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({
      send: mockSend
    }));

    hashRepository = new HashUsuarioRepository();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    delete process.env.TABLA_HASH_USUARIO_NAME;
    delete process.env.TABLA_HASH_DIGITAL_NAME;
  });

  describe('guardarHash', () => {
    it('✅ should save hash successfully with valid parameters', async () => {
      // Arrange
      const hash = 'test-hash-123';
      const duracionMinutos = 30;
      const expectedExpiresAt = Math.floor((Date.now() + duracionMinutos * 60 * 1000) / 1000);
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: hash },
          'expires_at': { N: `${expectedExpiresAt}` },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockMoment).toHaveBeenCalled();
    });

    it('✅ should save hash with zero duration', async () => {
      // Arrange
      const hash = 'test-hash-zero';
      const duracionMinutos = 0;
      const expectedExpiresAt = Math.floor(Date.now() / 1000);
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: hash },
          'expires_at': { N: `${expectedExpiresAt}` },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });

    it('✅ should save hash with negative duration', async () => {
      // Arrange
      const hash = 'test-hash-negative';
      const duracionMinutos = -10;
      const expectedExpiresAt = Math.floor((Date.now() + duracionMinutos * 60 * 1000) / 1000);
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: hash },
          'expires_at': { N: `${expectedExpiresAt}` },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });

    it('✅ should save hash with very large duration', async () => {
      // Arrange
      const hash = 'test-hash-large';
      const duracionMinutos = 999999;
      const expectedExpiresAt = Math.floor((Date.now() + duracionMinutos * 60 * 1000) / 1000);
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: hash },
          'expires_at': { N: `${expectedExpiresAt}` },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });

    it('✅ should save hash with special characters', async () => {
      // Arrange
      const hash = 'test-hash-with-special-chars!@#$%^&*()';
      const duracionMinutos = 60;
      const expectedExpiresAt = Math.floor((Date.now() + duracionMinutos * 60 * 1000) / 1000);
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: hash },
          'expires_at': { N: `${expectedExpiresAt}` },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });

    it('✅ should save hash with very long string', async () => {
      // Arrange
      const hash = 'a'.repeat(1000);
      const duracionMinutos = 120;
      const expectedExpiresAt = Math.floor((Date.now() + duracionMinutos * 60 * 1000) / 1000);
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: hash },
          'expires_at': { N: `${expectedExpiresAt}` },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });

    it('❌ should handle DynamoDB error', async () => {
      // Arrange
      const hash = 'test-hash-error';
      const duracionMinutos = 30;
      const dynamoError = new Error('DynamoDB error');
      
      mockSend.mockRejectedValue(dynamoError);

      // Act & Assert
      await expect(hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table")).rejects.toThrow(dynamoError);
    });

    it('❌ should handle DynamoDB timeout error', async () => {
      // Arrange
      const hash = 'test-hash-timeout';
      const duracionMinutos = 30;
      const timeoutError = new Error('Request timeout');
      
      mockSend.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table")).rejects.toThrow(timeoutError);
    });

    it('❌ should handle DynamoDB permission error', async () => {
      // Arrange
      const hash = 'test-hash-permission';
      const duracionMinutos = 30;
      const permissionError = new Error('Access Denied');
      
      mockSend.mockRejectedValue(permissionError);

      // Act & Assert
      await expect(hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table")).rejects.toThrow(permissionError);
    });
  });

  describe('existeDigitalHash', () => {
    it('✅ should check digital hash existence successfully', async () => {
      // Arrange
      const hashDigital = 'digital-hash-123';
      const mockResult = { existe: true, fechaExpiracion: '2024-12-31 23:59:59' };
      mockGetEstatusDigital.mockResolvedValue(mockResult);

      // Act
      const result = await hashRepository.existeDigitalHash(hashDigital);

      // Assert
      expect(mockGetEstatusDigital).toHaveBeenCalledWith(hashDigital, 'test-hash-digital-table');
      expect(result).toEqual(mockResult);
    });

    it('✅ should return false when digital hash does not exist', async () => {
      // Arrange
      const hashDigital = 'non-existent-hash';
      const mockResult = { existe: false, fechaExpiracion: '' };
      mockGetEstatusDigital.mockResolvedValue(mockResult);

      // Act
      const result = await hashRepository.existeDigitalHash(hashDigital);

      // Assert
      expect(mockGetEstatusDigital).toHaveBeenCalledWith(hashDigital, 'test-hash-digital-table');
      expect(result).toEqual(mockResult);
    });

    it('✅ should handle empty hash', async () => {
      // Arrange
      const hashDigital = '';
      const mockResult = { existe: false, fechaExpiracion: '' };
      mockGetEstatusDigital.mockResolvedValue(mockResult);

      // Act
      const result = await hashRepository.existeDigitalHash(hashDigital);

      // Assert
      expect(mockGetEstatusDigital).toHaveBeenCalledWith('', 'test-hash-digital-table');
      expect(result).toEqual(mockResult);
    });

    it('✅ should handle hash with special characters', async () => {
      // Arrange
      const hashDigital = 'hash-with-special-chars!@#$%^&*()';
      const mockResult = { existe: true, fechaExpiracion: '2024-12-31 23:59:59' };
      mockGetEstatusDigital.mockResolvedValue(mockResult);

      // Act
      const result = await hashRepository.existeDigitalHash(hashDigital);

      // Assert
      expect(mockGetEstatusDigital).toHaveBeenCalledWith(hashDigital, 'test-hash-digital-table');
      expect(result).toEqual(mockResult);
    });

    it('✅ should handle very long hash', async () => {
      // Arrange
      const hashDigital = 'a'.repeat(1000);
      const mockResult = { existe: true, fechaExpiracion: '2024-12-31 23:59:59' };
      mockGetEstatusDigital.mockResolvedValue(mockResult);

      // Act
      const result = await hashRepository.existeDigitalHash(hashDigital);

      // Assert
      expect(mockGetEstatusDigital).toHaveBeenCalledWith(hashDigital, 'test-hash-digital-table');
      expect(result).toEqual(mockResult);
    });

    it('✅ should handle undefined table name', async () => {
      // Arrange
      delete process.env.TABLA_HASH_DIGITAL_NAME;
      const hashDigital = 'test-hash';
      const mockResult = { existe: false, fechaExpiracion: '' };
      mockGetEstatusDigital.mockResolvedValue(mockResult);

      // Act
      const result = await hashRepository.existeDigitalHash(hashDigital);

      // Assert
      expect(mockGetEstatusDigital).toHaveBeenCalledWith(hashDigital, undefined);
      expect(result).toEqual(mockResult);
    });

    it('❌ should handle error from getEstatusDigital', async () => {
      // Arrange
      const hashDigital = 'error-hash';
      const error = new Error('Database error');
      mockGetEstatusDigital.mockRejectedValue(error);

      // Act & Assert
      await expect(hashRepository.existeDigitalHash(hashDigital)).rejects.toThrow(error);
    });
  });

  describe('deleteItemByTableName', () => {
    it('✅ should delete item successfully', async () => {
      // Arrange
      const id = 'test-id-123';
      const tableName = 'test-table';
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, tableName);
      expect(result).toBe(true);
    });

    it('✅ should return false when deleteItem throws error', async () => {
      // Arrange
      const id = 'test-id-error';
      const tableName = 'test-table';
      const error = new Error('Delete error');
      mockDeleteItem.mockRejectedValue(error);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, tableName);
      expect(result).toBe(false);
    });

    it('✅ should return false when deleteItem throws DynamoDB error', async () => {
      // Arrange
      const id = 'test-id-dynamo-error';
      const tableName = 'test-table';
      const dynamoError = new Error('DynamoDB error');
      mockDeleteItem.mockRejectedValue(dynamoError);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, tableName);
      expect(result).toBe(false);
    });

    it('✅ should return false when deleteItem throws timeout error', async () => {
      // Arrange
      const id = 'test-id-timeout';
      const tableName = 'test-table';
      const timeoutError = new Error('Request timeout');
      mockDeleteItem.mockRejectedValue(timeoutError);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, tableName);
      expect(result).toBe(false);
    });

    it('✅ should handle empty id', async () => {
      // Arrange
      const id = '';
      const tableName = 'test-table';
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith('', tableName);
      expect(result).toBe(true);
    });

    it('✅ should handle empty table name', async () => {
      // Arrange
      const id = 'test-id';
      const tableName = '';
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, '');
      expect(result).toBe(true);
    });

    it('✅ should handle special characters in id and table name', async () => {
      // Arrange
      const id = 'id-with-special-chars!@#$%^&*()';
      const tableName = 'table-with-special-chars!@#$%^&*()';
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, tableName);
      expect(result).toBe(true);
    });

    it('✅ should handle very long id and table name', async () => {
      // Arrange
      const id = 'a'.repeat(1000);
      const tableName = 'b'.repeat(1000);
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, tableName);
      expect(result).toBe(true);
    });

    it('✅ should handle null id', async () => {
      // Arrange
      const id = null as any;
      const tableName = 'test-table';
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(null, tableName);
      expect(result).toBe(true);
    });

    it('✅ should handle undefined id', async () => {
      // Arrange
      const id = undefined as any;
      const tableName = 'test-table';
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(undefined, tableName);
      expect(result).toBe(true);
    });

    it('✅ should handle null table name', async () => {
      // Arrange
      const id = 'test-id';
      const tableName = null as any;
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, null);
      expect(result).toBe(true);
    });

    it('✅ should handle undefined table name', async () => {
      // Arrange
      const id = 'test-id';
      const tableName = undefined as any;
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const result = await hashRepository.deleteItemByTableName(id, tableName);

      // Assert
      expect(mockDeleteItem).toHaveBeenCalledWith(id, undefined);
      expect(result).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle complete hash lifecycle', async () => {
      // Arrange
      const hash = 'lifecycle-hash-123';
      const duracionMinutos = 60;
      const tableName = 'test-table';
      
      mockSend.mockResolvedValue({});
      mockGetEstatusDigital.mockResolvedValue({ existe: true, fechaExpiracion: '2024-12-31 23:59:59' });
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");
      const existsResult = await hashRepository.existeDigitalHash(hash);
      const deleteResult = await hashRepository.deleteItemByTableName(hash, tableName);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockGetEstatusDigital).toHaveBeenCalledWith(hash, 'test-hash-digital-table');
      expect(mockDeleteItem).toHaveBeenCalledWith(hash, tableName);
      expect(existsResult).toEqual({ existe: true, fechaExpiracion: '2024-12-31 23:59:59' });
      expect(deleteResult).toBe(true);
    });

    it('🔄 should handle hash operations with errors', async () => {
      // Arrange
      const hash = 'error-hash-123';
      const duracionMinutos = 30;
      const tableName = 'error-table';
      
      const dynamoError = new Error('DynamoDB error');
      const getError = new Error('Get error');
      const deleteError = new Error('Delete error');
      
      mockSend.mockRejectedValue(dynamoError);
      mockGetEstatusDigital.mockRejectedValue(getError);
      mockDeleteItem.mockRejectedValue(deleteError);

      // Act & Assert
      await expect(hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table")).rejects.toThrow(dynamoError);
      await expect(hashRepository.existeDigitalHash(hash)).rejects.toThrow(getError);
      const deleteResult = await hashRepository.deleteItemByTableName(hash, tableName);
      expect(deleteResult).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('🚫 should handle null hash in guardarHash', async () => {
      // Arrange
      const hash = null as any;
      const duracionMinutos = 30;
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: null },
          'expires_at': { N: expect.any(String) },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });

    it('🚫 should handle undefined hash in guardarHash', async () => {
      // Arrange
      const hash = undefined as any;
      const duracionMinutos = 30;
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: undefined },
          'expires_at': { N: expect.any(String) },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });

    it('🚫 should handle null hash in existeDigitalHash', async () => {
      // Arrange
      const hashDigital = null as any;
      const mockResult = { existe: false, fechaExpiracion: '' };
      mockGetEstatusDigital.mockResolvedValue(mockResult);

      // Act
      const result = await hashRepository.existeDigitalHash(hashDigital);

      // Assert
      expect(mockGetEstatusDigital).toHaveBeenCalledWith(null, 'test-hash-digital-table');
      expect(result).toEqual(mockResult);
    });

    it('🚫 should handle undefined hash in existeDigitalHash', async () => {
      // Arrange
      const hashDigital = undefined as any;
      const mockResult = { existe: false, fechaExpiracion: '' };
      mockGetEstatusDigital.mockResolvedValue(mockResult);

      // Act
      const result = await hashRepository.existeDigitalHash(hashDigital);

      // Assert
      expect(mockGetEstatusDigital).toHaveBeenCalledWith(undefined, 'test-hash-digital-table');
      expect(result).toEqual(mockResult);
    });

    it('📏 should handle multiple concurrent operations', async () => {
      // Arrange
      const hashes = ['hash1', 'hash2', 'hash3'];
      const duracionMinutos = 60;
      
      mockSend.mockResolvedValue({});
      mockGetEstatusDigital.mockResolvedValue({ existe: true, fechaExpiracion: '2024-12-31 23:59:59' });
      mockDeleteItem.mockResolvedValue(undefined);

      // Act
      const promises = hashes.map(async (hash) => {
        await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");
        await hashRepository.existeDigitalHash(hash);
        return hashRepository.deleteItemByTableName(hash, 'test-table');
      });

      const results = await Promise.all(promises);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(mockGetEstatusDigital).toHaveBeenCalledTimes(3);
      expect(mockDeleteItem).toHaveBeenCalledTimes(3);
      expect(results).toEqual([true, true, true]);
    });

    it('📏 should handle very large numbers in duration', async () => {
      // Arrange
      const hash = 'large-duration-hash';
      const duracionMinutos = Number.MAX_SAFE_INTEGER;
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: hash },
          'expires_at': { N: expect.any(String) },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });

    it('📏 should handle floating point duration', async () => {
      // Arrange
      const hash = 'float-duration-hash';
      const duracionMinutos = 30.5;
      
      mockSend.mockResolvedValue({});

      // Act
      await hashRepository.guardarHashEnTabla(hash, duracionMinutos, "test-hash-usuario-table");

      // Assert
      expect(mockPutItemCommand).toHaveBeenCalledWith({
        TableName: 'test-hash-usuario-table',
        Item: {
          'id': { S: hash },
          'expires_at': { N: expect.any(String) },
          'expires_date': { S: '2024-01-01 12:00:00' },
          'fueusado': { S: 'NO_FUE_USADO' }
        }
      });
    });
  });
});
