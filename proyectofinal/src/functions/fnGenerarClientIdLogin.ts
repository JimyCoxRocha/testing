import * as AWSXRay from 'aws-xray-sdk-core';
import * as AWSXRaySDK from 'aws-xray-sdk';
import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AuthService } from '../services/AuthService.GenerarClientId';
import { FraudeException } from '../errors';
import http from 'http';
import https from 'https';
import { Constants } from '../constant/Constants';
import { Util } from '../utils/utils';

AWSXRaySDK.captureHTTPsGlobal(http);
AWSXRaySDK.captureHTTPsGlobal(https);

export const fnGenerarClientIdLogin: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  
  // X-Ray
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('fnGenerarClientIdLogin');

  try {
    console.log('Event header:', event.headers);
    console.log('Event body:', event.body);

    if (!event.body) {
      throw new FraudeException(9400, 'No se proporcionó el cuerpo de la petición', 'Datos incompletos');
    }

    const authService = new AuthService();
   
    const response = await authService.peticionLogin(event.body, event.headers);

    console.log("ClientId generado correctamente: " + JSON.stringify(response));

    return {
      statusCode: 200,
      headers: Util.getResponseHeader().headers,
      body: response.body
    };

  } catch (error: any) {
    console.error('Error en fnGenerarClientIdLogin:', error);
    subsegment?.addError(JSON.stringify(error));

    return {
      statusCode: 200,
      headers: Util.getResponseHeader().headers,
      body: JSON.stringify({
        codigoError: 9999,
        mensajeUsuario: Constants.MSG_ERROR_USUARIO_GENERAL,
        mensajeSistema: error.message,
      })
    };
  }
}; 