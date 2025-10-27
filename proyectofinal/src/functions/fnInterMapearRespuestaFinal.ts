import * as AWSXRay from 'aws-xray-sdk-core';
import * as AWSXRaySDK from 'aws-xray-sdk';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import http from 'http';
import https from 'https';
import { IntegrationException } from '../errors';
import { Constants } from '../constant/Constants';

AWSXRaySDK.captureHTTPsGlobal(http);
AWSXRaySDK.captureHTTPsGlobal(https);

export const fnInterMapearRespuestaFinal: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('fnInterMapearRespuestaFinal');

  let respuestaAdicional = {} as any;
  try {
    logInitialDetails(event);
    
    const detalleFlujoResult = (event as any)?.bodyData?.detalleFlujoResult?.body?.data?.configuracion;
    const clientId = (event as any)?.bodyData?.clientIdResult?.body?.data?.clientId;
    const requestData = (event as any).bodyData?.servicioResult?.data;




    if(detalleFlujoResult?.crearClientId && clientId)
      respuestaAdicional["clientId"] = clientId


    return { ...requestData, ...respuestaAdicional }

        
   

  } catch (error: any) {
    console.error('=== Función fnInterMapearRespuestaFinal - ERROR ===');
    console.error('Error:', error.message);
    throw new IntegrationException(9406, 'Error interno en el servicio de mapeo', Constants.MSG_ERROR_USUARIO_GENERAL);
  } finally {
    if (subsegment) {
      subsegment.close();
    }
  }
};


// Funciones auxiliares para reducir complejidad cognitiva
function logInitialDetails(event: APIGatewayProxyEvent): void {
    console.log('=== LAMBDA fnInterMapearRespuestaFinal - INICIO ===');
    console.log('Event body:', JSON.stringify(event));
}
