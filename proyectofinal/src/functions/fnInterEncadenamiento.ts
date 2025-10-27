import * as AWSXRaySDK from 'aws-xray-sdk';
import { APIGatewayProxyEvent } from 'aws-lambda';
import http from 'http';
import https from 'https';
import { Constants } from '../constant/Constants';
import { getEncadenamientoDb, putItem } from '../datsource/dynamodb';
import { Util } from '../utils/utils';
import moment from 'moment';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import { SemillaRepository } from '../repository/SemillaRepository.GenerarClientId';
import { AttributeValue } from "@aws-sdk/client-dynamodb";
import { IEncadenamientoNuevo, IEncadenamientoDB, IPredecesorLogic } from '../beans/general.interface';


AWSXRaySDK.captureHTTPsGlobal(http);
AWSXRaySDK.captureHTTPsGlobal(https);

interface IEncadenamiento {
    codigoPredecesor: string,
    codigoSucesor: string
}

interface IEncadenamientoRespuesta{
  codigoError: number,
  mensajeUsuario: string,
  mensajeSistema: string
}


const esHashCaducado = (fechaExpiracion: string) => {

  const fechaExpiracionDate = moment(fechaExpiracion, DiccionarioMensajes.formatoFechaHora);

  //Se debe considerar guardar en este formato la fecha y hora de expiración DiccionarioMensajes.formatoFechaHora
  const fechaActual = moment().utcOffset("-05:00").format(DiccionarioMensajes.formatoFechaHora);

  return fechaExpiracionDate.isBefore(moment(fechaActual, DiccionarioMensajes.formatoFechaHora));


}



export const fnInterPredecesorEncadenamiento = async (event: APIGatewayProxyEvent): Promise<IEncadenamientoRespuesta> => {

  try {
    logInitialDetails(event);
    
    const detalleFlujoResult: IEncadenamiento = (event as any)?.detalleFlujoResult?.body?.data?.encadenamiento;
    const headers = (event as any).headers;

    const semillaRepo = new SemillaRepository();
    const semilla = await semillaRepo.obtenerSemilla();

    if(detalleFlujoResult?.codigoPredecesor){
      const hashEncadenamiento = Util.crearHashEncadenamiento(semilla, headers.identificacion, detalleFlujoResult?.codigoPredecesor);

      //Verificar si existe en Dynamo, si no existe se debe lanzar un error del tipo Constants.CODIGO_ERROR_ENCADENAMIENTO
      const encadenamiento = await getEncadenamientoDb(hashEncadenamiento, process.env.ENCADENAMIENTO_DB_NAME as string);

      if(!encadenamiento.existe || esHashCaducado(encadenamiento.fechaExpiracion)){
        return {
          codigoError: Constants.CODIGO_ERROR_ENCADENAMIENTO as number,
          mensajeUsuario: Constants.MSG_ERROR_ENCADENAMIENTO as string,
          mensajeSistema: Constants.MSG_ERROR_ENCADENAMIENTO as string
        }
      }
    }

    return {
      codigoError: Constants.CODIGO_ERROR_OK as number,
      mensajeUsuario: Constants.MSG_EXITOSO_USUARIO_GENERAL as string,
      mensajeSistema: Constants.MSG_EXITOSO_USUARIO_GENERAL as string
    }

        
   

  } catch (error: any) {
    return {
      codigoError: Constants.CODIGO_ERROR_GENERAL as number,
      mensajeUsuario: Constants.MSG_ERROR_USUARIO_GENERAL as string,
      mensajeSistema: error.message
    }
  }
};




export const fnInterSucesorEncadenamiento = async (event: APIGatewayProxyEvent): Promise<void> => {

  try {
    logInitialDetails(event);
    
    const detalleFlujoResult: IEncadenamiento = (event as any)?.detalleFlujoResult?.body?.data?.encadenamiento;
    const headers = (event as any).headers;

    const semillaRepo = new SemillaRepository();
    const semilla = await semillaRepo.obtenerSemilla();

    if(detalleFlujoResult?.codigoSucesor){
      const hashEncadenamiento = Util.crearHashEncadenamiento(semilla, headers.identificacion, detalleFlujoResult?.codigoSucesor);
      //Guardar Hash en base de datos
      const tableElement: Record<string, AttributeValue> = {  
        id: { S: hashEncadenamiento },
        fechaExpiracion: { S: moment().utcOffset("-05:00").add(process.env.DURACION_ENCADENAMIENTO, 'minutes').format(DiccionarioMensajes.formatoFechaHora) },
        expires_at: { N: `${moment().add(process.env.DURACION_ENCADENAMIENTO, 'minutes').unix()}` }
      };

      await putItem(tableElement, process.env.ENCADENAMIENTO_DB_NAME as string);

    }

   

  } catch (error: any) {
    console.error('=== Función fnInterEncadenamiento, sin embargo no se detiene la transacción - ERROR ===');
    console.error('Error:', error.message);
  }
};

// Funciones auxiliares para reducir complejidad cognitiva
function logInitialDetails(event: APIGatewayProxyEvent): void {
    console.log('=== LAMBDA fnInterEncadenamiento - INICIO ===');
    console.log('Event body:', JSON.stringify(event));
}

