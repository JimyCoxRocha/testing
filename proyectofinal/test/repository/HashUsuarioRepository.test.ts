/**
 * Unit Tests para HashUsuarioRepository
 * 
 * Este test cubre todas las funciones del repositorio de hash de usuario:
 * - deleteHash: Eliminar hash de usuario de DynamoDB
 * - getHash: Obtener hash de usuario de DynamoDB
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de entrada
 * - Casos edge (valores vacíos, null, etc.)
 * - Diferentes configuraciones de variables de entorno
 */

import { HashUsuarioRepository } from '../../src/repository/HashUsuarioRepository';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';

// Mock de dependencias
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  GetItemCommand: jest.fn().mockImplementation((params) => params),
  DeleteItemCommand: jest.fn().mockImplementation((params) => params)
}));

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = jest.fn();

  // Mock de clase
  class MockDynamoDBDocumentClient {
    static from() {
      return { send: mockSend };
    }
  }
  return {
    DynamoDBDocumentClient: MockDynamoDBDocumentClient,
  };
});

const mockDynamoDBClient = DynamoDBClient as jest.MockedClass<typeof DynamoDBClient>;
const mockGetItemCommand = GetItemCommand as jest.MockedClass<typeof GetItemCommand>;
const mockDeleteItemCommand = DeleteItemCommand as jest.MockedClass<typeof DeleteItemCommand>;

