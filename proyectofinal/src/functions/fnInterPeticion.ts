import * as AWSXRay from 'aws-xray-sdk-core';
import * as AWSXRaySDK from 'aws-xray-sdk';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FraudeException, IntegrationException } from '../errors';
import { IHeader } from '../beans/general.interface';
import http from 'http';
import https from 'https';
import { Util } from '../utils/utils';
import { Constants } from '../constant/Constants';
import { PostProcesadoresService } from '../services/PostProcesadoresService';

AWSXRaySDK.captureHTTPsGlobal(http);
AWSXRaySDK.captureHTTPsGlobal(https);

export const fnInterPeticion: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('fnInterPeticion');

  try {
    logInitialDetails(event);
    validateEventBody(event);
    
    const requestData = (event as any).body.originalBody;
    const requestHeaders = (event as any).body.originalHeaders;
    const detalleFlujoResult = (event as any).body.detalleFlujoResult.body;

    console.log('📋 OriginalBody:', JSON.stringify(requestData));
    console.log('📋 OriginalHeaders:', JSON.stringify(requestHeaders));
    console.log('📋 DetalleFlujoResult:', JSON.stringify(detalleFlujoResult));

    const resultadoValidacion = validacionesInterPeticion(event);
    
    if(!resultadoValidacion.puedeContinuar){
      return resultadoValidacion.data
    }

    

    
    const { urlServicio, timeoutMilisegundos } = extractFlujoData(detalleFlujoResult.data);


    console.log('✅ Acción validada: fnInterPeticion');

    if (!urlServicio || !timeoutMilisegundos) {
      throw new FraudeException(9403, Constants.MSG_ERROR_USUARIO_GENERAL, Constants.MSG_ERROR_USUARIO_GENERAL);
    }

    console.log(`🌐 URL del servicio: ${urlServicio}`);

    const headersServicio = Util.adicionaClienteMigradoHeader(requestHeaders);

    // Realizar la llamada al servicio de transferencia
    console.log('🚀 Headers: ', JSON.stringify(headersServicio));

    
    const startTime = Date.now();
    try {
        let servicioResponse
        servicioResponse = await ejecutarServicioAxios(urlServicio, timeoutMilisegundos, JSON.stringify(requestData), headersServicio);

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`✅ Servicio ejecutado exitosamente en ${duration}ms`);
        console.log(`📊 Status: ${servicioResponse.status}`);
        console.log(`📄 Response:`, JSON.stringify(servicioResponse.data, null, 2));

        const postProceasdor = new PostProcesadoresService();
        await postProceasdor.ejecutarPostProcesadorParametrizada(detalleFlujoResult?.data?.configuracion?.postProcesador, servicioResponse.data, requestData);
        // Preparar respuesta exitosa
        console.log('=== LAMBDA PETICION - FIN EXITOSO ===');
        return buildServiceResponse(servicioResponse, urlServicio, duration);

    } catch (axiosError: any) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        return handleAxiosError(axiosError, urlServicio, duration);
    }

  } catch (error) {
    console.error('=== LAMBDA PETICION - ERROR ===');
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


// Funciones auxiliares para reducir complejidad cognitiva
function logInitialDetails(event: APIGatewayProxyEvent): void {
    console.log('=== LAMBDA fnInterPeticion - INICIO ===');
    console.log('Event body:', event.body);
}

function validateEventBody(event: APIGatewayProxyEvent): void {
    if (!event.body) {
        throw new FraudeException(9400, 'No se proporcionó el cuerpo de la petición', 'Datos incompletos');
    }
}

function extractFlujoData(detalleFlujoResult: any){
    const urlServicio = detalleFlujoResult.urlServicio;
    const timeoutMilisegundos = detalleFlujoResult.timeoutMilisegundos;

    console.log(`🌐 URL del servicio: ${urlServicio} con ${timeoutMilisegundos}ms`);

    return {urlServicio, timeoutMilisegundos };
}

function ejecutarServicioAxios(urlServicio: string, timeoutMilisegundos: number, originalBody: string, headersServicio: IHeader): Promise<any> {
  console.log("Resquest => ", JSON.stringify(
    {

      urlServicio, originalBody, 
      otrosParametros: {
        headers: { "Content-Type": "application/json", ...headersServicio },
        timeout: timeoutMilisegundos // 30 segundos de timeout
      }

    }
  ));


    return Util.axiosAgent().post(urlServicio, originalBody, {
        headers: { "Content-Type": "application/json", ...headersServicio },
        timeout: timeoutMilisegundos // 30 segundos de timeout
    });
}

function buildServiceResponse(servicioResponse: any, urlServicio: string, duration: number): any {
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
}

function handleAxiosError(axiosError: any, urlServicio: string, duration: number): any {
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
    }

    // Error no manejado
    throw new IntegrationException(9405, 'Error desconocido en el servicio de transferencia', axiosError.message);
}

function validacionesInterPeticion (event: any) {

  try{

    const body = event.body
    console.log("Data a validar: ", JSON.stringify(body.originalBody));
    console.log("Caracteres a validar: ", JSON.stringify(body.caracteresBloqueados.split(",")));
    if(body.caracteresBloqueados){
      const caracteres = body.caracteresBloqueados.split(",");
      Util.validarCaracteresEspecialesPorTipo({...body.originalBody}, caracteres);
    }

    return {
      puedeContinuar: true
    }
  }catch(err: any){
    
    const errorFormateado = {
      data: {
        "codigoError": Constants.CODIGO_ERROR_GENERAL,
        "mensajeUsuario": Constants.MSG_ERROR_GENERAL,
        "mensajeSistema": err.message
      },
      status: 200
    }
  
    return {
      puedeContinuar: false,
      data: buildServiceResponse(errorFormateado, "", 1)
    }
  }

}