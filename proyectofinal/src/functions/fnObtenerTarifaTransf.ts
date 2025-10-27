import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { IHeader } from '../beans/general.interface';
import { SHA512 } from 'crypto-js';
import Base64 from 'crypto-js/enc-base64';
import { Util } from '../utils/utils';
import { Constants } from '../constant/Constants';

export const fnObtenerTarifaTransf = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    logInitialDetails(event);
    
    const isStepFunctionInvocation = determineInvocationType(event);
    const { requestBody, headers } = extractRequestData(event, isStepFunctionInvocation);

    Util.validarCaracteresEspecialesPorTipo({...requestBody}, ["<", ">", "*", "?", "-"]);


    const response = await processServiceCall(requestBody, headers);

    console.log('✅ Respuesta del servicio recibida');
    console.log('📊 Status Code:', response.status);
    console.log('📋 Response Headers:', JSON.stringify(response.headers));
    console.log('📦 Response Data:', JSON.stringify(response.data));

    // Generar referenciaRes usando la misma lógica del proyecto principal
    // referenciaRes = Base64.stringify(SHA512(JSON.stringify(responseData)))
    const referenciaRes = Base64.stringify(SHA512(JSON.stringify(response.data)));
    console.log('🔐 referenciaRes generado:', referenciaRes);

    // Asegurar que responseData tenga el referenciaRes generado
    const responseData = {
      ...response.data,
      referenciaRes: referenciaRes
    };

    console.log("RESPONSE DATA FINAL => ", JSON.stringify(responseData));

    const successResponse = {
      codigoError: 0,
      mensajeUsuario: "Productos obtenidos exitosamente",
      data: responseData,
      metadata: {
        statusCode: response.status,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ fnObtenerTarifaTransf - Ejecución exitosa');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: successResponse as any
    };

  } catch (error: any) {
    return {
      statusCode: Constants.CODIGO_ERROR_GENERAL as number,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        codigoError: Constants.CODIGO_ERROR_GENERAL,
        mensajeUsuario: Constants.MSG_ERROR_USUARIO_GENERAL,
        mensajeSistema: error.message,
        metadata: {
          statusCode: Constants.CODIGO_ERROR_GENERAL,
          responseTime: 0,
          timestamp: new Date().toISOString()
        }
      } as any
    };
    
    
  }
};

// Funciones auxiliares para reducir complejidad cognitiva
function logInitialDetails(event: APIGatewayProxyEvent): void {
    console.log('🚀 fnObtenerTarifaTransf - Iniciando ejecución');
    console.log('📋 Event recibido:', JSON.stringify(event, null, 2));
}

function determineInvocationType(event: APIGatewayProxyEvent): boolean {
    const isStepFunctionInvocation = !event.httpMethod;
    console.log('🔍 Es invocación de Step Function:', isStepFunctionInvocation);
    return isStepFunctionInvocation;
}

function extractRequestData(event: APIGatewayProxyEvent, isStepFunctionInvocation: boolean): { requestBody: any, headers: IHeader } {
    let requestBody: any;
    let headers: IHeader;

    if (isStepFunctionInvocation) {
        // Viene del Step Function
        requestBody = event.body;
        headers = (event as any).headers || {};
        console.log('📦 Body del Step Function:', JSON.stringify(requestBody));
        console.log('📋 Headers del Step Function:', JSON.stringify(headers));
    } else {
        // Viene directamente de API Gateway
        requestBody = event.body ? JSON.parse(event.body) : {};
        headers = Util.adicionaClienteMigradoHeader(event.headers);
        console.log('📦 Body de API Gateway:', JSON.stringify(requestBody));
        console.log('📋 Headers de API Gateway:', JSON.stringify(headers));
    }

    return { requestBody, headers };
}

function processServiceCall(requestBody: any, headers: IHeader): Promise<any> {
    const serviceUrl = process.env.URL_CUENTA_OBTENER_TARIFA as string;
    
    // Usar el body enviado desde el cliente (Postman) como base
    let serviceBody = { ...requestBody };
    
    // Solo asegurarse de que la identificación del cliente coincida con el header
    // El tipoIdentificacion debe venir en el body original del cliente
    if (serviceBody.cliente && headers.identificacion) {
        serviceBody.cliente.identificacion = headers.identificacion;
    }
    
    console.log('📦 Body del servicio:', JSON.stringify(serviceBody));
    console.log('📤 Enviando petición al servicio...');

    // Preparar headers para la petición HTTP
    const httpHeaders = {
        'Content-Type': 'application/json',
        ...headers
    };

    const timeoutValue = (parseInt(process.env.LAMBDA_TIMEOUT as string) * 1000) - Constants.MIN_TIME_LAMBDA_RESPONSE;

    console.log("Tiemout: " + timeoutValue)

    // Realizar la petición HTTP
    return Util.axiosAgent().post(serviceUrl, serviceBody, {
        headers: httpHeaders,
        timeout: timeoutValue, // 30 segundos de timeout
        validateStatus: () => true // Aceptar cualquier status code
    });
}