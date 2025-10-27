import { 
  IiniciarSesion, 
  ICliente, 
  ISesionUnica, 
  IExtenderTiempoSesion 
} from '../../src/beans/usuariopy.interface';
import { IMensajeGenerico } from '../../src/beans/general.interface';

describe('UsuarioPy Interface Tests', () => {
  describe('IiniciarSesion', () => {
    it('should have correct structure extending IMensajeGenerico', () => {
      const iniciarSesion: IiniciarSesion = {
        mensajeUsuario: 'Sesión iniciada exitosamente',
        mensajeSistema: 'Session started successfully',
        codigoError: 0,
        sesionUnica: {
          sessionId: 'test-session-id',
          token: 'test-token',
          uriTech: 'test-uri-tech'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      expect(iniciarSesion.mensajeUsuario).toBe('Sesión iniciada exitosamente');
      expect(iniciarSesion.mensajeSistema).toBe('Session started successfully');
      expect(iniciarSesion.codigoError).toBe(0);
      expect(iniciarSesion.sesionUnica).toBeDefined();
      expect(iniciarSesion.cliente).toBeDefined();
    });

    it('should extend IMensajeGenerico properties', () => {
      const iniciarSesion: IiniciarSesion = {
        mensajeUsuario: 'Test message',
        mensajeSistema: 'Test system message',
        codigoError: 500,
        sesionUnica: {
          sessionId: 'session-123',
          token: 'token-123',
          uriTech: 'uri-123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'R',
            identificacion: '0987654321'
          }
        }
      };

      // Verify it has IMensajeGenerico properties
      expect(iniciarSesion).toHaveProperty('mensajeUsuario');
      expect(iniciarSesion).toHaveProperty('mensajeSistema');
      expect(iniciarSesion).toHaveProperty('codigoError');
      
      // Verify it has additional properties
      expect(iniciarSesion).toHaveProperty('sesionUnica');
      expect(iniciarSesion).toHaveProperty('cliente');
    });

    it('should handle special characters in messages', () => {
      const iniciarSesion: IiniciarSesion = {
        mensajeUsuario: 'Sesión con caracteres especiales: @#$%^&*()',
        mensajeSistema: 'System message with <script>alert("xss")</script>',
        codigoError: 400,
        sesionUnica: {
          sessionId: 'session@#$%',
          token: 'token@#$%',
          uriTech: 'uri@#$%'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C@#$%',
            identificacion: '1234567890@#$%'
          }
        }
      };

      expect(iniciarSesion.mensajeUsuario).toContain('@#$%^&*()');
      expect(iniciarSesion.mensajeSistema).toContain('<script>');
      expect(iniciarSesion.sesionUnica.sessionId).toContain('@#$%');
      expect(iniciarSesion.cliente.identificacion.identificacion).toContain('@#$%');
    });

    it('should handle unicode characters', () => {
      const iniciarSesion: IiniciarSesion = {
        mensajeUsuario: 'Sesión con ñ y é y 中文',
        mensajeSistema: 'System message with unicode: ñé中文',
        codigoError: 200,
        sesionUnica: {
          sessionId: 'sesión-ñé',
          token: 'token-ñé',
          uriTech: 'uri-ñé'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      expect(iniciarSesion.mensajeUsuario).toContain('ñ');
      expect(iniciarSesion.mensajeUsuario).toContain('é');
      expect(iniciarSesion.mensajeUsuario).toContain('中文');
      expect(iniciarSesion.sesionUnica.sessionId).toContain('ñ');
    });
  });

  describe('ICliente', () => {
    it('should have correct structure', () => {
      const cliente: ICliente = {
        identificacion: {
          tipoIdentificacion: 'C',
          identificacion: '1234567890'
        }
      };

      expect(cliente.identificacion.tipoIdentificacion).toBe('C');
      expect(cliente.identificacion.identificacion).toBe('1234567890');
    });

    it('should handle different identification types', () => {
      const testCases = [
        { tipoIdentificacion: 'C', identificacion: '1234567890' },
        { tipoIdentificacion: 'R', identificacion: '0987654321' },
        { tipoIdentificacion: 'P', identificacion: '1234567890123' },
        { tipoIdentificacion: 'E', identificacion: '123456789012345' }
      ];

      testCases.forEach(({ tipoIdentificacion, identificacion }) => {
        const cliente: ICliente = {
          identificacion: {
            tipoIdentificacion,
            identificacion
          }
        };

        expect(cliente.identificacion.tipoIdentificacion).toBe(tipoIdentificacion);
        expect(cliente.identificacion.identificacion).toBe(identificacion);
      });
    });

    it('should handle special characters in identification', () => {
      const cliente: ICliente = {
        identificacion: {
          tipoIdentificacion: 'C@#$%',
          identificacion: '1234567890@#$%'
        }
      };

      expect(cliente.identificacion.tipoIdentificacion).toContain('@#$%');
      expect(cliente.identificacion.identificacion).toContain('@#$%');
    });

    it('should handle empty identification', () => {
      const cliente: ICliente = {
        identificacion: {
          tipoIdentificacion: '',
          identificacion: ''
        }
      };

      expect(cliente.identificacion.tipoIdentificacion).toBe('');
      expect(cliente.identificacion.identificacion).toBe('');
    });
  });

  describe('ISesionUnica', () => {
    it('should have correct structure', () => {
      const sesionUnica: ISesionUnica = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };

      expect(sesionUnica.sessionId).toBe('test-session-id');
      expect(sesionUnica.token).toBe('test-token');
      expect(sesionUnica.uriTech).toBe('test-uri-tech');
    });

    it('should handle special characters', () => {
      const sesionUnica: ISesionUnica = {
        sessionId: 'session@#$%',
        token: 'token@#$%',
        uriTech: 'uri@#$%'
      };

      expect(sesionUnica.sessionId).toContain('@#$%');
      expect(sesionUnica.token).toContain('@#$%');
      expect(sesionUnica.uriTech).toContain('@#$%');
    });

    it('should handle unicode characters', () => {
      const sesionUnica: ISesionUnica = {
        sessionId: 'sesión-ñé',
        token: 'token-ñé',
        uriTech: 'uri-ñé'
      };

      expect(sesionUnica.sessionId).toContain('ñ');
      expect(sesionUnica.token).toContain('ñ');
      expect(sesionUnica.uriTech).toContain('ñ');
    });

    it('should handle empty values', () => {
      const sesionUnica: ISesionUnica = {
        sessionId: '',
        token: '',
        uriTech: ''
      };

      expect(sesionUnica.sessionId).toBe('');
      expect(sesionUnica.token).toBe('');
      expect(sesionUnica.uriTech).toBe('');
    });

    it('should handle very long values', () => {
      const longValue = 'a'.repeat(1000);
      const sesionUnica: ISesionUnica = {
        sessionId: longValue,
        token: longValue,
        uriTech: longValue
      };

      expect(sesionUnica.sessionId).toBe(longValue);
      expect(sesionUnica.token).toBe(longValue);
      expect(sesionUnica.uriTech).toBe(longValue);
    });
  });

  describe('IExtenderTiempoSesion', () => {
    it('should have correct structure', () => {
      const extenderTiempo: IExtenderTiempoSesion = {
        sessionId: 'test-session-id'
      };

      expect(extenderTiempo.sessionId).toBe('test-session-id');
    });

    it('should handle special characters', () => {
      const extenderTiempo: IExtenderTiempoSesion = {
        sessionId: 'session@#$%'
      };

      expect(extenderTiempo.sessionId).toContain('@#$%');
    });

    it('should handle unicode characters', () => {
      const extenderTiempo: IExtenderTiempoSesion = {
        sessionId: 'sesión-ñé'
      };

      expect(extenderTiempo.sessionId).toContain('ñ');
    });

    it('should handle empty sessionId', () => {
      const extenderTiempo: IExtenderTiempoSesion = {
        sessionId: ''
      };

      expect(extenderTiempo.sessionId).toBe('');
    });

    it('should handle very long sessionId', () => {
      const longSessionId = 'a'.repeat(1000);
      const extenderTiempo: IExtenderTiempoSesion = {
        sessionId: longSessionId
      };

      expect(extenderTiempo.sessionId).toBe(longSessionId);
    });
  });

  describe('Interface Compatibility', () => {
    it('should allow assignment between compatible interfaces', () => {
      const sesionUnica: ISesionUnica = {
        sessionId: 'test-session-id',
        token: 'test-token',
        uriTech: 'test-uri-tech'
      };

      const cliente: ICliente = {
        identificacion: {
          tipoIdentificacion: 'C',
          identificacion: '1234567890'
        }
      };

      const iniciarSesion: IiniciarSesion = {
        mensajeUsuario: 'Test message',
        mensajeSistema: 'Test system message',
        codigoError: 0,
        sesionUnica,
        cliente
      };

      expect(iniciarSesion.sesionUnica).toBe(sesionUnica);
      expect(iniciarSesion.cliente).toBe(cliente);
    });

    it('should handle nested object structures', () => {
      const iniciarSesion: IiniciarSesion = {
        mensajeUsuario: 'Sesión iniciada',
        mensajeSistema: 'Session started',
        codigoError: 0,
        sesionUnica: {
          sessionId: 'session-123',
          token: 'token-123',
          uriTech: 'uri-123'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      // Test nested object access
      expect(iniciarSesion.sesionUnica.sessionId).toBe('session-123');
      expect(iniciarSesion.cliente.identificacion.identificacion).toBe('1234567890');
    });

    it('should maintain type safety', () => {
      const iniciarSesion: IiniciarSesion = {
        mensajeUsuario: 'Test',
        mensajeSistema: 'Test',
        codigoError: 0,
        sesionUnica: {
          sessionId: 'test',
          token: 'test',
          uriTech: 'test'
        },
        cliente: {
          identificacion: {
            tipoIdentificacion: 'C',
            identificacion: '1234567890'
          }
        }
      };

      // All properties should be accessible
      expect(typeof iniciarSesion.mensajeUsuario).toBe('string');
      expect(typeof iniciarSesion.mensajeSistema).toBe('string');
      expect(typeof iniciarSesion.codigoError).toBe('number');
      expect(typeof iniciarSesion.sesionUnica).toBe('object');
      expect(typeof iniciarSesion.cliente).toBe('object');
    });
  });
});
