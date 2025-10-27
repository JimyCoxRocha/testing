import * as AWSXRay from 'aws-xray-sdk-core';
import * as AWSXRaySDK from 'aws-xray-sdk';
import { APIGatewayProxyEvent } from 'aws-lambda';


import { FraudeException } from '../errors';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import { Constants } from '../constant/Constants';
import ConfiguracionFlujoService, { ACCION_FLUJO, IFlowResponse } from '../services/ConfiguracionFlujoService';
import http from 'http';
import https from 'https';
import { Util } from '../utils/utils';
import { StepFunctionResult } from '../beans/general.interface';
import { MapeoService } from '../services/MapeoService';

AWSXRaySDK.captureHTTPsGlobal(http);
AWSXRaySDK.captureHTTPsGlobal(https);

export const handler = async (event: APIGatewayProxyEvent): Promise<StepFunctionResult> => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('fnDetalleFlujo');

  try {
    logEventDetails(event);
    validateEventInput(event);
    
    const { body, headers, resource } = event;
    Util.extractResourceSegment(resource); // Log resource information
    
    const configuracionService = new ConfiguracionFlujoService();
    const bodyForService = prepareBodyForService(body);
    
    console.log('🔍 Llamando a configuracionService.procesarFlujo...');
    const flowResponse: IFlowResponse = await configuracionService.procesarFlujo(bodyForService, headers, resource);
    console.log('🔍 ✅ Flujo procesado exitosamente:', JSON.stringify(flowResponse, null, 2));

    const requestBody = parseRequestBody(body);
    const transactionData = await generateTransactionData(requestBody, flowResponse);
    
    logSuccessDetails(flowResponse, transactionData);

    console.log('🔍 ✅ === RESPUESTA EXITOSA GENERADA ===');
    console.log('🔍 ✅ Response completa:', JSON.stringify(buildSuccessResponse(flowResponse, transactionData), null, 2));
    
    return buildSuccessResponse(flowResponse, transactionData);

  } catch (error: any) {
    console.error('🔍 ❌ ERROR en fnDetalleFlujo:', error);
    subsegment?.addError(JSON.stringify(error));

    return MapeoService.buildErrorResponse(error);

  } finally {
    subsegment?.close();
    console.log('🔍 ========================= DETALLE FLUJO FIN =========================');
  }
};

export async function generateTransactionData(requestBody: any, flowResponse: IFlowResponse) {
  console.log('🔍 🔧 === GENERANDO TRANSACTION DATA ===');
  console.log('🔍 🔧 RequestBody recibido:', JSON.stringify(requestBody, null, 2));
  console.log('🔍 🔧 FlowResponse.accion:', flowResponse.accion);
  
  const transactionId = generateTransactionId();
  console.log('🔍 🔧 TransactionId generado:', transactionId);
  
  const hash = generateTransactionHash(requestBody, flowResponse.accion);
  console.log('🔍 🔧 Hash generado:', hash);
  
  const result = {
    transactionId,
    hash,
    accion: flowResponse.accion,
    timestamp: new Date().toISOString()
  };
  
  console.log('🔍 🔧 Resultado final:', JSON.stringify(result, null, 2));
  console.log('🔍 🔧 === FIN GENERANDO TRANSACTION DATA ===');
  
  return result;
}


export function generateTransactionId(): string {
  // Usar crypto.randomBytes para generar IDs seguros criptográficamente
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(6); // 6 bytes = 12 caracteres hex
  const secureRandom = randomBytes.toString('hex');
  return `TXN_${Date.now()}_${secureRandom}`;
}

export function generateTransactionHash(requestBody: any, accion: ACCION_FLUJO): string {
  const crypto = require('crypto');
  
  // Sanitizar datos sensibles antes del hashing
  const sanitizedData = sanitizeDataForHashing(requestBody);
  
  // Crear estructura segura para el hash (sin datos sensibles directos)
  const hashInput = {
    accion: accion,
    dataHash: crypto.createHash('sha256').update(JSON.stringify(sanitizedData)).digest('hex'), // NOSONAR: hash solo para trazabilidad sobre datos sanitizados; no contiene secretos ni se usa para seguridad
    timestamp: Date.now(),
    // Usar crypto.randomBytes para generar valores seguros criptográficamente
    random: crypto.randomBytes(8).toString('hex') // 8 bytes = 16 caracteres hex
  };
  
  const dataToHash = JSON.stringify(hashInput);
  
  // SECURITY: Los datos han sido sanitizados y no contienen información sensible directa
  // Solo se usa para generar un identificador de trazabilidad NO sensible; no es un mecanismo criptográfico de seguridad
  return crypto.createHash('sha256').update(dataToHash).digest('hex'); // NOSONAR
}

/**
 * Sanitiza los datos removiendo información sensible antes del hashing
 * @param data - Datos originales que pueden contener información sensible
 * @returns Datos sanitizados seguros para hashing
 */
