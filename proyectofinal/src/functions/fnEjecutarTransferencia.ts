import * as AWSXRay from 'aws-xray-sdk-core';
import * as AWSXRaySDK from 'aws-xray-sdk';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyEventHeaders } from 'aws-lambda';
import { FraudeException, IntegrationException } from '../errors';
import { ACCION_FLUJO } from '../services/ConfiguracionFlujoService';
import { ITransferenciaInput } from '../beans/general.interface';
import http from 'http';
import https from 'https';
import { MetodosValidacionesService } from '../services/MetodosValidacionesService';
import { Constants } from '../constant/Constants';
import { Util } from '../utils/utils';

AWSXRaySDK.captureHTTPsGlobal(http);
AWSXRaySDK.captureHTTPsGlobal(https);

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('fnEjecutarTransferencia');

  try {
    logInitialDetails(event);
    validateEventBody(event);
    
    const isStepFunctionInvocation = determineInvocationType(event);
    const requestData = parseRequestData(event, isStepFunctionInvocation);
    const { detalleFlujoResult, originalBody, originalHeaders } = extractRequestContext(requestData, event);
    
    validateFlujoData(detalleFlujoResult);
    const { accion, urlServicio } = extractFlujoData(detalleFlujoResult);

    // Validar que sea transferencia
    if (accion !== ACCION_FLUJO.TRANSFERENCIA) {
      throw new FraudeException(9402, `Esta función solo maneja transferencias, recibido: ${accion}`, 'Acción no soportada');
    }

    console.log('✅ Acción validada: TRANSFERENCIA');

    if (!urlServicio) {
      throw new FraudeException(9403, 'No se encontró URL del servicio de transferencia', 'Configuración faltante');
    }

    console.log(`🌐 URL del servicio: ${urlServicio}`);

    const headersServicio = buildServiceHeaders(originalHeaders);

    console.log('📤 Headers para el servicio:', JSON.stringify(headersServicio, null, 2));

    // Realizar la llamada al servicio de transferencia
    console.log('🚀 Ejecutando transferencia...');
    const validaciones = new MetodosValidacionesService();
    

    // Validación digital
    const validacionResponse = await validaciones.validarTransferencias(originalBody, originalHeaders);
    console.log("Valor restorno: " + JSON.stringify(validacionResponse));

    if (!validacionResponse.puedeContinuar) {
      return {
        ...validacionResponse.bodyResponse,
        metadata: {
          urlServicio,
          statusCode: validacionResponse.bodyResponse?.codigoError,
          responseTime: 0,
          timestamp: new Date().toISOString()
        }
      } as any;
    }
    
    const startTime = Date.now();
    
    try {
      const servicioResponse = await executeTransferenciaService(urlServicio, originalBody, headersServicio);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ Transferencia ejecutada exitosamente en ${duration}ms`);
      console.log(`📊 Status: ${servicioResponse.status}`);
      console.log(`📄 Response:`, JSON.stringify(servicioResponse.data, null, 2));

      // Preparar respuesta exitosa
      console.log('=== LAMBDA EJECUTAR TRANSFERENCIA - FIN EXITOSO ===');
      return buildServiceResponse(servicioResponse, urlServicio, duration, isStepFunctionInvocation);

    } catch (axiosError: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      return handleAxiosError(axiosError, urlServicio, duration, isStepFunctionInvocation);
    }

  } catch (error) {
    console.error('=== LAMBDA EJECUTAR TRANSFERENCIA - ERROR ===');
    console.error('Error:', error);

    // Para que el Step Function funcione correctamente, 
    // NO retornamos respuesta de error, SINO lanzamos la excepción
    if (error instanceof FraudeException || error instanceof IntegrationException) {
      throw error;
    } else if (error instanceof Error) {
      throw new IntegrationException(9406, 'Error interno en la transferencia', error.message);
    } else {
      throw new IntegrationException(9406, 'Error interno en la transferencia', 'Error desconocido');
    }
  } finally {
    if (subsegment) {
      subsegment.close();
    }
  }
};
function buildServiceHeaders(originalHeaders: any): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'identificacion': originalHeaders?.identificacion || '',
    'clientId': originalHeaders?.clientId || '',
    'session': originalHeaders?.session || '',
    'hash': originalHeaders?.hash || '',
    'referenciaRes': originalHeaders?.referenciaRes || '',
    'User-Agent': originalHeaders?.['User-Agent'] || 'AWS-Lambda',
    'X-Amzn-Trace-Id': originalHeaders?.['X-Amzn-Trace-Id'] || '',
    'X-Forwarded-For': originalHeaders?.['X-Forwarded-For'] || '',
    'X-Forwarded-Port': originalHeaders?.['X-Forwarded-Port'] || '',
    'X-Forwarded-Proto': originalHeaders?.['X-Forwarded-Proto'] || 'https'
  };
}

// Funciones auxiliares para reducir complejidad cognitiva
function logInitialDetails(event: APIGatewayProxyEvent): void {
    console.log('=== LAMBDA EJECUTAR TRANSFERENCIA - INICIO ===');
    console.log('Event body:', event.body);
    console.log('Event headers:', JSON.stringify(event.headers));
}

function validateEventBody(event: APIGatewayProxyEvent): void {
    if (!event.body) {
        throw new FraudeException(9400, 'No se proporcionó el cuerpo de la petición', 'Datos incompletos');
    }
}

function determineInvocationType(event: APIGatewayProxyEvent): boolean {
    return !event.httpMethod && !event.requestContext;
}

function parseRequestData(event: APIGatewayProxyEvent, isStepFunctionInvocation: boolean): any {
    if (isStepFunctionInvocation) {
        console.log('Invocación desde Step Function detectada');
        return event.body;
    } else {
        console.log('Invocación desde API Gateway detectada');
        return JSON.parse(event.body || '{}');
    }
}

function extractRequestContext(requestData: any, event: APIGatewayProxyEvent): { detalleFlujoResult: any, originalBody: any, originalHeaders: any } {
    console.log('📋 RequestData completo:', JSON.stringify(requestData, null, 2));
    
    const detalleFlujoResult = requestData.detalleFlujoResult;
    const originalBody = requestData.originalBody || requestData.body;
    const originalHeaders = requestData.originalHeaders || event.headers;

    console.log('📋 DetalleFlujoResult:', JSON.stringify(detalleFlujoResult, null, 2));
    console.log('📋 OriginalBody:', JSON.stringify(originalBody, null, 2));
    console.log('📋 OriginalHeaders:', JSON.stringify(originalHeaders, null, 2));

    return { detalleFlujoResult, originalBody, originalHeaders };
}

function validateFlujoData(detalleFlujoResult: any): void {
    if (!detalleFlujoResult || !detalleFlujoResult.body || !detalleFlujoResult.body.data) {
        throw new FraudeException(9401, 'No se encontró información del flujo', 'Contexto de flujo faltante');
    }
}

function extractFlujoData(detalleFlujoResult: any): { accion: ACCION_FLUJO, urlServicio: string } {
    const flujoData = detalleFlujoResult.body.data;
    const accion = flujoData.accion as ACCION_FLUJO;
    const urlServicio = flujoData.urlServicio;

    console.log('✅ Acción validada:', accion);
    console.log('🌐 URL del servicio:', urlServicio);

    return { accion, urlServicio };
}

function prepareTransferenciaData(originalBody: any, originalHeaders: any): { transferenciaInput: ITransferenciaInput, headers: APIGatewayProxyEventHeaders } {
    const transferenciaInput: ITransferenciaInput = originalBody;
    const headers: APIGatewayProxyEventHeaders = originalHeaders;

    console.log('📤 Headers para el servicio:', JSON.stringify(headers, null, 2));

    return { transferenciaInput, headers };
}

function buildSuccessResponse(statusCode: number, response: any): APIGatewayProxyResult {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(response)
    };
}

function buildErrorResponse(error: any): APIGatewayProxyResult {
    const isFraudeException = error instanceof FraudeException;
    const isIntegrationException = error instanceof IntegrationException;
    
    // Extract nested ternary operations into independent statements
    let statusCode = 500; // default
    let errorCode = 9999; // default
    let errorMessage = 'Error interno del sistema'; // default
    
    if (isFraudeException) {
        statusCode = 403;
        errorCode = error.codigoError;
        errorMessage = error.mensajeUsuario;
    } else if (isIntegrationException) {
        statusCode = 502;
        errorCode = error.codigoError;
        errorMessage = error.mensajeUsuario;
    }

    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            codigoError: errorCode,
            mensajeUsuario: errorMessage,
            mensajeSistema: errorMessage
        })
    };
}

function executeTransferenciaService(urlServicio: string, originalBody: any, headersServicio: Record<string, string>): Promise<any> {
    return Util.axiosAgent().post(urlServicio, originalBody, {
        headers: headersServicio,
        timeout: (parseInt(process.env.LAMBDA_TIMEOUT as string) * 1000) - Constants.MIN_TIME_LAMBDA_RESPONSE, // 30 segundos de timeout
        validateStatus: (status) => status < 500 // Aceptar códigos de error del servicio
    });
}

function buildServiceResponse(servicioResponse: any, urlServicio: string, duration: number, isStepFunctionInvocation: boolean): any {
    if (isStepFunctionInvocation) {
        // Para Step Function: retornar objeto directo con el formato esperado
        return {
            codigoError: servicioResponse.data.codigoError,
            mensajeSistema: servicioResponse.data.mensajeSistema,
            mensajeUsuario: servicioResponse.data.mensajeUsuario,
            data: servicioResponse.data,
            metadata: {
                urlServicio,
                statusCode: servicioResponse.status,
                responseTime: duration,
                timestamp: new Date().toISOString()
            }
        } as any;
    } else {
        // Para API Gateway: retornar respuesta HTTP estándar
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Transferencia-Executed': 'true',
                'X-Response-Time': `${duration}ms`
            },
            body: JSON.stringify({
                codigoError: 0,
                mensajeUsuario: 'Transferencia ejecutada exitosamente',
                data: servicioResponse.data,
                metadata: {
                    urlServicio,
                    statusCode: servicioResponse.status,
                    responseTime: duration,
                    timestamp: new Date().toISOString()
                }
            })
        };
    }
}

function handleAxiosError(axiosError: any, urlServicio: string, duration: number, isStepFunctionInvocation: boolean): any {
    console.error('❌ Error en la llamada al servicio:', axiosError.message);
    console.error('❌ Error details:', axiosError.response?.data);

    // Si es un error de timeout o conexión
    if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
        throw new IntegrationException(9404, 'Error de conexión con el servicio de transferencia', `Timeout o conexión fallida: ${axiosError.message}`);
    }

    // Si el servicio devuelve un error
    if (axiosError.response) {
        const statusCode = axiosError.response.status;
        const errorData = axiosError.response.data;

        if (isStepFunctionInvocation) {
            // Para Step Function: retornar objeto directo con el formato esperado
            return {
                codigoError: statusCode,
                mensajeUsuario: 'Error en el servicio de transferencia',
                mensajeSistema: errorData?.mensajeSistema || errorData?.message || 'Error desconocido del servicio',
                data: errorData,
                metadata: {
                    urlServicio,
                    statusCode,
                    responseTime: duration,
                    timestamp: new Date().toISOString()
                }
            } as any;
        } else {
            // Para API Gateway: retornar respuesta HTTP estándar
            return {
                statusCode: 200, // Mantener 200 para el Step Function
                headers: {
                    'Content-Type': 'application/json',
                    'X-Transferencia-Error': 'true'
                },
                body: JSON.stringify({
                    codigoError: statusCode,
                    mensajeUsuario: 'Error en el servicio de transferencia',
                    mensajeSistema: errorData?.mensajeSistema || errorData?.message || 'Error desconocido del servicio',
                    data: errorData,
                    metadata: {
                        urlServicio,
                        statusCode,
                        responseTime: duration,
                        timestamp: new Date().toISOString()
                    }
                })
            };
        }
    }

    // Error no manejado
    throw new IntegrationException(9405, 'Error desconocido en el servicio de transferencia', axiosError.message);
}