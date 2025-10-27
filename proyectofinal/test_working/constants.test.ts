import { Constants } from '../src/constant/Constants';
import { DiccionarioMensajes } from '../src/constant/response-dictionary';

describe('Constants Tests', () => {
  describe('Constants Enum', () => {
    it('should have all required error codes', () => {
      expect(Constants.CODIGO_ERROR_OK).toBe(0);
      expect(Constants.CODIGO_ERROR_GENERAL).toBe(9999);
      expect(Constants.CODIGO_ERROR_VALIDACION).toBe(403);
      expect(Constants.CODIGO_ERROR_EXPIRACION_CLAVE).toBe(1040);
    });

    it('should have all required error messages', () => {
      expect(Constants.MSG_ERROR_USUARIO_GENERAL).toBe('Lo sentimos, por favor inténtalo mas tarde');
      expect(Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE).toBe('Información incompleta o inconsistente');
      expect(Constants.MSG_INFORMACION_INCONSISTENTE).toBe('Información inconsistente');
      expect(Constants.MSG_ERROR_GENERAL).toBe('Lo sentimos, por favor inténtalo mas tarde');
    });

    it('should have all required default values', () => {
      expect(Constants.PAIS).toBe('EC');
      expect(Constants.CODIGOMIS).toBe('0');
      expect(Constants.NOMBREEQUIPO).toBe('alias');
      expect(Constants.NUMERO).toBe('0900000000');
      expect(Constants.IMEI).toBe('000000000000000');
      expect(Constants.MARCA).toBe('Telefono');
      expect(Constants.MODELO).toBe('00000');
      expect(Constants.SERIAL).toBe('1234567890');
      expect(Constants.IDENTIFICACION).toBe('0999999999');
      expect(Constants.TIPOLOGIN).toBe('C');
    });

    it('should have correct data types', () => {
      expect(typeof Constants.CODIGO_ERROR_OK).toBe('number');
      expect(typeof Constants.CODIGO_ERROR_GENERAL).toBe('number');
      expect(typeof Constants.CODIGO_ERROR_VALIDACION).toBe('number');
      expect(typeof Constants.CODIGO_ERROR_EXPIRACION_CLAVE).toBe('number');
      
      expect(typeof Constants.MSG_ERROR_USUARIO_GENERAL).toBe('string');
      expect(typeof Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE).toBe('string');
      expect(typeof Constants.MSG_INFORMACION_INCONSISTENTE).toBe('string');
      expect(typeof Constants.MSG_ERROR_GENERAL).toBe('string');
      
      expect(typeof Constants.PAIS).toBe('string');
      expect(typeof Constants.CODIGOMIS).toBe('string');
      expect(typeof Constants.NOMBREEQUIPO).toBe('string');
      expect(typeof Constants.NUMERO).toBe('string');
      expect(typeof Constants.IMEI).toBe('string');
      expect(typeof Constants.MARCA).toBe('string');
      expect(typeof Constants.MODELO).toBe('string');
      expect(typeof Constants.SERIAL).toBe('string');
      expect(typeof Constants.IDENTIFICACION).toBe('string');
      expect(typeof Constants.TIPOLOGIN).toBe('string');
    });

    it('should have non-empty string values', () => {
      expect((Constants.MSG_ERROR_USUARIO_GENERAL as string).length).toBeGreaterThan(0);
      expect((Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE as string).length).toBeGreaterThan(0);
      expect((Constants.MSG_INFORMACION_INCONSISTENTE as string).length).toBeGreaterThan(0);
      expect((Constants.MSG_ERROR_GENERAL as string).length).toBeGreaterThan(0);
      
      expect((Constants.PAIS as string).length).toBeGreaterThan(0);
      expect((Constants.CODIGOMIS as string).length).toBeGreaterThan(0);
      expect((Constants.NOMBREEQUIPO as string).length).toBeGreaterThan(0);
      expect((Constants.NUMERO as string).length).toBeGreaterThan(0);
      expect((Constants.IMEI as string).length).toBeGreaterThan(0);
      expect((Constants.MARCA as string).length).toBeGreaterThan(0);
      expect((Constants.MODELO as string).length).toBeGreaterThan(0);
      expect((Constants.SERIAL as string).length).toBeGreaterThan(0);
      expect((Constants.IDENTIFICACION as string).length).toBeGreaterThan(0);
      expect((Constants.TIPOLOGIN as string).length).toBeGreaterThan(0);
    });

    it('should have valid numeric values', () => {
      expect(Constants.CODIGO_ERROR_OK).toBeGreaterThanOrEqual(0);
      expect(Constants.CODIGO_ERROR_GENERAL).toBeGreaterThan(0);
      expect(Constants.CODIGO_ERROR_VALIDACION).toBeGreaterThan(0);
      expect(Constants.CODIGO_ERROR_EXPIRACION_CLAVE).toBeGreaterThan(0);
    });

    it('should have consistent error message formats', () => {
      // All error messages should be user-friendly Spanish messages
      const errorMessages = [
        Constants.MSG_ERROR_USUARIO_GENERAL,
        Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE,
        Constants.MSG_INFORMACION_INCONSISTENTE,
        Constants.MSG_ERROR_GENERAL
      ];
      
      errorMessages.forEach(message => {
        expect(message).toMatch(/^[A-Za-záéíóúñüÁÉÍÓÚÑÜ\s,\.]+$/);
        expect((message as string).length).toBeGreaterThan(10); // Should be meaningful messages
      });
    });

    it('should have valid default identification format', () => {
      // Ecuadorian identification should be 10 digits
      expect(Constants.IDENTIFICACION).toMatch(/^\d{10}$/);
    });

    it('should have valid phone number format', () => {
      // Ecuadorian phone number format
      expect(Constants.NUMERO).toMatch(/^0\d{9}$/);
    });

    it('should have valid IMEI format', () => {
      // IMEI should be 15 digits
      expect(Constants.IMEI).toMatch(/^\d{15}$/);
    });

    it('should have valid country code', () => {
      // Ecuador country code
      expect(Constants.PAIS).toBe('EC');
    });

    it('should have valid login type', () => {
      // Login type should be a single character
      expect(Constants.TIPOLOGIN).toMatch(/^[A-Z]$/);
    });
  });

  describe('Constants Usage Patterns', () => {
    it('should be usable in error handling scenarios', () => {
      const errorCode = Constants.CODIGO_ERROR_VALIDACION;
      const errorMessage = Constants.MSG_ERROR_USUARIO_GENERAL;
      
      expect(errorCode).toBe(403);
      expect(errorMessage).toBe('Lo sentimos, por favor inténtalo mas tarde');
    });

    it('should be usable in default header scenarios', () => {
      const defaultHeaders = {
        pais: Constants.PAIS,
        codigoMis: Constants.CODIGOMIS,
        tipoLogin: Constants.TIPOLOGIN,
        identificacion: Constants.IDENTIFICACION
      };
      
      expect(defaultHeaders.pais).toBe('EC');
      expect(defaultHeaders.codigoMis).toBe('0');
      expect(defaultHeaders.tipoLogin).toBe('C');
      expect(defaultHeaders.identificacion).toBe('0999999999');
    });

    it('should be usable in device information scenarios', () => {
      const deviceInfo = {
        marca: Constants.MARCA,
        modelo: Constants.MODELO,
        serial: Constants.SERIAL,
        imei: Constants.IMEI,
        numero: Constants.NUMERO
      };
      
      expect(deviceInfo.marca).toBe('Telefono');
      expect(deviceInfo.modelo).toBe('00000');
      expect(deviceInfo.serial).toBe('1234567890');
      expect(deviceInfo.imei).toBe('000000000000000');
      expect(deviceInfo.numero).toBe('0900000000');
    });
  });
});