function sanitizeDataForHashing(data: any): any {
  if (!data || typeof data !== 'object') {
    return { type: typeof data, hasValue: !!data };
  }

  const sanitized: any = {};
  
  // Lista de campos sensibles que no deben incluirse en el hash
  const sensitiveFields = [
    'password', 'pin', 'cvv', 'cvc', 'token', 'secret', 'key',
    'tarjeta', 'numeroTarjeta', 'cardNumber'
  ];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    // Si es un campo sensible, solo indicamos que existe
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[SANITIZED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursivamente sanitizar objetos anidados
      sanitized[key] = sanitizeDataForHashing(value);
    } else {
      // Campos no sensibles se mantienen
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Funciones auxiliares para reducir complejidad cognitiva
function logEventDetails(event: APIGatewayProxyEvent): void {
  console.log('🔍 ========================= DETALLE FLUJO INICIO =========================');
  console.log('🔍 Event completo recibido:', JSON.stringify(event, null, 2));
  console.log('🔍 Event body raw:', event.body);
  console.log('🔍 Event body type:', typeof event.body);
  console.log('🔍 Event body length:', event.body ? event.body.length : 0);
  console.log('🔍 Event headers:', JSON.stringify(event.headers, null, 2));
  console.log('🔍 Event resource:', event.resource);
  console.log('🔍 Event httpMethod:', event.httpMethod);
  console.log('🔍 Event requestContext:', JSON.stringify(event.requestContext, null, 2));
  console.log('🔍 Event authorizerContext:', JSON.stringify(event.requestContext?.authorizer, null, 2));
}

function validateEventInput(event: APIGatewayProxyEvent): void {
  const { body, headers, resource } = event;
  
  console.log('🔍 Validando datos de entrada...');
  console.log('🔍 Body presente:', !!body);
  console.log('🔍 Resource presente:', !!resource);
  console.log('🔍 Headers presente:', !!headers);

  if (!body) {
    console.error('🔍 ❌ ERROR: No se proporcionó el cuerpo de la petición');
    throw new FraudeException(403, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
  }

  if (!resource) {
    console.error('🔍 ❌ ERROR: No se proporcionó el resource en la petición');
    throw new FraudeException(403, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
  }
}

function prepareBodyForService(body: any): string {
  const bodyForService = typeof body === 'string' ? body : JSON.stringify(body);
  console.log('🔍 Body preparado para servicio (tipo):', typeof bodyForService);
  return bodyForService;
}

function parseRequestBody(body: any): any {
  let requestBody;
  
  if (typeof body === 'string') {
    try {
      requestBody = JSON.parse(body);
      console.log('🔍 ✅ Body parseado desde string exitosamente');
    } catch (parseError) {
      console.error('🔍 ❌ ERROR parseando body string:', parseError);
      throw new FraudeException(403, Constants.MSG_INFORMACION_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
    }
  } else if (typeof body === 'object' && body !== null) {
    requestBody = body;
    console.log('🔍 ✅ Body ya es object, usando directamente');
  } else {
    console.error('🔍 ❌ ERROR: Body no es ni string ni object:', typeof body, body);
    throw new FraudeException(403, Constants.MSG_INFORMACION_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
  }
  
  console.log('🔍 ✅ RequestBody final:', JSON.stringify(requestBody, null, 2));
  return requestBody;
}

function logSuccessDetails(flowResponse: IFlowResponse, transactionData: any): void {
  console.log('🔍 ✅ === DETALLE FLUJO PROCESADO EXITOSAMENTE ===');
  console.log('🔍 ✅ Acción determinada:', flowResponse.accion);
  console.log('🔍 ✅ URL del servicio:', flowResponse.configuracion.urlServicio);
  console.log('🔍 ✅ Acciones a ejecutar:', flowResponse.nextSteps);
  console.log('🔍 ✅ TransactionId:', transactionData.transactionId);
  console.log('🔍 ✅ Hash generado:', transactionData.hash);
}

function buildSuccessResponse(flowResponse: IFlowResponse, transactionData: any): StepFunctionResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      codigoError: 0,
      mensajeUsuario: `Detalle flujo ${flowResponse.accion} validado exitosamente`,
      data: {
        transactionId: transactionData.transactionId,
        accion: flowResponse.accion,
        urlServicio: flowResponse.configuracion.urlServicio,
        accionesOrden: flowResponse.nextSteps,
        nextSteps: flowResponse.nextSteps,
        configuracion: {
          validarHash: flowResponse.configuracion.validarHash,
          llamarServicioUrl: flowResponse.configuracion.llamarServicioUrl,
          borrarHash: flowResponse.configuracion.borrarHash,
          crearClientId: flowResponse.configuracion.crearClientId,
          validarClientId: flowResponse.configuracion.validarClientId,
          requiereAutorizacion: flowResponse.configuracion.requiereAutorizacion
        },
        hash: transactionData.hash,
        shouldContinue: flowResponse.shouldContinue
      },
      timestamp: new Date().toISOString()
    }
  };
}
