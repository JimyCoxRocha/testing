/**
 * Unit Tests para Utils
 * 
 * Este test cubre todas las funciones del módulo utils.ts:
 * - ResponseHandler: Manejo de respuestas exitosas y de error
 * - Util: Funciones utilitarias diversas
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Casos edge (valores vacíos, null, etc.)
 * - Validaciones de entrada
 * - Generación de hashes
 * - Formateo de fechas
 */

import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { ResponseHandler, Util } from '../../src/utils/utils';
import { Constants } from '../../src/constant/Constants';

// Mock de crypto
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mocked-hash-value')
  }))
}));

// Mock de moment-timezone
jest.mock('moment-timezone', () => {
  const moment = jest.fn(() => ({
    utcOffset: jest.fn().mockReturnThis(),
    format: jest.fn(() => '2024-01-15')
  }));
  return moment;
});

describe('Utils - Unit Tests', () => {
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

    // Mock de process.env
    process.env.HABILITAR_BODY_SIZE_LENGTH = 'true:1000';
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('ResponseHandler', () => {
    describe('success', () => {
      it('✅ should return success response with default status code', () => {
        // Arrange
        const data = {
          codigoError: 0,
          mensajeUsuario: 'Operación exitosa',
          data: { id: 123 }
        };

        // Act
        const result = ResponseHandler.success(data);

        // Assert
        expect(result.statusCode).toBe(200);
        expect(result.headers).toMatchObject({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'referrer-policy': 'no-referrer',
          'content-security-policy': "default-src 'self';",
          'x-content-type-options': 'nosniff',
          'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
          'X-Frame-Options': 'SAMEORIGIN',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        
        const body = JSON.parse(result.body);
        expect(body).toMatchObject(data);
        expect(body.timestamp).toBeDefined();
      });

      it('✅ should return success response with custom status code', () => {
        // Arrange
        const data = { message: 'Created' };
        const customStatusCode = 201;

        // Act
        const result = ResponseHandler.success(data, customStatusCode);

        // Assert
        expect(result.statusCode).toBe(201);
        expect(result.headers?.['Content-Type']).toBe('application/json');
        
        const body = JSON.parse(result.body);
        expect(body.message).toBe('Created');
        expect(body.timestamp).toBeDefined();
      });

      it('✅ should preserve existing timestamp in data', () => {
        // Arrange
        const data = {
          message: 'Test',
          timestamp: '2024-01-15T10:00:00Z'
        };

        // Act
        const result = ResponseHandler.success(data);

        // Assert
        const body = JSON.parse(result.body);
        expect(body.timestamp).toBe('2024-01-15T10:00:00Z');
      });

      it('✅ should handle empty data object', () => {
        // Arrange
        const data = {};

        // Act
        const result = ResponseHandler.success(data);

        // Assert
        expect(result.statusCode).toBe(200);
        const body = JSON.parse(result.body);
        expect(body.timestamp).toBeDefined();
      });
    });

    describe('error', () => {
      it('❌ should return error response with default status code', () => {
        // Arrange
        const codigoError = 500;
        const mensajeUsuario = 'Error del usuario';
        const mensajeSistema = 'Error del sistema';

        // Act
        const result = ResponseHandler.error(codigoError, mensajeUsuario, mensajeSistema);

        // Assert
        expect(result.statusCode).toBe(500);
        expect(result.headers).toMatchObject({
          'Content-Type': 'application/json',
          'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'referrer-policy': 'no-referrer',
          'content-security-policy': "default-src 'self';",
          'x-content-type-options': 'nosniff',
          'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
          'X-Frame-Options': 'SAMEORIGIN',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        });
        
        const body = JSON.parse(result.body);
        expect(body).toEqual({
          codigoError: 500,
          mensajeUsuario: 'Error del usuario',
          mensajeSistema: 'Error del sistema',
          timestamp: expect.any(String)
        });
      });

      it('❌ should return error response with custom status code', () => {
        // Arrange
        const codigoError = 403;
        const mensajeUsuario = 'Acceso denegado';
        const mensajeSistema = 'Forbidden';
        const customStatusCode = 403;

        // Act
        const result = ResponseHandler.error(codigoError, mensajeUsuario, mensajeSistema, customStatusCode);

        // Assert
        expect(result.statusCode).toBe(403);
        const body = JSON.parse(result.body);
        expect(body.codigoError).toBe(403);
        expect(body.mensajeUsuario).toBe('Acceso denegado');
        expect(body.mensajeSistema).toBe('Forbidden');
      });

      it('❌ should handle zero error code', () => {
        // Arrange
        const codigoError = 0;
        const mensajeUsuario = 'Sin errores';
        const mensajeSistema = 'No errors';

        // Act
        const result = ResponseHandler.error(codigoError, mensajeUsuario, mensajeSistema);

        // Assert
        const body = JSON.parse(result.body);
        expect(body.codigoError).toBe(0);
      });
    });
  });

  describe('Util', () => {
    describe('unescapeString', () => {
      it('✅ should unescape forward slashes', () => {
        // Arrange
        const input = 'path\\/to\\/file';
        const expected = 'path/to/file';

        // Act
        const result = Util.unescapeString(input);

        // Assert
        expect(result).toBe(expected);
      });

      it('✅ should handle string without escaped slashes', () => {
        // Arrange
        const input = 'normal/path/to/file';

        // Act
        const result = Util.unescapeString(input);

        // Assert
        expect(result).toBe(input);
      });

      it('✅ should handle empty string', () => {
        // Arrange
        const input = '';

        // Act
        const result = Util.unescapeString(input);

        // Assert
        expect(result).toBe('');
      });

      it('✅ should handle multiple escaped slashes', () => {
        // Arrange
        const input = 'path\\/to\\/another\\/file';
        const expected = 'path/to/another/file';

        // Act
        const result = Util.unescapeString(input);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe('adicionaClienteMigradoHeader', () => {
      it('✅ should return headers with default values when no API headers provided', () => {
        // Arrange
        const apiHeader: APIGatewayProxyEventHeaders = {};

        // Act
        const result = Util.adicionaClienteMigradoHeader(apiHeader);

        // Assert
        expect(result).toEqual({
          codigoMis: Constants.CODIGOMIS,
          pais: Constants.PAIS,
          tipoLogin: Constants.TIPOLOGIN,
          nombreEquipo: Constants.NOMBREEQUIPO,
          serial: Constants.SERIAL,
          numero: Constants.NUMERO,
          imei: Constants.IMEI,
          marca: Constants.MARCA,
          modelo: Constants.MODELO,
          identificacion: Constants.IDENTIFICACION
        });
      });

      it('✅ should use API header values when provided', () => {
        // Arrange
        const apiHeader: APIGatewayProxyEventHeaders = {
          codigoMIS: '123',
          pais: 'US',
          tipoLogin: 'A',
          nombreEquipo: 'test-equipo',
          serial: '9876543210',
          numero: '1234567890',
          imei: '111111111111111',
          marca: 'Samsung',
          modelo: 'Galaxy',
          identificacion: '1234567890'
        };

        // Act
        const result = Util.adicionaClienteMigradoHeader(apiHeader);

        // Assert
        expect(result).toEqual({
          codigoMis: '123',
          pais: 'US',
          tipoLogin: 'A',
          nombreEquipo: 'test-equipo',
          serial: '9876543210',
          numero: '1234567890',
          imei: '111111111111111',
          marca: 'Samsung',
          modelo: 'Galaxy',
          identificacion: '1234567890'
        });
      });

      it('✅ should include optional fields when provided', () => {
        // Arrange
        const apiHeader: APIGatewayProxyEventHeaders = {
          ip: '192.168.1.1',
          usuario: 'testuser',
          secuencial: '123456789'
        };

        // Act
        const result = Util.adicionaClienteMigradoHeader(apiHeader);

        // Assert
        expect(result.ip).toBe('192.168.1.1');
        expect(result.usuario).toBe('testuser');
        expect(result.secuencial).toBe('23456789');
      });

      it('✅ should truncate secuencial when longer than 8 characters', () => {
        // Arrange
        const apiHeader: APIGatewayProxyEventHeaders = {
          secuencial: '123456789012345'
        };

        // Act
        const result = Util.adicionaClienteMigradoHeader(apiHeader);

        // Assert
        expect(result.secuencial).toBe('89012345');
      });

      it('✅ should not include optional fields when not provided', () => {
        // Arrange
        const apiHeader: APIGatewayProxyEventHeaders = {};

        // Act
        const result = Util.adicionaClienteMigradoHeader(apiHeader);

        // Assert
        expect(result.ip).toBeUndefined();
        expect(result.usuario).toBeUndefined();
        expect(result.secuencial).toBeUndefined();
      });

      it('✅ should handle empty secuencial', () => {
        // Arrange
        const apiHeader: APIGatewayProxyEventHeaders = {
          secuencial: ''
        };

        // Act
        const result = Util.adicionaClienteMigradoHeader(apiHeader);

        // Assert
        expect(result.secuencial).toBeUndefined();
      });

      it('✅ should handle secuencial exactly 8 characters', () => {
        // Arrange
        const apiHeader: APIGatewayProxyEventHeaders = {
          secuencial: '12345678'
        };

        // Act
        const result = Util.adicionaClienteMigradoHeader(apiHeader);

        // Assert
        expect(result.secuencial).toBe('12345678');
      });
    });

    describe('validateBodySize', () => {
      it('✅ should pass validation when body size is within limit', () => {
        // Arrange
        const data = 'a'.repeat(500); // 500 characters
        process.env.HABILITAR_BODY_SIZE_LENGTH = 'true:1000';

        // Act & Assert
        expect(() => Util.validateBodySize(data)).not.toThrow();
      });

      it('❌ should throw error when body size exceeds limit', () => {
        // Arrange
        const data = 'a'.repeat(1500); // 1500 characters
        process.env.HABILITAR_BODY_SIZE_LENGTH = 'true:1000';

        // Act & Assert
        expect(() => Util.validateBodySize(data)).toThrow('Se excedió el peso de request permitido.');
      });

      it('✅ should skip validation when disabled', () => {
        // Arrange
        const data = 'a'.repeat(1500); // 1500 characters
        process.env.HABILITAR_BODY_SIZE_LENGTH = 'false:1000';

        // Act & Assert
        expect(() => Util.validateBodySize(data)).not.toThrow();
      });

      it('✅ should handle empty string', () => {
        // Arrange
        const data = '';
        process.env.HABILITAR_BODY_SIZE_LENGTH = 'true:1000';

        // Act & Assert
        expect(() => Util.validateBodySize(data)).not.toThrow();
      });

      it('✅ should handle exact limit size', () => {
        // Arrange
        const data = 'a'.repeat(1000); // Exactly 1000 characters
        process.env.HABILITAR_BODY_SIZE_LENGTH = 'true:1000';

        // Act & Assert
        expect(() => Util.validateBodySize(data)).not.toThrow();
      });

      it('✅ should handle unicode characters correctly', () => {
        // Arrange
        const data = 'ñáéíóú'.repeat(100); // Unicode characters
        process.env.HABILITAR_BODY_SIZE_LENGTH = 'true:1000';

        // Act & Assert
        expect(() => Util.validateBodySize(data)).not.toThrow();
      });
    });

    describe('getResponseHeader', () => {
      it('✅ should return security headers', () => {
        // Act
        const result = Util.getResponseHeader();

        // Assert
        expect(result).toEqual({
          headers: {
            'referrer-policy': 'no-referrer',
            'content-security-policy': "default-src 'self';",
            'x-content-type-options': 'nosniff',
            'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
            'X-Frame-Options': 'SAMEORIGIN',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
      });
    });

    describe('validarCaracteresEspeciales', () => {
      it('❌ should throw error for string with prohibited characters', () => {
        // Arrange
        const obj = 'text with <script>alert("xss")</script>';

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).toThrow('Entrada inválida: contiene caracteres no permitidos.');
      });

      it('❌ should throw error for object with prohibited characters', () => {
        // Arrange
        const obj = {
          name: 'John',
          description: 'User with <tag>',
          nested: {
            value: 'Another <script>'
          }
        };

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).toThrow('Entrada inválida: contiene caracteres no permitidos.');
      });

      it('✅ should pass validation for clean string', () => {
        // Arrange
        const obj = 'clean text without prohibited characters';

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).not.toThrow();
      });

      it('✅ should pass validation for clean object', () => {
        // Arrange
        const obj = {
          name: 'John Doe',
          email: 'john@example.com',
          nested: {
            value: 'clean nested value'
          }
        };

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).not.toThrow();
      });

      it('✅ should handle null values', () => {
        // Arrange
        const obj = {
          name: 'John',
          value: null
        };

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).not.toThrow();
      });

      it('✅ should handle empty object', () => {
        // Arrange
        const obj = {};

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).not.toThrow();
      });

      it('✅ should handle array with clean values', () => {
        // Arrange
        const obj = ['clean', 'values', 'array'];

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).not.toThrow();
      });

      it('❌ should throw error for array with prohibited characters', () => {
        // Arrange
        const obj = ['clean', 'value with <tag>', 'array'];

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).toThrow('Entrada inválida: contiene caracteres no permitidos.');
      });

      it('✅ should handle mixed data types', () => {
        // Arrange
        const obj = {
          string: 'clean',
          number: 123,
          boolean: true,
          null: null,
          nested: {
            array: [1, 2, 3],
            string: 'also clean'
          }
        };

        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(obj)).not.toThrow();
      });
    });

    describe('generarHash', () => {

      it('✅ should generate hash with zero monto', () => {
        // Arrange
        const sessionId = 'session123';
        const cedula = '1234567890';
        const tipoTrx = 'TRANSFER';
        const monto = 0;
        const respuesta = 'SUCCESS';

        // Act
        const result = Util.generarHash(sessionId, cedula, tipoTrx, monto, respuesta);

        // Assert
        expect(result).toBe('mocked-hash-value');
      });

      it('✅ should generate hash with negative monto', () => {
        // Arrange
        const sessionId = 'session123';
        const cedula = '1234567890';
        const tipoTrx = 'TRANSFER';
        const monto = -50.25;
        const respuesta = 'SUCCESS';

        // Act
        const result = Util.generarHash(sessionId, cedula, tipoTrx, monto, respuesta);

        // Assert
        expect(result).toBe('mocked-hash-value');
      });

      it('✅ should generate hash with empty strings', () => {
        // Arrange
        const sessionId = '';
        const cedula = '';
        const tipoTrx = '';
        const monto = 0;
        const respuesta = '';

        // Act
        const result = Util.generarHash(sessionId, cedula, tipoTrx, monto, respuesta);

        // Assert
        expect(result).toBe('mocked-hash-value');
      });

      it('✅ should generate hash with special characters in parameters', () => {
        // Arrange
        const sessionId = 'session|with|pipes';
        const cedula = '123-456-789';
        const tipoTrx = 'TRANSFER&PAYMENT';
        const monto = 999.99;
        const respuesta = 'SUCCESS|FAILED';

        // Act
        const result = Util.generarHash(sessionId, cedula, tipoTrx, monto, respuesta);

        // Assert
        expect(result).toBe('mocked-hash-value');
      });
    });

    describe('getOnlyCurrentDate', () => {
      it('✅ should return formatted date', () => {
        // Act
        const result = Util.getOnlyCurrentDate();

        // Assert
        expect(result).toBe('2024-01-15');
      });

      it('✅ should return consistent date format', () => {
        // Act
        const result1 = Util.getOnlyCurrentDate();
        const result2 = Util.getOnlyCurrentDate();

        // Assert
        expect(result1).toBe(result2);
        expect(typeof result1).toBe('string');
        expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should handle complete request flow', () => {
      // Arrange
      const apiHeaders: APIGatewayProxyEventHeaders = {
        identificacion: '1234567890',
        ip: '192.168.1.1',
        secuencial: '123456789012345'
      };

      // Act
      const headers = Util.adicionaClienteMigradoHeader(apiHeaders);
      const response = ResponseHandler.success({
        data: headers,
        message: 'Request processed'
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.identificacion).toBe('1234567890');
      expect(body.data.ip).toBe('192.168.1.1');
      expect(body.data.secuencial).toBe('89012345'); // Truncated
      expect(body.message).toBe('Request processed');
    });

    it('🔄 should handle error flow with validation', () => {
      // Arrange
      const invalidData = 'data with <script>alert("xss")</script>';

      // Act & Assert
      expect(() => Util.validarCaracteresEspeciales(invalidData)).toThrow();
      
      const errorResponse = ResponseHandler.error(
        403,
        'Entrada inválida',
        'Contiene caracteres no permitidos',
        403
      );

      expect(errorResponse.statusCode).toBe(403);
      const body = JSON.parse(errorResponse.body);
      expect(body.codigoError).toBe(403);
      expect(body.mensajeUsuario).toBe('Entrada inválida');
    });

    it('🔄 should handle hash generation with validation', () => {
      // Arrange
      const cleanData = {
        sessionId: 'session123',
        cedula: '1234567890',
        tipoTrx: 'TRANSFER',
        monto: 100,
        respuesta: 'SUCCESS'
      };

      // Act
      Util.validarCaracteresEspeciales(cleanData);
      const hash = Util.generarHash(
        cleanData.sessionId,
        cleanData.cedula,
        cleanData.tipoTrx,
        cleanData.monto,
        cleanData.respuesta
      );

      // Assert
      expect(hash).toBe('mocked-hash-value');
    });
  });

  describe('Edge cases and error handling', () => {
    it('🚫 should handle undefined environment variables', () => {
      // Arrange
      delete process.env.HABILITAR_BODY_SIZE_LENGTH;
      const data = 'test data';

      // Act & Assert
      expect(() => Util.validateBodySize(data)).toThrow();
    });

    it('🚫 should handle malformed environment variable', () => {
      // Arrange
      process.env.HABILITAR_BODY_SIZE_LENGTH = 'invalid:format';
      const data = 'test data';

      // Act & Assert
      expect(() => Util.validateBodySize(data)).toThrow();
    });

    it('🚫 should handle null input in validarCaracteresEspeciales', () => {
        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(null)).not.toThrow();
      });

    it('🚫 should handle undefined input in validarCaracteresEspeciales', () => {
        // Act & Assert
        expect(() => Util.validarCaracteresEspeciales(undefined)).not.toThrow();
      });

    it('📏 should handle very large objects in validarCaracteresEspeciales', () => {
      // Arrange
      const largeObj = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: 'clean data',
                  array: Array(1000).fill('clean')
                }
              }
            }
          }
        }
      };

      // Act & Assert
      expect(() => Util.validarCaracteresEspeciales(largeObj)).not.toThrow();
    });

    it('📏 should handle very large objects with prohibited characters', () => {
      // Arrange
      const largeObj = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  data: 'clean data',
                  array: Array(1000).fill('clean'),
                  badData: 'data with <script>'
                }
              }
            }
          }
        }
      };

      // Act & Assert
      expect(() => Util.validarCaracteresEspeciales(largeObj)).toThrow('Entrada inválida: contiene caracteres no permitidos.');
    });
  });
});
