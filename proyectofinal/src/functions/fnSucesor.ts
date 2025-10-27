import { fnInterSucesorEncadenamiento, fnInterSucesorEncadenamientoNuevo } from './fnInterEncadenamiento';
import { MapeoService } from '../services/MapeoService';

export const fnSucesor = async (event: any) => {
  try {
    console.log('=== LAMBDA fnSucesor - INICIO ===');
    console.log('Event recibido:', JSON.stringify(event));
    
    // Verificar si es invocación desde Step Function
    const isStepFunctionInvocation = determineInvocationType(event);
    
    if (isStepFunctionInvocation) {
      // Para Step Function: ejecutar lógica de encadenamiento (no retorna error si falla)
      console.log('Ejecutando lógica de sucesor para Step Function');
      await fnInterSucesorEncadenamientoNuevo(event as any);
      
      // El sucesor no debe detener el flujo, solo registra para validaciones posteriores
      console.log('Sucesor ejecutado exitosamente');
      
      return {
        codigoError: 0,
        mensajeUsuario: 'Registro de encadenamiento exitoso',
        mensajeSistema: 'Registro de encadenamiento exitoso'
      } as any;
    } else {
      // Para API Gateway: ejecutar lógica y retornar respuesta HTTP
      console.log('Ejecutando lógica de sucesor para API Gateway');
      await fnInterSucesorEncadenamientoNuevo(event);
      
      return buildHttpResponse({
        codigoError: 0,
        mensajeUsuario: 'Registro de encadenamiento exitoso',
        mensajeSistema: 'Registro de encadenamiento exitoso'
      });
    }
  } catch (error) {
    console.error('Error en fnSucesor (no detiene el flujo):', error);
    
    // El sucesor no debe detener el flujo principal, solo logea el error
    if (determineInvocationType(event)) {
      // Para Step Function: retornar éxito aunque haya error
      return {
        codigoError: 0,
        mensajeUsuario: 'Proceso completado',
        mensajeSistema: 'Proceso completado (con advertencia en sucesor)'
      } as any;
    } else {
      // Para API Gateway: retornar error HTTP
      return MapeoService.handleGenerarHashError(event, error);
    }
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
