import * as AWSXRay from 'aws-xray-sdk-core';
import * as AWSXRaySDK from 'aws-xray-sdk';
import { APIGatewayProxyEvent } from 'aws-lambda';

// Tipo personalizado para Step Functions que permite body como object
interface StepFunctionResult {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}

import { FraudeException } from '../errors';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import { Constants } from '../constant/Constants';
import http from 'http';
import https from 'https';
import { getDetalleFlujo } from '../datsource/dynamodb';
import { Util } from '../utils/utils';
import { MapeoService } from '../services/MapeoService';
import { IFlujoFiltroResponse, IFlujoHeaderResponse } from '../beans/general.interface';

AWSXRaySDK.captureHTTPsGlobal(http);
AWSXRaySDK.captureHTTPsGlobal(https);

export const fnInterDetalleFlujo = async (event: APIGatewayProxyEvent): Promise<StepFunctionResult> => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment?.addNewSubsegment('fnInterDetalleFlujo');

  try {
    console.log("Evento: " + JSON.stringify(event));
  
    if (!event.body) {
      console.error('🔍 ❌ ERROR: No se proporcionó el cuerpo de la petición');
      throw new FraudeException(Constants.CODIGO_ERROR_GENERAL, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
    }

    if (!event.resource) {
      console.error('🔍 ❌ ERROR: No se proporcionó el resource en la petición');
      throw new FraudeException(Constants.CODIGO_ERROR_GENERAL, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
    }
  
    const flujoValor = await getDetalleFlujo("procesoconfiguracion", process.env.DB_DETALLE_PARAMETRIZABLE as string)
    const flujoFiltroValor = JSON.parse(flujoValor.value) as IFlujoFiltroResponse;
    console.log("Valor seleccionado: ", JSON.stringify(flujoFiltroValor));

    const detalleFlujoResult = await getDetalleFlujo(flujoFiltroValor[event.resource]/* "sfnvalidargen" */, process.env.DB_DETALLE_PARAMETRIZABLE as string)
    console.log("Configuracion resultante: " + JSON.stringify(detalleFlujoResult));
    const detalleResponse = JSON.parse(detalleFlujoResult.value) as IFlujoHeaderResponse;

    const lastSegment = Util.extractResourceSegment(event.resource); // Log resource information

    const detalleEspecifico = detalleResponse[lastSegment]

    console.log('🔍 Llamando a configuracionService.procesarFlujo...', JSON.stringify(detalleEspecifico));

    console.log('🔍 ✅ === RESPUESTA EXITOSA GENERADA ===');
    
    return MapeoService.buildGenericSuccessResponse(detalleEspecifico, `Detalle flujo validado exitosamente`);


  } catch (error: any) {
    console.error('🔍 ❌ ERROR en fnDetalleFlujo:', error);
    subsegment?.addError(JSON.stringify(error));

    return MapeoService.buildErrorResponse(error);

  } finally {
    subsegment?.close();
    console.log('🔍 ========================= DETALLE FLUJO FIN =========================');
  }
};