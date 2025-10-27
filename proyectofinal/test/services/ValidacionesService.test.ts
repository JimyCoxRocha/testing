/**
 * Unit Tests para ValidacionesService
 * 
 * Este test cubre todas las funciones del servicio de validaciones:
 * - existeClientId: Validar que existe el clientId
 * - validarIdentificacion: Validar identificación contra JWT payload
 * - existeReferenciaHash: Validar que existe referencia y hash
 * 
 * Cobertura completa incluye:
 * - Casos exitosos
 * - Manejo de errores
 * - Validaciones de entrada
 * - Casos edge (valores vacíos, null, etc.)
 * - Diferentes configuraciones de variables de entorno
 */

import { ValidacionesService } from '../../src/services/ValidacionesService';
import { AutorizacionService } from '../../src/services/AutorizacionService';
import { FraudeException } from '../../src/errors/FraudeException';
import { Constants } from '../../src/constant/Constants';
import { DiccionarioMensajes } from '../../src/constant/response-dictionary';
import { IJwtPayload } from '../../src/beans/general.interface';
import * as jwt from 'jsonwebtoken';
import { Util } from '../../src/utils/utils';

// Mock de dependencias
jest.mock('../../src/services/AutorizacionService');
jest.mock('../../src/utils/utils');
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn()
}));

const mockAutorizacionService = AutorizacionService as jest.MockedClass<typeof AutorizacionService>;
const mockUtil = Util as jest.Mocked<typeof Util>;
const mockJwtDecode = jwt.decode as jest.MockedFunction<typeof jwt.decode>;

