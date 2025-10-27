import { Constants } from '../constant/Constants';
import { FraudeException } from '../errors/FraudeException';

// Interfaz para las estrategias de validación personalizada
interface IValidacionEstrategia {
  procesar(event: any, configuracion: any): Promise<void>;
}

// Clase base para validaciones personalizadas
abstract class BaseValidacionEstrategia implements IValidacionEstrategia {
  abstract procesar(event: any, configuracion: any): Promise<void>;
  
  protected lanzarError(codigoError: number, mensajeUsuario: string, mensajeInterno: string): void {
    throw new FraudeException(codigoError, mensajeInterno, mensajeUsuario);
  }
}

// Estrategia 1: Edición de TC necesita hash OTP
class EdicionTcNecesitaHashOtpStrategy extends BaseValidacionEstrategia {
  async procesar(event: any, configuracion: any): Promise<void> {
    console.log('🔒 Ejecutando procesamiento: edicionTcNecesitaHashOtp');
    
    // 1. VALIDAR: que exista hash cuando se edita tarjeta
    const headers = event.headers || {};
    
    if (!headers.hash) {
      console.error('🚨 FRAUDE DETECTADO: Edición de TC sin hash');
      this.lanzarError(
        Constants.CODIGO_ERROR_CEDULA_INCONSISTENTE as number,
        Constants.MSG_ERROR_USUARIO_GENERAL as string,
        'Edición de tarjeta de crédito requiere hash de OTP'
      );
    }
    
    // 2. MODIFICAR: activar borrarHash dinámicamente
    if (!configuracion) {
      console.log('ℹ️ No hay configuración para modificar');
    } else {
      configuracion.borrarHash = true;
      configuracion.hashOrigen = 'validarotpid';
      console.log('✅ Configuración modificada: borrarHash=true, hashOrigen=validarotpid');
    }
    
    console.log('✅ Procesamiento edicionTcNecesitaHashOtp completado');
  }
}

// Estrategia 2: Ejecutar transferencia con validación en DynamoDB
// NOTA: Esta estrategia está comentada porque requiere getItemCustom exportado
// Descomentar cuando se exporte desde dynamodb.ts
/*
class EjecutarTransferenciaValidacionStrategy extends BaseValidacionEstrategia {
  async procesar(event: any, configuracion: any): Promise<void> {
    console.log('🔒 Ejecutando procesamiento: ejecutarTransferenciaValidacion');
    
    // 1. VALIDAR desde DynamoDB
    // Ejemplo: const datosUsuario = await getItemCustom(...);
    // if (!datosUsuario) {
    //   this.lanzarError(..., 'Usuario no encontrado', ...);
    // }
    
    // 2. MODIFICAR configuración si es necesario
    // Ejemplo: configuracion.requiereAutorizacion = true;
    
    console.log('✅ Procesamiento ejecutarTransferenciaValidacion completado');
  }
}
*/

// Estrategia 3: Procesamiento por defecto
class DefaultValidacionStrategy extends BaseValidacionEstrategia {
  async procesar(event: any, configuracion: any): Promise<void> {
    console.log('🔒 Ejecutando procesamiento por defecto');
    // Aquí se puede implementar lógica por defecto
  }
}

// Mapa de estrategias
const estrategias: Record<string, new () => IValidacionEstrategia> = {
  'edicionTcNecesitaHashOtp': EdicionTcNecesitaHashOtpStrategy,
  // 'ejecutarTransferenciaValidacion': EjecutarTransferenciaValidacionStrategy, // Descomentar cuando esté implementada
  'default': DefaultValidacionStrategy
};

// Servicio ensamblador
export class AsegurarInputService {
  private estrategia: IValidacionEstrategia;
  
  constructor(logicaPersonalizada?: string) {
    const estrategiaClave = logicaPersonalizada || 'default';
    const EstrategiaClass = estrategias[estrategiaClave] || estrategias['default'];
    
    console.log(`🏗️ Ensamblando estrategia: ${estrategiaClave}`);
    this.estrategia = new EstrategiaClass();
  }
  
  async procesar(event: any, configuracion: any): Promise<void> {
    await this.estrategia.procesar(event, configuracion);
  }
  
  // Método para registrar nuevas estrategias dinámicamente
  static registrarEstrategia(nombre: string, estrategiaClass: new () => IValidacionEstrategia): void {
    estrategias[nombre] = estrategiaClass;
    console.log(`📝 Estrategia registrada: ${nombre}`);
  }
}