describe('HashUsuarioRepository - Unit Tests', () => {
  let hashUsuarioRepository: HashUsuarioRepository;
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

    // Setup mock
    mockSend = jest.fn();
    
    // Mock the DynamoDBClient constructor to return our mock
    (DynamoDBClient as jest.Mock).mockImplementation(() => ({
      send: mockSend
    }));

    hashUsuarioRepository = new HashUsuarioRepository();
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    delete process.env.TABLA_HASH_USUARIO_NAME;
  });

  describe('deleteHash', () => {
    it('✅ should delete hash successfully', async () => {
      // Arrange
      const id = 'test-hash-id-123';
      mockSend.mockResolvedValue({});

      // Act
      await hashUsuarioRepository.deleteHash(id);

      // Assert
      expect(mockDeleteItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: id } }
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(`Hash eliminado exitosamente para id: ${id}`);
    });

    it('✅ should delete hash with special characters', async () => {
      // Arrange
      const id = 'hash-with-special-chars!@#$%^&*()';
      mockSend.mockResolvedValue({});

      // Act
      await hashUsuarioRepository.deleteHash(id);

      // Assert
      expect(mockDeleteItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: id } }
      });
      expect(consoleSpy.log).toHaveBeenCalledWith(`Hash eliminado exitosamente para id: ${id}`);
    });

    it('✅ should delete hash with very long string', async () => {
      // Arrange
      const id = 'a'.repeat(1000);
      mockSend.mockResolvedValue({});

      // Act
      await hashUsuarioRepository.deleteHash(id);

      // Assert
      expect(mockDeleteItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: id } }
      });
      expect(consoleSpy.log).toHaveBeenCalledWith(`Hash eliminado exitosamente para id: ${id}`);
    });

    it('✅ should handle undefined table name', async () => {
      // Arrange
      delete process.env.TABLA_HASH_USUARIO_NAME;
      const id = 'test-hash-id';
      mockSend.mockResolvedValue({});

      // Act
      await hashUsuarioRepository.deleteHash(id);

      // Assert
      expect(mockDeleteItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: id } }
      });
    });

    it('❌ should handle DynamoDB error', async () => {
      // Arrange
      const id = 'test-hash-error';
      const dynamoError = new Error('DynamoDB error');
      mockSend.mockRejectedValue(dynamoError);

      // Act & Assert
      await expect(hashUsuarioRepository.deleteHash(id)).rejects.toThrow(dynamoError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al eliminar hash:', dynamoError);
    });

    it('❌ should handle DynamoDB timeout error', async () => {
      // Arrange
      const id = 'test-hash-timeout';
      const timeoutError = new Error('Request timeout');
      mockSend.mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(hashUsuarioRepository.deleteHash(id)).rejects.toThrow(timeoutError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al eliminar hash:', timeoutError);
    });

    it('❌ should handle DynamoDB permission error', async () => {
      // Arrange
      const id = 'test-hash-permission';
      const permissionError = new Error('Access Denied');
      mockSend.mockRejectedValue(permissionError);

      // Act & Assert
      await expect(hashUsuarioRepository.deleteHash(id)).rejects.toThrow(permissionError);
      expect(consoleSpy.error).toHaveBeenCalledWith('Error al eliminar hash:', permissionError);
    });

    it('✅ should handle empty id', async () => {
      // Arrange
      const id = '';
      mockSend.mockResolvedValue({});

      // Act
      await hashUsuarioRepository.deleteHash(id);

      // Assert
      expect(mockDeleteItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: '' } }
      });
    });

    it('✅ should handle null id', async () => {
      // Arrange
      const id = null as any;
      mockSend.mockResolvedValue({});

      // Act
      await hashUsuarioRepository.deleteHash(id);

      // Assert
      expect(mockDeleteItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: null } }
      });
    });

    it('✅ should handle undefined id', async () => {
      // Arrange
      const id = undefined as any;
      mockSend.mockResolvedValue({});

      // Act
      await hashUsuarioRepository.deleteHash(id);

      // Assert
      expect(mockDeleteItemCommand).toHaveBeenCalledWith({
        TableName: undefined,
        Key: { 'id': { S: undefined } }
      });
    });
  });

  describe('getHash', () => {
    it('✅ should get hash successfully when item exists', async () => {
      // Arrange
      const id = 'test-hash-id-123';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');


      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledWith(`🔍 Hash a buscar: ${id}`);
      expect(consoleSpy.log).toHaveBeenCalledWith(`🔍 Resultado de DynamoDB:`, JSON.stringify(mockDynamoResult));
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Hash encontrado en DynamoDB');
      
      expect(result).toEqual({
        id: id,
        hash: id,
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
    });

    it('✅ should return null when item does not exist', async () => {
      // Arrange
      const id = 'non-existent-hash';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: undefined,
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
     
      expect(result).toBeNull();
    });

    it('✅ should return null when item is null', async () => {
      // Arrange
      const id = 'null-item-hash';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: undefined,
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('❌ Hash no encontrado en DynamoDB');
      expect(result).toBeNull();
    });

    it('✅ should handle hash with special characters', async () => {
      // Arrange
      const id = 'hash-with-special-chars!@#$%^&*()';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: id,
        hash: id,
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
    });

    it('✅ should handle very long hash', async () => {
      // Arrange
      const id = 'a'.repeat(1000);
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: id,
        hash: id,
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
    });


    it('✅ should handle empty id', async () => {
      // Arrange
      const id = '';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: '',
        hash: '',
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
    });

    it('✅ should handle null id', async () => {
      // Arrange
      const id = null as any;
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: 'null' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: 'null',
        hash: 'null',
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
    });

    it('✅ should handle undefined id', async () => {
      // Arrange
      const id = undefined as any;
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: 'undefined' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: 'undefined',
        hash: 'undefined',
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
    });

    it('✅ should handle item with missing fields', async () => {
      // Arrange
      const id = 'test-hash-missing-fields';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id }
          // expires_date is missing
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: id,
        hash: id,
        expires_date: undefined,
        referenciaRes: '',
        sesionValida: true
      });
    });

    it('✅ should handle item with null fields', async () => {
      // Arrange
      const id = 'test-hash-null-fields';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          expires_date: { S: 'null' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: id,
        hash: id,
        expires_date: 'null',
        referenciaRes: '',
        sesionValida: true
      });
    });

    it('❌ should handle DynamoDB error and return null', async () => {
      // Arrange
      const id = 'error-hash';
      const dynamoError = new Error('DynamoDB error');
      mockSend.mockRejectedValue(dynamoError);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Error al consultar hash:', dynamoError);
      expect(result).toBeNull();
    });

    it('❌ should handle DynamoDB timeout error and return null', async () => {
      // Arrange
      const id = 'timeout-hash';
      const timeoutError = new Error('Request timeout');
      mockSend.mockRejectedValue(timeoutError);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Error al consultar hash:', timeoutError);
      expect(result).toBeNull();
    });

    it('❌ should handle DynamoDB permission error and return null', async () => {
      // Arrange
      const id = 'permission-hash';
      const permissionError = new Error('Access Denied');
      mockSend.mockRejectedValue(permissionError);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Error al consultar hash:', permissionError);
      expect(result).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle complete hash lifecycle', async () => {
      // Arrange
      const id = 'lifecycle-hash-123';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      
      mockSend
        .mockResolvedValueOnce(mockDynamoResult) // getHash
        .mockResolvedValueOnce({}); // deleteHash

      // Act
      const getResult = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');
      await hashUsuarioRepository.deleteHash(id);

      // Assert
      expect(getResult).toEqual({
        id: id,
        hash: id,
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('🔄 should handle hash operations with errors', async () => {
      // Arrange
      const id = 'error-hash-123';
      const dynamoError = new Error('DynamoDB error');
      
      mockSend
        .mockRejectedValueOnce(dynamoError) // getHash error
        .mockRejectedValueOnce(dynamoError); // deleteHash error

      // Act & Assert
      const getResult = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');
      expect(getResult).toBeNull();
      
      await expect(hashUsuarioRepository.deleteHash(id)).rejects.toThrow(dynamoError);
    });
  });

  describe('Edge cases and error handling', () => {
    it('📏 should handle multiple concurrent operations', async () => {
      // Arrange
      const ids = ['hash1', 'hash2', 'hash3'];
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: 'hash1' },
          expires_date: { S: '2024-12-31 23:59:59' }
        },
        $metadata: {}
      };
      
      mockSend
        .mockResolvedValueOnce(mockDynamoResult) // getHash for hash1
        .mockResolvedValueOnce({}) // deleteHash for hash1
        .mockResolvedValueOnce({ Item: undefined, $metadata: {} }) // getHash for hash2
        .mockResolvedValueOnce({}) // deleteHash for hash2
        .mockResolvedValueOnce(mockDynamoResult) // getHash for hash3
        .mockResolvedValueOnce({}); // deleteHash for hash3

      // Act
      const promises = ids.map(async (id) => {
        const getResult = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');
        await hashUsuarioRepository.deleteHash(id);
        return getResult;
      });

      const results = await Promise.all(promises);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(6);
      expect(results[0]).toEqual({
        id: 'hash1',
        hash: 'hash1',
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
      expect(results[1]).toBeNull();
      expect(results[2]).toBeNull();
    });

    it('📏 should handle very large DynamoDB responses', async () => {
      // Arrange
      const id = 'large-response-hash';
      const largeExpiresDate = '2024-12-31 23:59:59.999999999';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          expires_date: { S: largeExpiresDate }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: id,
        hash: id,
        expires_date: largeExpiresDate,
        referenciaRes: '',
        sesionValida: true
      });
    });

    it('📏 should handle complex DynamoDB item structure', async () => {
      // Arrange
      const id = 'complex-structure-hash';
      const mockDynamoResult: GetItemCommandOutput = {
        Item: {
          id: { S: id },
          expires_date: { S: '2024-12-31 23:59:59' },
          // Additional fields that should be ignored
          extra_field: { S: 'extra_value' },
          another_field: { N: '123' }
        },
        $metadata: {}
      };
      mockSend.mockResolvedValue(mockDynamoResult);

      // Act
      const result = await hashUsuarioRepository.getHash(id, 'test-hash-usuario-table');

      // Assert
      expect(result).toEqual({
        id: id,
        hash: id,
        expires_date: '2024-12-31 23:59:59',
        referenciaRes: '',
        sesionValida: true
      });
    });
  });
});
