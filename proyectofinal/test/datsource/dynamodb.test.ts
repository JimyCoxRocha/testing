/**
 * Unit Tests para DynamoDB DataSource
 * 
 * Este test cubre todas las funciones del módulo dynamodb.ts:
 * - putItem: Guardar elementos en DynamoDB
 * - getEstatusDigital: Consultar estado digital de un hash
 * - deleteItem: Eliminar elementos de DynamoDB
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Casos edge (valores vacíos, null, etc.)
 * - Escenarios de integración
 * - Operaciones concurrentes
 */

import { AttributeValue } from '@aws-sdk/client-dynamodb';
import { IDigitalDb } from '../../src/beans/general.interface';

// Mock de AWS SDK usando jest.mock con factory function
jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn();
  return {
    DynamoDBClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutItemCommand: jest.fn(),
    GetItemCommand: jest.fn(),
    DeleteItemCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const mockDocSend = jest.fn();
  return {
    DynamoDBDocumentClient: {
      from: jest.fn().mockReturnValue({
        send: mockDocSend,
      }),
    },
  };
});

// Importar después de configurar los mocks
import { putItem, getEstatusDigital, deleteItem } from '../../src/datsource/dynamodb';

describe('DynamoDB DataSource - Unit Tests', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock de console para evitar ruido en los tests
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('putItem', () => {
    const mockTableElement: Record<string, AttributeValue> = {
      id: { S: 'test-id' },
      data: { S: 'test-data' }
    };
    const mockTableName = 'test-table';

    it('✅ should successfully put item to DynamoDB', async () => {
      // Arrange
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      // Mock del docClient.send
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await putItem(mockTableElement, mockTableName);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('❌ should handle DynamoDB errors gracefully', async () => {
      // Arrange
      const mockError = new Error('DynamoDB error');
      
      // Mock del docClient.send para que falle
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockRejectedValueOnce(mockError);

      // Act
      const result = await putItem(mockTableElement, mockTableName);

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Ha ocurrido un error al guardar los datos en base de datos: ',
        mockError
      );
    });

    it('🔍 should handle empty table element', async () => {
      // Arrange
      const emptyTableElement = {};
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await putItem(emptyTableElement, mockTableName);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('🔍 should handle empty table name', async () => {
      // Arrange
      const emptyTableName = '';
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockResolvedValueOnce(mockResponse);

      // Act
      const result = await putItem(mockTableElement, emptyTableName);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('getEstatusDigital', () => {
    const mockHashDigital = 'test-hash-digital';
    const mockTableName = 'test-table';

    it('✅ should return digital status when item exists', async () => {
      // Arrange
      const mockDynamoResponse = {
        Item: {
          id: { S: 'test-hash-digital' },
          fechaExpiracion: { S: '2024-12-31T23:59:59Z' }
        }
      };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockDynamoResponse);

      // Act
      const result = await getEstatusDigital(mockHashDigital, mockTableName);

      // Assert
      const expectedResult: IDigitalDb = {
        hash: 'test-hash-digital',
        existe: true,
        fechaExpiracion: '2024-12-31T23:59:59Z'
      };
      expect(result).toEqual(expectedResult);
      expect(mockClient.send).toHaveBeenCalledTimes(1);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        'DYNAMO: respuesta de consulta => ',
        JSON.stringify(mockDynamoResponse)
      );
    });

    it('❌ should return non-existent status when item does not exist', async () => {
      // Arrange
      const mockDynamoResponse = {
        Item: undefined
      };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockDynamoResponse);

      // Act
      const result = await getEstatusDigital(mockHashDigital, mockTableName);

      // Assert
      const expectedResult = {
        existe: false
      } as IDigitalDb;
      expect(result).toEqual(expectedResult);
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it('❌ should return non-existent status when item exists but has no id', async () => {
      // Arrange
      const mockDynamoResponse = {
        Item: {
          fechaExpiracion: { S: '2024-12-31T23:59:59Z' }
          // No hay campo 'id'
        }
      };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockDynamoResponse);

      // Act
      const result = await getEstatusDigital(mockHashDigital, mockTableName);

      // Assert
      const expectedResult = {
        existe: false
      } as IDigitalDb;
      expect(result).toEqual(expectedResult);
    });

    it('❌ should return non-existent status when item exists but id is null', async () => {
      // Arrange
      const mockDynamoResponse = {
        Item: {
          id: null,
          fechaExpiracion: { S: '2024-12-31T23:59:59Z' }
        }
      };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockDynamoResponse);

      // Act
      const result = await getEstatusDigital(mockHashDigital, mockTableName);

      // Assert
      const expectedResult = {
        existe: false
      } as IDigitalDb;
      expect(result).toEqual(expectedResult);
    });

    it('❌ should handle DynamoDB errors gracefully', async () => {
      // Arrange
      const mockError = new Error('DynamoDB error');
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockRejectedValueOnce(mockError);

      // Act
      const result = await getEstatusDigital(mockHashDigital, mockTableName);

      // Assert
      const expectedResult = {
        existe: false
      } as IDigitalDb;
      expect(result).toEqual(expectedResult);
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Ha ocurrido un error al consultar los datos en base de datos: ' + mockError
      );
    });

    it('🔍 should handle empty hash digital', async () => {
      // Arrange
      const emptyHashDigital = '';
      const mockDynamoResponse = {
        Item: undefined
      };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockDynamoResponse);

      // Act
      const result = await getEstatusDigital(emptyHashDigital, mockTableName);

      // Assert
      const expectedResult = {
        existe: false
      } as IDigitalDb;
      expect(result).toEqual(expectedResult);
      
    });

    it('🔍 should handle empty table name', async () => {
      // Arrange
      const emptyTableName = '';
      const mockDynamoResponse = {
        Item: undefined
      };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockDynamoResponse);

      // Act
      const result = await getEstatusDigital(mockHashDigital, emptyTableName);

      // Assert
      const expectedResult = {
        existe: false
      } as IDigitalDb;
      expect(result).toEqual(expectedResult);
     
    });

    it('🔍 should handle item with empty id string', async () => {
      // Arrange
      const mockDynamoResponse = {
        Item: {
          id: { S: '' }, // ID vacío
          fechaExpiracion: { S: '2024-12-31T23:59:59Z' }
        }
      };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockDynamoResponse);

      // Act
      const result = await getEstatusDigital(mockHashDigital, mockTableName);

      // Assert
      const expectedResult = {
        existe: false
      } as IDigitalDb;
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteItem', () => {
    const mockKey = 'test-key';
    const mockTableName = 'test-table';

    it('✅ should successfully delete item from DynamoDB', async () => {
      // Arrange
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockResponse);

      // Act
      await deleteItem(mockKey, mockTableName);

      // Assert
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it('❌ should handle DynamoDB errors during deletion', async () => {
      // Arrange
      const mockError = new Error('DynamoDB deletion error');
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockRejectedValueOnce(mockError);

      // Act & Assert
      await expect(deleteItem(mockKey, mockTableName)).rejects.toThrow('DynamoDB deletion error');
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it('🔍 should handle empty key', async () => {
      // Arrange
      const emptyKey = '';
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockResponse);

      // Act
      await deleteItem(emptyKey, mockTableName);

      // Assert
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it('🔍 should handle empty table name', async () => {
      // Arrange
      const emptyTableName = '';
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockResponse);

      // Act
      await deleteItem(mockKey, emptyTableName);

      // Assert
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it('🔍 should handle special characters in key', async () => {
      // Arrange
      const specialKey = 'test-key-with-special-chars-!@#$%^&*()';
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send.mockResolvedValueOnce(mockResponse);

      // Act
      await deleteItem(specialKey, mockTableName);

      // Assert
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle multiple operations in sequence', async () => {
      // Arrange
      const mockTableElement: Record<string, AttributeValue> = {
        id: { S: 'integration-test' },
        data: { S: 'test-data' }
      };
      const mockTableName = 'integration-table';
      const mockHashDigital = 'integration-hash';
      
      const putResponse = { $metadata: { httpStatusCode: 200 } };
      const getResponse = {
        Item: {
          id: { S: 'integration-hash' },
          fechaExpiracion: { S: '2024-12-31T23:59:59Z' }
        }
      };
      const deleteResponse = { $metadata: { httpStatusCode: 200 } };

      // Mock para putItem (docClient)
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockResolvedValueOnce(putResponse);

      // Mock para getEstatusDigital y deleteItem (client)
      const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
      const mockClient = new DynamoDBClient();
      mockClient.send
        .mockResolvedValueOnce(getResponse)
        .mockResolvedValueOnce(deleteResponse);

      // Act
      const putResult = await putItem(mockTableElement, mockTableName);
      const getResult = await getEstatusDigital(mockHashDigital, mockTableName);
      await deleteItem(mockHashDigital, mockTableName);

      // Assert
      expect(putResult).toEqual(putResponse);
      expect(getResult).toEqual({
        hash: 'integration-hash',
        existe: true,
        fechaExpiracion: '2024-12-31T23:59:59Z'
      });
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
      expect(mockClient.send).toHaveBeenCalledTimes(2);
    });

    it('⚡ should handle concurrent operations', async () => {
      // Arrange
      const mockTableName = 'concurrent-table';
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockResolvedValue(mockResponse);

      // Act
      const promises = [
        putItem({ id: { S: 'key1' } }, mockTableName),
        putItem({ id: { S: 'key2' } }, mockTableName),
        putItem({ id: { S: 'key3' } }, mockTableName)
      ];

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(3);
      expect(results.every(result => result === mockResponse)).toBe(true);
      expect(mockDocClient.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge cases and error handling', () => {
    it('🚫 should handle null/undefined inputs gracefully', async () => {
      // Arrange
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockResolvedValue(mockResponse);

      // Act & Assert - putItem with null table element
      const putResult = await putItem(null as any, 'test-table');
      expect(putResult).toEqual(mockResponse);

      // Act & Assert - getEstatusDigital with null hash
      const getResult = await getEstatusDigital(null as any, 'test-table');
      expect(getResult).toEqual({ existe: false });

      // Act & Assert - deleteItem with null key
      await expect(deleteItem(null as any, 'test-table')).resolves.not.toThrow();
    });

    it('📏 should handle very long strings', async () => {
      // Arrange
      const longString = 'a'.repeat(10000);
      const mockTableElement: Record<string, AttributeValue> = {
        id: { S: longString },
        data: { S: longString }
      };
      const mockResponse = { $metadata: { httpStatusCode: 200 } };
      
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockResolvedValue(mockResponse);

      // Act
      const result = await putItem(mockTableElement, 'test-table');

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockDocClient.send).toHaveBeenCalledTimes(1);
    });

    it('⏰ should handle network timeout scenarios', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
      const mockDocClient = DynamoDBDocumentClient.from();
      mockDocClient.send.mockRejectedValueOnce(timeoutError);

      // Act
      const result = await putItem({ id: { S: 'test' } }, 'test-table');

      // Assert
      expect(result).toBeNull();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Ha ocurrido un error al guardar los datos en base de datos: ',
        timeoutError
      );
    });
  });
});