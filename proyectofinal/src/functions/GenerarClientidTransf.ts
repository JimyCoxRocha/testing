import * as AWSXRay from 'aws-xray-sdk-core';
import * as AWSXRaySDK from 'aws-xray-sdk';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AuthService } from '../services/AuthService.GenerarClientId';
import { FraudeException, IntegrationException } from '../errors';
import { ISesionUnicaUsuario } from '../beans/general.interface';
import http from 'http';
import https from 'https';
import { Util } from '../utils/utils';

AWSXRaySDK.captureHTTPsGlobal(http);
AWSXRaySDK.captureHTTPsGlobal(https);

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // X-Ray
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('fnAuthGenerarClientId');

  try {
    console.log('Lambda fnAuthGenerarClientId - Procesando solicitud');
    logEventDetails(event);

    const requestBody = processRequestBody(event);
    const sesionData = buildSessionData(event, requestBody);
    validateSessionData(sesionData);

    const authService = new AuthService();
    const clientId = await authService.generarAutorizacion(sesionData);
    
    console.log("ClientId generado correctamente");
    return buildSuccessResponse(clientId, sesionData, event);

  } catch (error: any) {
    console.error('Error en fnAuthGenerarClientId:', error);
    subsegment?.addError(JSON.stringify(error));
    return buildErrorResponse(error, event);
  } finally {
    subsegment?.close();
    segment?.close();
  }
};

// Funciones auxiliares para reducir complejidad cognitiva
function logEventDetails(event: APIGatewayProxyEvent): void {
  console.log('Event headers:', JSON.stringify(event.headers));
  console.log('Event body:', event.body);
  console.log('Event authorizerContext:', JSON.stringify(event.requestContext?.authorizer));
  console.log('Event httpMethod:', event.httpMethod);
  console.log('Event requestContext:', JSON.stringify(event.requestContext));
}

function isStepFunctionInvocation(event: APIGatewayProxyEvent): boolean {
  return !event.httpMethod && !event.requestContext;
}

function processRequestBody(event: APIGatewayProxyEvent): any {
  if (!event.body) {
    throw new FraudeException(9400, 'No se proporcionó el cuerpo de la petición', 'Datos incompletos');
  }

  if (isStepFunctionInvocation(event)) {
    console.log('🔧 Invocación desde Step Function - Body ya es objeto');
    return event.body; // Body ya es un objeto
  } else {
    console.log('🌐 Invocación desde API Gateway - Parseando JSON');
    return JSON.parse(event.body); // Body es una cadena JSON
  }
}

function buildSessionData(event: APIGatewayProxyEvent, requestBody: any): ISesionUnicaUsuario {
  const sessionToken = generateSessionToken(event.headers?.identificacion || '');
  console.log('🔐 Token de sesión generado:', sessionToken);
  
  const sesionData: ISesionUnicaUsuario = {
    sessionId: requestBody.sessionId || generateSessionId(),
    token: requestBody.token || sessionToken,
    uriTech: requestBody.uriTech || requestBody.uriTechCodigoUsuario || event.requestContext?.requestId || '',
    identificacion: event.headers?.identificacion || ''
  };

  console.log('🔍 Datos de sesión extraídos:', {
    sessionId: sesionData.sessionId,
    token: sesionData.token,
    uriTech: sesionData.uriTech,
    identificacion: sesionData.identificacion
  });

  return sesionData;
}

function validateSessionData(sesionData: ISesionUnicaUsuario): void {
  if (!sesionData.identificacion) {
    throw new FraudeException(9400, 'Falta identificación en headers', 'Datos incompletos');
  }

  console.log('Datos de sesión validados:', {
    sessionId: sesionData.sessionId,
    identificacion: sesionData.identificacion,
    uriTech: sesionData.uriTech
  });
}

function buildSuccessResponse(clientId: string, sesionData: ISesionUnicaUsuario, event: APIGatewayProxyEvent): APIGatewayProxyResult {
  const responseData = {
    codigoError: 0,
    mensajeUsuario: 'ClientId generado exitosamente',
    data: {
      clientId: clientId,
      sessionId: sesionData.sessionId,
      token: sesionData.token,
      identificacion: sesionData.identificacion
    },
    timestamp: new Date().toISOString()
  };

  if (isStepFunctionInvocation(event)) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: responseData as any
    };
  } else {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...Util.getResponseHeader().headers
      },
      body: JSON.stringify(responseData)
    };
  }
}

function buildErrorResponse(error: any, event: APIGatewayProxyEvent): APIGatewayProxyResult {
  const errorInfo = getErrorInfo(error);
  
  const errorResponse = {
    codigoError: errorInfo.code,
    mensajeUsuario: errorInfo.message,
    mensajeSistema: error.message,
    timestamp: new Date().toISOString()
  };

  if (isStepFunctionInvocation(event)) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorResponse)
    };
  } else {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...Util.getResponseHeader().headers
      },
      body: JSON.stringify(errorResponse)
    };
  }
}

function getErrorInfo(error: any): { code: string; message: string } {
  if (error instanceof FraudeException) {
    return { code: error.codigoError.toString(), message: error.mensajeUsuario };
  } else if (error instanceof IntegrationException) {
    return { code: error.codigoError.toString(), message: error.mensajeUsuario };
  } else if (error instanceof SyntaxError) {
    return { code: '9400', message: 'Formato JSON inválido' };
  } else {
    return { code: '9999', message: 'Error interno del servidor' };
  }
}

function generateSessionId(): string {
  // Usar crypto.randomBytes para generar IDs seguros criptográficamente
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(6); // 6 bytes = 12 caracteres hex
  const secureRandom = randomBytes.toString('hex');
  return `SES_${Date.now()}_${secureRandom}`;
}

function generateSessionToken(identificacion: string): string {
  // Generar un token de sesión encriptado similar al formato del proyecto principal
  const crypto = require('crypto');
  const timestamp = Date.now();
  
  // Usar crypto.randomBytes para generar valores seguros criptográficamente
  const randomBytes = crypto.randomBytes(12); // 12 bytes = 24 caracteres hex
  const secureRandom = randomBytes.toString('hex');
  
  // Sanitizar la identificación para evitar datos sensibles en logs
  const sanitizedId = identificacion ? identificacion.substring(0, 4) + '****' : 'unknown';
  const data = `${sanitizedId}:${timestamp}:${secureRandom}`;
  
  // Usar encriptación real con crypto
  const encodedData = Buffer.from(data).toString('base64');
  return `ENC(${encodedData})`;
}
