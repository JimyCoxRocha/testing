import { 
  IMensajeGenerico, 
  IHeader, 
  IResponseAuth, 
  ISesionUnicaUsuario, 
  IUsuarioSesion, 
  IUsuarioSesionDb, 
  IJwtPayload, 
  IHashUsuarioDb, 
  ITransferenciaInput, 
  IDigitalDb, 
  IValidacionRequest 
} from '../../src/beans/general.interface';

describe('General Interface Tests', () => {
  describe('IMensajeGenerico', () => {
    it('should have correct structure', () => {
      const mensaje: IMensajeGenerico = {
        mensajeUsuario: 'Mensaje para el usuario',
        mensajeSistema: 'Mensaje del sistema',
        codigoError: 0
      };

      expect(mensaje.mensajeUsuario).toBe('Mensaje para el usuario');
      expect(mensaje.mensajeSistema).toBe('Mensaje del sistema');
      expect(mensaje.codigoError).toBe(0);
    });

    it('should handle different error codes', () => {
      const testCases = [0, 403, 500, 9999];
      
      testCases.forEach(codigoError => {
        const mensaje: IMensajeGenerico = {
          mensajeUsuario: 'Test message',
          mensajeSistema: 'System message',
          codigoError
        };
        
        expect(mensaje.codigoError).toBe(codigoError);
      });
    });

    it('should handle special characters in messages', () => {
      const mensaje: IMensajeGenerico = {
        mensajeUsuario: 'Mensaje con caracteres especiales: @#$%^&*()',
        mensajeSistema: 'System message with <script>alert("xss")</script>',
        codigoError: 500
      };

      expect(mensaje.mensajeUsuario).toContain('@#$%^&*()');
      expect(mensaje.mensajeSistema).toContain('<script>');
    });

    it('should handle unicode characters', () => {
      const mensaje: IMensajeGenerico = {
        mensajeUsuario: 'Mensaje con ñ y é y 中文',
        mensajeSistema: 'System message with unicode: ñé中文',
        codigoError: 400
      };

      expect(mensaje.mensajeUsuario).toContain('ñ');
      expect(mensaje.mensajeUsuario).toContain('é');
      expect(mensaje.mensajeUsuario).toContain('中文');
    });
  });

  describe('IHeader', () => {
    it('should have correct structure with all optional fields', () => {
      const header: IHeader = {
        secuencial: '12345678',
        codigoMis: '123',
        pais: 'EC',
        tipoLogin: 'C',
        nombreEquipo: 'test-equipo',
        serial: '9876543210',
        numero: '1234567890',
        imei: '111111111111111',
        marca: 'Samsung',
        modelo: 'Galaxy',
        ip: '192.168.1.1',
        usuario: 'testuser',
        identificacion: '1234567890'
      };

      expect(header.secuencial).toBe('12345678');
      expect(header.codigoMis).toBe('123');
      expect(header.pais).toBe('EC');
      expect(header.tipoLogin).toBe('C');
      expect(header.nombreEquipo).toBe('test-equipo');
      expect(header.serial).toBe('9876543210');
      expect(header.numero).toBe('1234567890');
      expect(header.imei).toBe('111111111111111');
      expect(header.marca).toBe('Samsung');
      expect(header.modelo).toBe('Galaxy');
      expect(header.ip).toBe('192.168.1.1');
      expect(header.usuario).toBe('testuser');
      expect(header.identificacion).toBe('1234567890');
    });

    it('should work with minimal fields', () => {
      const header: IHeader = {};

      expect(header.secuencial).toBeUndefined();
      expect(header.codigoMis).toBeUndefined();
      expect(header.pais).toBeUndefined();
    });

    it('should handle special characters in string fields', () => {
      const header: IHeader = {
        secuencial: '123@#$%',
        codigoMis: 'mis@#$%',
        pais: 'EC@#$%',
        tipoLogin: 'C@#$%',
        nombreEquipo: 'equipo@#$%',
        serial: 'serial@#$%',
        numero: 'numero@#$%',
        imei: 'imei@#$%',
        marca: 'marca@#$%',
        modelo: 'modelo@#$%',
        ip: '192.168.1.1@#$%',
        usuario: 'usuario@#$%',
        identificacion: 'identificacion@#$%'
      };

      Object.values(header).forEach(value => {
        if (typeof value === 'string') {
          expect(value).toContain('@#$%');
        }
      });
    });
  });

  describe('IResponseAuth', () => {
    it('should have correct structure', () => {
      const response: IResponseAuth = {
        body: '{"success": true}',
        headers: {
          clientId: 'test-client-id',
          hash: 'test-hash'
        }
      };

      expect(response.body).toBe('{"success": true}');
      expect(response.headers?.clientId).toBe('test-client-id');
      expect(response.headers?.hash).toBe('test-hash');
    });

    it('should work without headers', () => {
      const response: IResponseAuth = {
        body: '{"success": true}'
      };

      expect(response.body).toBe('{"success": true}');
      expect(response.headers).toBeUndefined();
    });

    it('should handle special characters in body', () => {
      const response: IResponseAuth = {
        body: '{"message": "Special chars: @#$%^&*()"}',
        headers: {
          clientId: 'client@#$%',
          hash: 'hash@#$%'
        }
      };

      expect(response.body).toContain('@#$%^&*()');
      expect(response.headers?.clientId).toContain('@#$%');
      expect(response.headers?.hash).toContain('@#$%');
    });
  });

  describe('ISesionUnicaUsuario', () => {
    it('should have correct structure', () => {
      const sesion: ISesionUnicaUsuario = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890'
      };

      expect(sesion.sessionId).toBe('test-session-id');
      expect(sesion.token).toBe('test-token');
      expect(sesion.uriTech).toBe('test-uri-tech');
      expect(sesion.identificacion).toBe('1234567890');
    });

    it('should handle special characters', () => {
      const sesion: ISesionUnicaUsuario = {
        sessionId: 'session@#$%',
        token: 'token@#$%',
        uriTech: 'uri@#$%',
        identificacion: 'ident@#$%'
      };

      expect(sesion.sessionId).toContain('@#$%');
      expect(sesion.token).toContain('@#$%');
      expect(sesion.uriTech).toContain('@#$%');
      expect(sesion.identificacion).toContain('@#$%');
    });
  });

  describe('IUsuarioSesion', () => {
    it('should have correct structure', () => {
      const usuario: IUsuarioSesion = {
        id: 'test-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };

      expect(usuario.id).toBe('test-id');
      expect(usuario.sessionId).toBe('test-session-id');
      expect(usuario.token).toBe('test-token');
      expect(usuario.uriTech).toBe('test-uri-tech');
    });
  });

  describe('IUsuarioSesionDb', () => {
    it('should have correct structure', () => {
      const usuarioDb: IUsuarioSesionDb = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        id: 'test-id',
        expires_date: '2023-12-31 23:59:59',
        sesionValida: true
      };

      expect(usuarioDb.sessionId).toBe('test-session-id');
      expect(usuarioDb.token).toBe('test-token');
      expect(usuarioDb.uriTech).toBe('test-uri-tech');
      expect(usuarioDb.id).toBe('test-id');
      expect(usuarioDb.expires_date).toBe('2023-12-31 23:59:59');
      expect(usuarioDb.sesionValida).toBe(true);
    });

    it('should handle boolean values for sesionValida', () => {
      const testCases = [true, false];
      
      testCases.forEach(sesionValida => {
        const usuarioDb: IUsuarioSesionDb = {
          sessionId: 'test-session-id',
          token: 'test-token',
          uriTech: 'test-uri-tech',
          id: 'test-id',
          expires_date: '2023-12-31 23:59:59',
          sesionValida
        };
        
        expect(usuarioDb.sesionValida).toBe(sesionValida);
      });
    });
  });

  describe('IJwtPayload', () => {
    it('should extend JwtPayload and have correct structure', () => {
      const jwtPayload: IJwtPayload = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech',
        identificacion: '1234567890',
        iss: 'issuer',
        sub: 'subject',
        aud: 'audience',
        exp: 1234567890,
        nbf: 1234567890,
        iat: 1234567890,
        jti: 'jwt-id'
      };

      expect(jwtPayload.sessionId).toBe('test-session-id');
      expect(jwtPayload.token).toBe('test-token');
      expect(jwtPayload.uriTech).toBe('test-uri-tech');
      expect(jwtPayload.identificacion).toBe('1234567890');
      expect(jwtPayload.iss).toBe('issuer');
      expect(jwtPayload.sub).toBe('subject');
      expect(jwtPayload.aud).toBe('audience');
      expect(jwtPayload.exp).toBe(1234567890);
      expect(jwtPayload.nbf).toBe(1234567890);
      expect(jwtPayload.iat).toBe(1234567890);
      expect(jwtPayload.jti).toBe('jwt-id');
    });
  });

  describe('IHashUsuarioDb', () => {
    it('should have correct structure', () => {
      const hashDb: IHashUsuarioDb = {
        id: 'test-id',
        hash: 'test-hash',
        expires_date: '2023-12-31 23:59:59',
        referenciaRes: 'test-referencia',
        sesionValida: true
      };

      expect(hashDb.id).toBe('test-id');
      expect(hashDb.hash).toBe('test-hash');
      expect(hashDb.expires_date).toBe('2023-12-31 23:59:59');
      expect(hashDb.referenciaRes).toBe('test-referencia');
      expect(hashDb.sesionValida).toBe(true);
    });

    it('should handle optional sesionValida field', () => {
      const hashDb: IHashUsuarioDb = {
        id: 'test-id',
        hash: 'test-hash',
        expires_date: '2023-12-31 23:59:59',
        referenciaRes: 'test-referencia'
      };

      expect(hashDb.sesionValida).toBeUndefined();
    });
  });

  describe('ITransferenciaInput', () => {
    it('should have correct structure', () => {
      const transferencia: ITransferenciaInput = {
        montoDestino: '100.50',
        nombreBancoDestino: 'Banco Test',
        tipo: 'TRANSFERENCIA',
        identificacionBeneficiario: {
          identificacion: '1234567890'
        },
        identificacionCliente: {
          identificacion: '0987654321'
        },
        uriTechCodigoUsuario: 'test-uri-tech'
      };

      expect(transferencia.montoDestino).toBe('100.50');
      expect(transferencia.nombreBancoDestino).toBe('Banco Test');
      expect(transferencia.tipo).toBe('TRANSFERENCIA');
      expect(transferencia.identificacionBeneficiario.identificacion).toBe('1234567890');
      expect(transferencia.identificacionCliente.identificacion).toBe('0987654321');
      expect(transferencia.uriTechCodigoUsuario).toBe('test-uri-tech');
    });

    it('should handle special characters in string fields', () => {
      const transferencia: ITransferenciaInput = {
        montoDestino: '100.50@#$%',
        nombreBancoDestino: 'Banco@#$%',
        tipo: 'TRANSFERENCIA@#$%',
        identificacionBeneficiario: {
          identificacion: '1234567890@#$%'
        },
        identificacionCliente: {
          identificacion: '0987654321@#$%'
        },
        uriTechCodigoUsuario: 'test-uri-tech@#$%'
      };

      expect(transferencia.montoDestino).toContain('@#$%');
      expect(transferencia.nombreBancoDestino).toContain('@#$%');
      expect(transferencia.tipo).toContain('@#$%');
      expect(transferencia.identificacionBeneficiario.identificacion).toContain('@#$%');
      expect(transferencia.identificacionCliente.identificacion).toContain('@#$%');
      expect(transferencia.uriTechCodigoUsuario).toContain('@#$%');
    });
  });

  describe('IDigitalDb', () => {
    it('should have correct structure', () => {
      const digitalDb: IDigitalDb = {
        hash: 'test-hash',
        existe: true,
        fechaExpiracion: '2023-12-31 23:59:59'
      };

      expect(digitalDb.hash).toBe('test-hash');
      expect(digitalDb.existe).toBe(true);
      expect(digitalDb.fechaExpiracion).toBe('2023-12-31 23:59:59');
    });

    it('should handle optional hash field', () => {
      const digitalDb: IDigitalDb = {
        existe: false,
        fechaExpiracion: '2023-12-31 23:59:59'
      };

      expect(digitalDb.hash).toBeUndefined();
      expect(digitalDb.existe).toBe(false);
    });

    it('should handle boolean values for existe', () => {
      const testCases = [true, false];
      
      testCases.forEach(existe => {
        const digitalDb: IDigitalDb = {
          hash: 'test-hash',
          existe,
          fechaExpiracion: '2023-12-31 23:59:59'
        };
        
        expect(digitalDb.existe).toBe(existe);
      });
    });
  });

  describe('IValidacionRequest', () => {
    it('should have correct structure', () => {
      const validacion: IValidacionRequest = {
        puedeContinuar: true,
        bodyResponse: {
          mensajeUsuario: 'Validación exitosa',
          mensajeSistema: 'Validation successful',
          codigoError: 0
        }
      };

      expect(validacion.puedeContinuar).toBe(true);
      expect(validacion.bodyResponse?.mensajeUsuario).toBe('Validación exitosa');
      expect(validacion.bodyResponse?.mensajeSistema).toBe('Validation successful');
      expect(validacion.bodyResponse?.codigoError).toBe(0);
    });

    it('should work without bodyResponse', () => {
      const validacion: IValidacionRequest = {
        puedeContinuar: false
      };

      expect(validacion.puedeContinuar).toBe(false);
      expect(validacion.bodyResponse).toBeUndefined();
    });

    it('should handle boolean values for puedeContinuar', () => {
      const testCases = [true, false];
      
      testCases.forEach(puedeContinuar => {
        const validacion: IValidacionRequest = {
          puedeContinuar
        };
        
        expect(validacion.puedeContinuar).toBe(puedeContinuar);
      });
    });
  });

  describe('Interface Compatibility', () => {
    it('should allow assignment between compatible interfaces', () => {
      const usuarioSesion: IUsuarioSesion = {
        id: 'test-id',
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };

      const usuarioSesionDb: IUsuarioSesionDb = {
        ...usuarioSesion,
        expires_date: '2023-12-31 23:59:59',
        sesionValida: true
      };

      expect(usuarioSesionDb.id).toBe(usuarioSesion.id);
      expect(usuarioSesionDb.sessionId).toBe(usuarioSesion.sessionId);
      expect(usuarioSesionDb.token).toBe(usuarioSesion.token);
      expect(usuarioSesionDb.uriTech).toBe(usuarioSesion.uriTech);
    });

    it('should handle nested object structures', () => {
      const transferencia: ITransferenciaInput = {
        montoDestino: '100.50',
        nombreBancoDestino: 'Banco Test',
        tipo: 'TRANSFERENCIA',
        identificacionBeneficiario: {
          identificacion: '1234567890'
        },
        identificacionCliente: {
          identificacion: '0987654321'
        },
        uriTechCodigoUsuario: 'test-uri-tech'
      };

      // Test nested object access
      expect(transferencia.identificacionBeneficiario.identificacion).toBe('1234567890');
      expect(transferencia.identificacionCliente.identificacion).toBe('0987654321');
    });
  });
});