describe('ValidacionesService - Unit Tests', () => {
  let mockAuthService: jest.Mocked<AutorizacionService>;
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

    // Mock de AutorizacionService
    mockAuthService = {
      existClientId: jest.fn()
    } as any;
    mockAutorizacionService.mockImplementation(() => mockAuthService);

    // Mock de Util
    mockUtil.unescapeString = jest.fn();

    // Mock de jwt ya está configurado globalmente

    // Mock de process.env
    process.env.VALIDAR_IDENTIFICACION_PETICION = 'SI';
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
    delete process.env.VALIDAR_IDENTIFICACION_PETICION;
  });

  describe('existeClientId', () => {
    it('✅ should validate clientId successfully', async () => {
      // Arrange
      const header = {
        clientId: 'valid-client-id'
      };
      mockUtil.unescapeString.mockReturnValue('valid-client-id');
      mockAuthService.existClientId.mockResolvedValue(undefined);

      // Act
      await ValidacionesService.existeClientId(header);

      // Assert
      expect(mockUtil.unescapeString).toHaveBeenCalledWith('valid-client-id');
      expect(consoleSpy.log).toHaveBeenCalledWith('ClientId unescape: ', 'valid-client-id');
      expect(mockAuthService.existClientId).toHaveBeenCalledWith('valid-client-id');
    });

    it('❌ should throw FraudeException when clientId is undefined', async () => {
      // Arrange
      const header = {
        clientId: undefined
      };

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(
        new FraudeException(9403, "No se ha detectado un clientId válido o no existe", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when clientId is null', async () => {
      // Arrange
      const header = {
        clientId: null
      };

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(
        new FraudeException(9403, "No se ha detectado un clientId válido o no existe", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when clientId is empty string', async () => {
      // Arrange
      const header = {
        clientId: ''
      };

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(
        new FraudeException(9403, "No se ha detectado un clientId válido o no existe", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when clientId is whitespace only', async () => {
      // Arrange
      const header = {
        clientId: '   '
      };

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(
        new FraudeException(9403, "No se ha detectado un clientId válido o no existe", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('✅ should pass when clientId has whitespace with content (trimmed)', async () => {
      // Arrange
      const header = {
        clientId: '  valid-id  '
      };
      mockUtil.unescapeString.mockReturnValue('  valid-id  ');
      mockAuthService.existClientId.mockResolvedValue(undefined);

      // Act
      await ValidacionesService.existeClientId(header);

      // Assert
      expect(mockUtil.unescapeString).toHaveBeenCalledWith('  valid-id  ');
      expect(mockAuthService.existClientId).toHaveBeenCalledWith('  valid-id  ');
    });

    it('❌ should propagate error from AutorizacionService', async () => {
      // Arrange
      const header = {
        clientId: 'valid-client-id'
      };
      const authError = new FraudeException(403, 'Client ID not found', 'Error message');
      mockUtil.unescapeString.mockReturnValue('valid-client-id');
      mockAuthService.existClientId.mockRejectedValue(authError);

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(authError);
    });

    it('✅ should handle clientId with special characters', async () => {
      // Arrange
      const header = {
        clientId: 'client-id-with-special-chars!@#'
      };
      mockUtil.unescapeString.mockReturnValue('client-id-with-special-chars!@#');
      mockAuthService.existClientId.mockResolvedValue(undefined);

      // Act
      await ValidacionesService.existeClientId(header);

      // Assert
      expect(mockUtil.unescapeString).toHaveBeenCalledWith('client-id-with-special-chars!@#');
      expect(mockAuthService.existClientId).toHaveBeenCalledWith('client-id-with-special-chars!@#');
    });
  });

  describe('validarIdentificacion', () => {
    const mockJwtPayload: IJwtPayload = {
      sessionId: 'session123',
      token: 'token123',
      uriTech: 'uri123',
      identificacion: '1234567890',
      iat: 1234567890,
      exp: 1234567890,
      iss: 'issuer',
      sub: 'subject',
      aud: 'audience'
    };

    beforeEach(() => {
      mockJwtDecode.mockReturnValue(mockJwtPayload);
    });

    it('✅ should validate identification successfully when header matches payload', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: '1234567890'
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockUtil.unescapeString).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockJwtDecode).toHaveBeenCalledWith('valid-jwt-token');
      expect(consoleSpy.log).toHaveBeenCalledWith('Validación de identificación exitosa');
    });

    it('✅ should pass when no clientId provided', async () => {
      // Arrange
      const header = {
        identificacion: '1234567890'
      };

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockJwtDecode).not.toHaveBeenCalled();
    });

    it('✅ should pass when clientId is null', async () => {
      // Arrange
      const header = {
        clientId: null,
        identificacion: '1234567890'
      };

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockJwtDecode).not.toHaveBeenCalled();
    });

    it('✅ should pass when clientId is undefined', async () => {
      // Arrange
      const header = {
        clientId: undefined,
        identificacion: '1234567890'
      };

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockJwtDecode).not.toHaveBeenCalled();
    });

    it('❌ should throw FraudeException when no header identificacion and validation is enabled', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token'
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('✅ should pass when no header identificacion and validation is disabled', async () => {
      // Arrange
      process.env.VALIDAR_IDENTIFICACION_PETICION = 'NO';
      const header = {
        clientId: 'valid-jwt-token'
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockJwtDecode).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('✅ should pass when header identificacion is empty string and validation is disabled', async () => {
      // Arrange
      process.env.VALIDAR_IDENTIFICACION_PETICION = 'NO';
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: ''
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockJwtDecode).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('✅ should pass when header identificacion is whitespace and validation is disabled', async () => {
      // Arrange
      process.env.VALIDAR_IDENTIFICACION_PETICION = 'NO';
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: '   '
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockJwtDecode).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('❌ should throw FraudeException when header identificacion is empty string and validation is enabled', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: ''
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when header identificacion is whitespace and validation is enabled', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: '   '
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when identificaciones do not match', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: '9876543210'
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when header identificacion is null and validation is enabled', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: null
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when header identificacion is undefined and validation is enabled', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: undefined
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('✅ should pass when payload identificacion is null', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: '1234567890'
      };
      const payloadWithoutIdentificacion = { ...mockJwtPayload, identificacion: null };
      mockJwtDecode.mockReturnValue(payloadWithoutIdentificacion);
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockJwtDecode).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('✅ should pass when payload identificacion is undefined', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: '1234567890'
      };
      const payloadWithoutIdentificacion = { ...mockJwtPayload, identificacion: undefined };
      mockJwtDecode.mockReturnValue(payloadWithoutIdentificacion);
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(mockJwtDecode).toHaveBeenCalledWith('valid-jwt-token');
    });

    it('❌ should throw FraudeException when JWT decode fails and validation is enabled', async () => {
      // Arrange
      const header = {
        clientId: 'invalid-jwt-token',
        identificacion: '1234567890'
      };
      mockUtil.unescapeString.mockReturnValue('invalid-jwt-token');
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid JWT');
      });

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, "Error al validar la identificación", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
      expect(consoleSpy.error).toHaveBeenCalledWith("Error al validar identificación:", expect.any(Error));
    });

    it('✅ should pass when JWT decode fails and validation is disabled', async () => {
      // Arrange
      process.env.VALIDAR_IDENTIFICACION_PETICION = 'NO';
      const header = {
        clientId: 'invalid-jwt-token',
        identificacion: '1234567890'
      };
      mockUtil.unescapeString.mockReturnValue('invalid-jwt-token');
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid JWT');
      });

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(consoleSpy.error).toHaveBeenCalledWith("Error al validar identificación:", expect.any(Error));
    });

    it('❌ should propagate FraudeException from JWT decode', async () => {
      // Arrange
      const header = {
        clientId: 'invalid-jwt-token',
        identificacion: '1234567890'
      };
      const fraudeException = new FraudeException(403, 'JWT Error', 'Error message');
      mockUtil.unescapeString.mockReturnValue('invalid-jwt-token');
      mockJwtDecode.mockImplementation(() => {
        throw fraudeException;
      });

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(fraudeException);
    });

    it('✅ should use default validation setting when env var is undefined', async () => {
      // Arrange
      delete process.env.VALIDAR_IDENTIFICACION_PETICION;
      const header = {
        clientId: 'valid-jwt-token'
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('✅ should use default validation setting when env var is empty', async () => {
      // Arrange
      process.env.VALIDAR_IDENTIFICACION_PETICION = '';
      const header = {
        clientId: 'valid-jwt-token'
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');

      // Act & Assert
      await expect(ValidacionesService.validarIdentificacion(header)).rejects.toThrow(
        new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });
  });

  describe('existeReferenciaHash', () => {
    it('✅ should validate referencia and hash successfully', async () => {
      // Arrange
      const header = {
        referenciaRes: 'valid-reference',
        hash: 'valid-hash'
      };

      // Act
      await ValidacionesService.existeReferenciaHash(header);

      // Assert
      // No exceptions should be thrown
    });

    it('❌ should throw FraudeException when referenciaRes is undefined', async () => {
      // Arrange
      const header = {
        referenciaRes: undefined,
        hash: 'valid-hash'
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when referenciaRes is null', async () => {
      // Arrange
      const header = {
        referenciaRes: null,
        hash: 'valid-hash'
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when referenciaRes is empty string', async () => {
      // Arrange
      const header = {
        referenciaRes: '',
        hash: 'valid-hash'
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when referenciaRes is whitespace only', async () => {
      // Arrange
      const header = {
        referenciaRes: '   ',
        hash: 'valid-hash'
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when hash is undefined', async () => {
      // Arrange
      const header = {
        referenciaRes: 'valid-reference',
        hash: undefined
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when hash is null', async () => {
      // Arrange
      const header = {
        referenciaRes: 'valid-reference',
        hash: null
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when hash is empty string', async () => {
      // Arrange
      const header = {
        referenciaRes: 'valid-reference',
        hash: ''
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when hash is whitespace only', async () => {
      // Arrange
      const header = {
        referenciaRes: 'valid-reference',
        hash: '   '
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('❌ should throw FraudeException when both referenciaRes and hash are invalid', async () => {
      // Arrange
      const header = {
        referenciaRes: '',
        hash: ''
      };

      // Act & Assert
      await expect(ValidacionesService.existeReferenciaHash(header)).rejects.toThrow(
        new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral)
      );
    });

    it('✅ should validate with special characters in referencia and hash', async () => {
      // Arrange
      const header = {
        referenciaRes: 'ref-with-special-chars!@#$%',
        hash: 'hash-with-special-chars!@#$%'
      };

      // Act
      await ValidacionesService.existeReferenciaHash(header);

      // Assert
      // No exceptions should be thrown
    });

    it('✅ should validate with very long referencia and hash', async () => {
      // Arrange
      const longString = 'a'.repeat(1000);
      const header = {
        referenciaRes: longString,
        hash: longString
      };

      // Act
      await ValidacionesService.existeReferenciaHash(header);

      // Assert
      // No exceptions should be thrown
    });
  });

  describe('Integration scenarios', () => {
    it('🔄 should validate complete header successfully', async () => {
      // Arrange
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: '1234567890',
        referenciaRes: 'valid-reference',
        hash: 'valid-hash'
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');
      mockJwtDecode.mockReturnValue({
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890',
        iat: 1234567890,
        exp: 1234567890,
        iss: 'issuer',
        sub: 'subject',
        aud: 'audience'
      });
      mockAuthService.existClientId.mockResolvedValue(undefined);

      // Act
      await ValidacionesService.existeClientId(header);
      await ValidacionesService.validarIdentificacion(header);
      await ValidacionesService.existeReferenciaHash(header);

      // Assert
      expect(mockAuthService.existClientId).toHaveBeenCalledWith('valid-jwt-token');
      expect(mockJwtDecode).toHaveBeenCalledWith('valid-jwt-token');
      expect(consoleSpy.log).toHaveBeenCalledWith('Validación de identificación exitosa');
    });

    it('🔄 should handle validation failures in sequence', async () => {
      // Arrange
      const header = {
        clientId: '',
        identificacion: '1234567890',
        referenciaRes: 'valid-reference',
        hash: 'valid-hash'
      };

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(FraudeException);
      // Other validations should not be reached due to early failure
    });
  });

  describe('Edge cases and error handling', () => {
    it('🚫 should handle empty header object', async () => {
      // Arrange
      const header = {};

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(FraudeException);
    });

    it('🚫 should handle null header', async () => {
      // Arrange
      const header = null as any;

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(TypeError);
    });

    it('🚫 should handle undefined header', async () => {
      // Arrange
      const header = undefined as any;

      // Act & Assert
      await expect(ValidacionesService.existeClientId(header)).rejects.toThrow(TypeError);
    });

    it('📏 should handle very long clientId', async () => {
      // Arrange
      const longClientId = 'a'.repeat(10000);
      const header = {
        clientId: longClientId
      };
      mockUtil.unescapeString.mockReturnValue(longClientId);
      mockAuthService.existClientId.mockResolvedValue(undefined);

      // Act
      await ValidacionesService.existeClientId(header);

      // Assert
      expect(mockUtil.unescapeString).toHaveBeenCalledWith(longClientId);
      expect(mockAuthService.existClientId).toHaveBeenCalledWith(longClientId);
    });

    it('📏 should handle very long identificacion', async () => {
      // Arrange
      const longIdentificacion = '1'.repeat(1000);
      const header = {
        clientId: 'valid-jwt-token',
        identificacion: longIdentificacion
      };
      mockUtil.unescapeString.mockReturnValue('valid-jwt-token');
      mockJwtDecode.mockReturnValue({
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: longIdentificacion,
        iat: 1234567890,
        exp: 1234567890,
        iss: 'issuer',
        sub: 'subject',
        aud: 'audience'
      });

      // Act
      await ValidacionesService.validarIdentificacion(header);

      // Assert
      expect(consoleSpy.log).toHaveBeenCalledWith('Validación de identificación exitosa');
    });

    it('📏 should handle multiple concurrent validations', async () => {
      // Arrange
      const headers = [
        { clientId: 'client1', identificacion: '1234567890', referenciaRes: 'ref1', hash: 'hash1' },
        { clientId: 'client2', identificacion: '1234567890', referenciaRes: 'ref2', hash: 'hash2' },
        { clientId: 'client3', identificacion: '1234567890', referenciaRes: 'ref3', hash: 'hash3' }
      ];

      mockUtil.unescapeString.mockImplementation((str) => str);
      mockJwtDecode.mockReturnValue({
        sessionId: 'session123',
        token: 'token123',
        uriTech: 'uri123',
        identificacion: '1234567890',
        iat: 1234567890,
        exp: 1234567890,
        iss: 'issuer',
        sub: 'subject',
        aud: 'audience'
      });
      mockAuthService.existClientId.mockResolvedValue(undefined);

      // Act
      const promises = headers.map(async (header) => {
        await ValidacionesService.existeClientId(header);
        await ValidacionesService.validarIdentificacion(header);
        await ValidacionesService.existeReferenciaHash(header);
      });

      await Promise.all(promises);

      // Assert
      expect(mockAuthService.existClientId).toHaveBeenCalledTimes(3);
      expect(mockJwtDecode).toHaveBeenCalledTimes(3);
    });
  });
});
