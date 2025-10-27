import { fnInterPredecesorEncadenamiento, fnInterPredecesorEncadenamientoNuevo } from './fnInterEncadenamiento';
import { MapeoService } from '../services/MapeoService';

export const fnPredecesor = async (event: any) => {
  try {
    console.log('=== LAMBDA fnPredecesor - INICIO ===');
    console.log('Event recibido:', JSON.stringify(event));
    
    // Verificar si es invocación desde Step Function
    const isStepFunctionInvocation = determineInvocationType(event);
    
    if (isStepFunctionInvocation) {
      // Para Step Function: ejecutar lógica de encadenamiento y retornar resultado directo
      console.log('Ejecutando lógica de predecesor para Step Function');
      const resultado = await fnInterPredecesorEncadenamientoNuevo(event as any);
      
      console.log('Resultado del predecesor:', JSON.stringify(resultado));
      
      // Retornar resultado directo para Step Function
      return resultado as any;
    } else {
      // Para API Gateway: retornar respuesta HTTP estándar
      console.log('Ejecutando lógica de predecesor para API Gateway');
      const resultado = await fnInterPredecesorEncadenamientoNuevo(event);
      
      return buildHttpResponse(resultado);
    }
  } catch (error) {
    console.error('Error en fnPredecesor:', error);
    return MapeoService.handleGenerarHashError(event, error);
  }
};

// Funciones auxiliares
function determineInvocationType(event: any): boolean {
  // Verificar si es invocación desde Step Function
  return !!(event.detalleFlujoResult || event.body || event.headers);
}

function buildHttpResponse(resultado: any): any {
  return {
    statusCode: resultado.codigoError === 0 ? 200 : 400,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      codigoError: resultado.codigoError,
      mensajeUsuario: resultado.mensajeUsuario,
      mensajeSistema: resultado.mensajeSistema
    })
  };
}