// Nuevas funciones para encadenamiento mejorado
export const fnInterPredecesorEncadenamientoNuevo = async (event: APIGatewayProxyEvent): Promise<IEncadenamientoRespuesta> => {
  try {
    console.log('=== LAMBDA fnInterPredecesorEncadenamientoNuevo - INICIO ===');
    console.log('Event body:', JSON.stringify(event));
    
    const detalleFlujoResult: IEncadenamientoNuevo = (event as any)?.detalleFlujoResult?.body?.data?.encadenamiento;
    const headers = (event as any).headers;

    const semillaRepo = new SemillaRepository();
    const semilla = await semillaRepo.obtenerSemilla();

    if(detalleFlujoResult?.codigoPredecesor){
      // Crear hash del ID principal
      const hashId = Util.crearHashIdEncadenamiento(semilla, headers.identificacion);
      
      // Obtener registro de encadenamiento
      const encadenamiento = await getEncadenamientoDb(hashId, process.env.ENCADENAMIENTO_DB_NAME as string);
      
      if(!encadenamiento.existe || esHashCaducado(encadenamiento.fechaExpiracion)){
        return {
          codigoError: Constants.CODIGO_ERROR_ENCADENAMIENTO as number,
          mensajeUsuario: Constants.MSG_ERROR_ENCADENAMIENTO as string,
          mensajeSistema: Constants.MSG_ERROR_ENCADENAMIENTO as string
        }
      }

      // Evaluar lógica de predecesor
      const logicExpression = detalleFlujoResult.codigoPredecesor; // "PV001 && PV002 || PV003"
      const hashesDisponibles = encadenamiento.encadenamiento || [];
      
      const cumpleLogica = Util.evaluarLogicaPredecesor(logicExpression, hashesDisponibles);
      
      if(!cumpleLogica){
        return {
          codigoError: Constants.CODIGO_ERROR_ENCADENAMIENTO as number,
          mensajeUsuario: Constants.MSG_ERROR_ENCADENAMIENTO as string,
          mensajeSistema: "No se cumple la lógica de predecesor requerida"
        }
      }
    }

    return {
      codigoError: Constants.CODIGO_ERROR_OK as number,
      mensajeUsuario: Constants.MSG_EXITOSO_USUARIO_GENERAL as string,
      mensajeSistema: Constants.MSG_EXITOSO_USUARIO_GENERAL as string
    }

  } catch (error: any) {
    return {
      codigoError: Constants.CODIGO_ERROR_GENERAL as number,
      mensajeUsuario: Constants.MSG_ERROR_USUARIO_GENERAL as string,
      mensajeSistema: error.message
    }
  }
};

export const fnInterSucesorEncadenamientoNuevo = async (event: APIGatewayProxyEvent): Promise<void> => {
  try {
    console.log('=== LAMBDA fnInterSucesorEncadenamientoNuevo - INICIO ===');
    console.log('Event body:', JSON.stringify(event));
    
    const detalleFlujoResult: IEncadenamientoNuevo = (event as any)?.detalleFlujoResult?.body?.data?.encadenamiento;
    const headers = (event as any).headers;

    const semillaRepo = new SemillaRepository();
    const semilla = await semillaRepo.obtenerSemilla();

    if(detalleFlujoResult?.codigoSucesor){
      // Crear hash del ID principal
      const hashId = Util.crearHashIdEncadenamiento(semilla, headers.identificacion);
      
      // Crear hash del código de encadenamiento
      const hashEncadenamiento = Util.crearHashEncadenamientoNuevo(semilla, headers.identificacion, detalleFlujoResult.codigoSucesor);
      
      // Obtener registro existente o crear nuevo
      const encadenamientoExistente = await getEncadenamientoDb(hashId, process.env.ENCADENAMIENTO_DB_NAME as string);
      
      let hashesExistentes: string[] = [];
      if(encadenamientoExistente.existe && encadenamientoExistente.encadenamiento){
        hashesExistentes = Array.isArray(encadenamientoExistente.encadenamiento) 
          ? encadenamientoExistente.encadenamiento 
          : [];
      }
      
      // Agregar nuevo hash si no existe
      if(!hashesExistentes.includes(hashEncadenamiento)){
        hashesExistentes.push(hashEncadenamiento);
      }
      
      // Preparar elemento para guardar en DynamoDB
      const tableElement: Record<string, AttributeValue> = {  
        id: { S: hashId },
        expires_at: { N: `${moment().add(process.env.DURACION_ENCADENAMIENTO, 'minutes').unix()}` },
        expires_date: { S: moment().utcOffset("-05:00").add(process.env.DURACION_ENCADENAMIENTO, 'minutes').format(DiccionarioMensajes.formatoFechaHora) },
        encadenamiento: { SS: hashesExistentes }
      };

      await putItem(tableElement, process.env.ENCADENAMIENTO_DB_NAME as string);
      console.log('✅ Hash de encadenamiento guardado exitosamente:', hashEncadenamiento);
    }

  } catch (error: any) {
    console.error('=== Función fnInterSucesorEncadenamientoNuevo, sin embargo no se detiene la transacción - ERROR ===');
    console.error('Error:', error.message);
  }
};


