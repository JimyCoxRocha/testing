import { FraudeException } from '../errors/FraudeException';
import { Constants } from '../constant/Constants';
import { AsegurarInputService } from '../services/AsegurarInputService';
import { MapeoService } from '../services/MapeoService';

export const fnAsegurarMensajeEntrada = async (event: any) => {
  try {
    console.log('=== LAMBDA fnAsegurarMensajeEntrada - INICIO ===');
    console.log('Event recibido:', JSON.stringify(event));
    
    // Obtener configuración de validación
    const configuracion = event.configuracion || event.detalleFlujoResult?.body?.data?.configuracion || {};
    const validarInput = configuracion.validarInput || {};
    
    // Si la validación está deshabilitada, retornar evento sin validar
    if (!validarInput.validar) {
      console.log('ℹ️ Validación de entrada deshabilitada en configuración, retornando evento sin validar');
      return event;
    }
    
    // Validar integridad de datos de entrada
    await validarIntegridadEntrada(event, validarInput);
    
    // Ejecutar lógica personalizada si está configurada
    if (validarInput.logicaPersonalizada) {
      const servicio = new AsegurarInputService(validarInput.logicaPersonalizada);
      
      // Procesar: valida Y modifica configuración según la estrategia
      await servicio.procesar(event, configuracion);
    }
    
    // Retornar el evento COMPLETO (con configuraciones modificadas si aplica) para que continúe el flujo
    // Esto es crucial para que los siguientes steps tengan acceso a todos los datos
    console.log('=== VALIDACIÓN Y AUDITORÍA COMPLETADAS - CONTINUANDO FLUJO ===');
    console.log('📤 Retornando evento completo para siguientes steps');
    return event;
    
  } catch (error: any) {
    console.error('Error en fnAsegurarMensajeEntrada:', error);
    
    // Mapear error y lanzarlo como objeto serializable para Step Function
    const errorMapeado = MapeoService.buildValidacionEntradaError(error);
    const errorSerializado = JSON.stringify(errorMapeado);
    
    // Lanzar excepción con el error mapeado como mensaje
    throw new Error(errorSerializado);
  }
};

// Función para validar integridad de datos de entrada
async function validarIntegridadEntrada(event: any, validarInput: any): Promise<void> {
  console.log('🔒 Validando integridad de datos de entrada...');
  
  const headers = event.headers || {};
  const body = event.body;
  
  // Si no existe ruta de cédula configurada, no validar
  if (!validarInput.asegurarCedula) {
    console.log('ℹ️ No hay ruta de cédula configurada en asegurarCedula, saltando validación');
    return;
  }
  
  // Obtener la ruta parametrizada de la cédula
  const rutaCedula = validarInput.asegurarCedula;
  console.log(`📋 Ruta de cédula configurada: ${rutaCedula}`);
  
  // Obtener cédula del header
  const cedulaEnHeader = headers.identificacion;
  if (!cedulaEnHeader) {
    console.log('⚠️ No hay cédula en header, saltando validación de consistencia');
    return;
  }
  
  // Obtener cédula del body usando la ruta parametrizada
  const cedulaEnBody = getNestedValue(body, rutaCedula);
  
  if (cedulaEnBody && cedulaEnHeader !== cedulaEnBody) {
    console.error('🚨 FRAUDE DETECTADO: Inconsistencia entre header y body');
    console.error(`Cédula en header: ${cedulaEnHeader}`);
    console.error(`Cédula en body (ruta: ${rutaCedula}): ${cedulaEnBody}`);
    console.error(`Diferencia detectada en identificación`);
    
    throw new FraudeException(
      Constants.CODIGO_ERROR_CEDULA_INCONSISTENTE as number,
      'Inconsistencia detectada en datos de entrada',
      Constants.MSG_ERROR_USUARIO_GENERAL as string
    );
  }
  
  console.log('✅ Integridad de datos validada correctamente');
}

// Función helper para acceder a propiedades anidadas dinámicamente
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current[key] === undefined || current[key] === null) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}