describe('DiccionarioMensajes Tests', () => {
  describe('DiccionarioMensajes Object', () => {
    it('should have all required properties', () => {
      expect(DiccionarioMensajes.mensajeGenerico).toBeDefined();
      expect(DiccionarioMensajes.mensajeGenericoFraude).toBeDefined();
      expect(DiccionarioMensajes.codigoError).toBeDefined();
      expect(DiccionarioMensajes.codigoErrorFraude).toBeDefined();
      expect(DiccionarioMensajes.msgExitosoUsuarioGeneral).toBeDefined();
      expect(DiccionarioMensajes.msgErrorUsuarioGeneral).toBeDefined();
      expect(DiccionarioMensajes.formatoFechaHora).toBeDefined();
    });

    it('should have correct values', () => {
      expect(DiccionarioMensajes.mensajeGenerico).toBe('No hemos podido validar su información');
      expect(DiccionarioMensajes.mensajeGenericoFraude).toBe('No hemos podido validar su información');
      expect(DiccionarioMensajes.codigoError).toBe(0);
      expect(DiccionarioMensajes.codigoErrorFraude).toBe(403);
      expect(DiccionarioMensajes.msgExitosoUsuarioGeneral).toBe('TRANSACCION EXITOSA');
      expect(DiccionarioMensajes.msgErrorUsuarioGeneral).toBe('Lo sentimos, por favor inténtalo mas tarde');
      expect(DiccionarioMensajes.formatoFechaHora).toBe('YYYY-MM-DD HH:mm:ss');
    });

    it('should have correct data types', () => {
      expect(typeof DiccionarioMensajes.mensajeGenerico).toBe('string');
      expect(typeof DiccionarioMensajes.mensajeGenericoFraude).toBe('string');
      expect(typeof DiccionarioMensajes.codigoError).toBe('number');
      expect(typeof DiccionarioMensajes.codigoErrorFraude).toBe('number');
      expect(typeof DiccionarioMensajes.msgExitosoUsuarioGeneral).toBe('string');
      expect(typeof DiccionarioMensajes.msgErrorUsuarioGeneral).toBe('string');
      expect(typeof DiccionarioMensajes.formatoFechaHora).toBe('string');
    });

    it('should have non-empty string values', () => {
      expect(DiccionarioMensajes.mensajeGenerico.length).toBeGreaterThan(0);
      expect(DiccionarioMensajes.mensajeGenericoFraude.length).toBeGreaterThan(0);
      expect(DiccionarioMensajes.msgExitosoUsuarioGeneral.length).toBeGreaterThan(0);
      expect(DiccionarioMensajes.msgErrorUsuarioGeneral.length).toBeGreaterThan(0);
      expect(DiccionarioMensajes.formatoFechaHora.length).toBeGreaterThan(0);
    });

    it('should have valid numeric values', () => {
      expect(DiccionarioMensajes.codigoError).toBeGreaterThanOrEqual(0);
      expect(DiccionarioMensajes.codigoErrorFraude).toBeGreaterThan(0);
    });

    it('should have valid date format', () => {
      // Moment.js format validation
      expect(DiccionarioMensajes.formatoFechaHora).toMatch(/^[YMDHms\s:-]+$/);
    });

    it('should have consistent message formats', () => {
      const messages = [
        DiccionarioMensajes.mensajeGenerico,
        DiccionarioMensajes.mensajeGenericoFraude,
        DiccionarioMensajes.msgExitosoUsuarioGeneral,
        DiccionarioMensajes.msgErrorUsuarioGeneral
      ];
      
      messages.forEach(message => {
        expect(message).toMatch(/^[A-Za-záéíóúñüÁÉÍÓÚÑÜ\s,\.]+$/);
        expect(message.length).toBeGreaterThan(5);
      });
    });
  });

  describe('DiccionarioMensajes Usage Patterns', () => {
    it('should be usable in error response scenarios', () => {
      const errorResponse = {
        codigoError: DiccionarioMensajes.codigoErrorFraude,
        mensajeUsuario: DiccionarioMensajes.msgErrorUsuarioGeneral,
        mensajeSistema: DiccionarioMensajes.mensajeGenericoFraude
      };
      
      expect(errorResponse.codigoError).toBe(403);
      expect(errorResponse.mensajeUsuario).toBe('Lo sentimos, por favor inténtalo mas tarde');
      expect(errorResponse.mensajeSistema).toBe('No hemos podido validar su información');
    });

    it('should be usable in success response scenarios', () => {
      const successResponse = {
        codigoError: DiccionarioMensajes.codigoError,
        mensajeUsuario: DiccionarioMensajes.msgExitosoUsuarioGeneral
      };
      
      expect(successResponse.codigoError).toBe(0);
      expect(successResponse.mensajeUsuario).toBe('TRANSACCION EXITOSA');
    });

    it('should be usable in date formatting scenarios', () => {
      const dateFormat = DiccionarioMensajes.formatoFechaHora;
      
      expect(dateFormat).toBe('YYYY-MM-DD HH:mm:ss');
      // This format should be compatible with moment.js
      expect(dateFormat).toContain('YYYY');
      expect(dateFormat).toContain('MM');
      expect(dateFormat).toContain('DD');
      expect(dateFormat).toContain('HH');
      expect(dateFormat).toContain('mm');
      expect(dateFormat).toContain('ss');
    });
  });

  describe('Constants and DiccionarioMensajes Consistency', () => {
    it('should have consistent error messages', () => {
      expect(Constants.MSG_ERROR_USUARIO_GENERAL).toBe(DiccionarioMensajes.msgErrorUsuarioGeneral);
    });

    it('should have consistent error codes', () => {
      expect(Constants.CODIGO_ERROR_VALIDACION).toBe(DiccionarioMensajes.codigoErrorFraude);
    });

    it('should have consistent success codes', () => {
      expect(Constants.CODIGO_ERROR_OK).toBe(DiccionarioMensajes.codigoError);
    });
  });
});
