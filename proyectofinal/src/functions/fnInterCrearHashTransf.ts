import { APIGatewayProxyHandler } from 'aws-lambda';
import { FraudeException } from '../errors/FraudeException';
import { GenerarHashService } from '../services/GenerarHashService';
import jwt from 'jsonwebtoken';
import { MapeoService } from '../services/MapeoService';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    logInitialDetails(event);
    
    const isStepFunctionInvocation = determineInvocationType(event);
    const requestData = await processStepFunctionRequest(event);
    
    const service = new GenerarHashService();
    const { referencia, hash } = await service.generar(requestData.headers, requestData.referenciaRes);

    if (isStepFunctionInvocation) {
      // Para Step Function: retornar objeto directo coreferenciaResn el formato esperado
      console.log('Retornando respuesta para Step Function');
      return {
        hash,
        referencia,
        codigoError: 0,
        mensajeUsuario: 'Hash generado exitosamente',
        registrado: true
      } as any;
    } else {
      // Para API Gateway: retornar respuesta HTTP estándar
      console.log('Retornando respuesta para API Gateway');
      return buildSuccessResponse({ referencia, hash, registrado: true });
    }
  } catch (error) {
    return MapeoService.handleGenerarHashError(event, error);
  }
};


// Funciones auxiliares para reducir complejidad cognitiva
function logInitialDetails(event: any): void {
    console.log('fnGenerarHash - Event recibido:', JSON.stringify(event));
}

function determineInvocationType(event: any): boolean {
    return !event.httpMethod && !event.requestContext;
}

function extractStepFunctionData(event: any): { body: string, headers: Record<string, string> } {
    console.log('Invocación desde Step Function detectada');
    
    const stepFunctionEvent = event;
    const originalBody = typeof stepFunctionEvent.body === 'string' ? stepFunctionEvent.body : JSON.stringify(stepFunctionEvent.body);
    const headers = stepFunctionEvent.headers || {};
    
    return { body: originalBody, headers };
}

function extractApiGatewayData(event: any): { body: string, headers: Record<string, string> } {
    console.log('Invocación desde API Gateway detectada');
    
    // Validar que el body no esté vacío antes de asignar valor por defecto
    if (!event.body || (typeof event.body === 'string' && event.body.trim() === '')) {
        throw new FraudeException(9400, 'No se proporcionó el cuerpo de la petición', 'Datos incompletos');
    }
    
    const body = event.body; // NOSONAR: usado posteriormente para construir respuesta/validaciones
    
    const rawHeaders = event.headers && typeof event.headers === 'object' ? event.headers : {};
    const headers = Object.keys(rawHeaders).reduce((acc, key) => {
        const value = (rawHeaders as Record<string, unknown>)[key];
        if (typeof value === 'string') acc[key] = value;
        return acc;
    }, {} as Record<string, string>);
    
    return { body, headers };
}

function validateClientId(headers: Record<string, string>): string {
    const clientId = headers.clientId || headers.clientid;
    if (!clientId) {
        throw new FraudeException(9400, 'clientId no encontrado en headers', 'Datos incompletos');
    }
    return clientId;
}

function decodeClientId(clientId: string): any {
    try {
        const decoded = jwt.decode(clientId) as any;
        if (!decoded) {
            throw new FraudeException(9400, 'clientId JWT inválido', 'Token inválido');
        }
        return decoded;
    } catch (error) {
        console.error('Error decodificando JWT:', error);
        throw new FraudeException(9400, 'Error al decodificar clientId JWT', 'Token inválido');
    }
}


function buildSuccessResponse(hashResult: any): any {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            referencia: hashResult.referencia,
            hash: hashResult.hash,
            registrado: hashResult.registrado,
            codigoError: 0,
            mensajeUsuario: 'Hash generado exitosamente',
            mensajeSistema: 'Hash generado exitosamente'
        })
    };
}

async function processStepFunctionRequest(event: any): Promise<{headers: Record<string, string>, referenciaRes: string}> {
  const stepFunctionData = extractStepFunctionData(event);
  console.log("Headers encontrado => " + JSON.stringify(stepFunctionData));
  const headers = stepFunctionData.headers;
  const bodyReferenciaRes = JSON.parse(stepFunctionData.body);
  
  console.log('📦 Datos para hash:' + bodyReferenciaRes.referenciaRes);
  
  return { headers, referenciaRes: bodyReferenciaRes.referenciaRes };
}