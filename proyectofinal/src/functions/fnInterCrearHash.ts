import { APIGatewayProxyHandler } from 'aws-lambda';
import { GenerarHashService } from '../services/GenerarHashService';
import { Util } from '../utils/utils';
import Base64 from 'crypto-js/enc-base64';
import { SHA512 } from 'crypto-js';
import { MapeoService } from '../services/MapeoService';

export const fnInterCrearHash: APIGatewayProxyHandler = async (event) => {
  try {
    logInitialDetails(event);
    let newHash = '', hash= '', referencia='';
    const requestData = await processStepFunctionRequest(event);
    const generarHashService = new GenerarHashService();
    // Determinar el tipo de hash a generar basado en el contexto
    //const { hash, referencia, origen, hashOrigen, hashReferencia } = await generateHashBasedOnContext(requestData);


    const hashOrigen = requestData.hashOrigen || '';

    if (hashOrigen.trim() !== '') {
      // Generar hash con origen para OTP (guardar en hashcachetrans)
      newHash = await generarHashService.generarOnlyHash(
        requestData.headers, 
        requestData.hashOrigen as string
      );
      console.log('✅ New Hash generado:', newHash);

      const tableNameNewHash = process.env.TABLA_HASH_USUARIO_NAME_TRX as string;
      await generarHashService.guardarEnTabla(tableNameNewHash, newHash);
      
    } 

    console.log("DATAA => " , requestData.hashDeprecado);
    
    if(requestData.hashDeprecado){
      // Para validar OTP: generar AMBOS hash y guardar en AMBAS tablas
      console.log('🔄 Generando hash para validar OTP - Creando ambos tipos de hash');
      
      // 2. Hash con referenciaRes para hashcache
      const peticionAntigua = await generarHashService.generar(
        requestData.headers,
        requestData.referenciaRes as string
      );
      console.log('✅ Hash deprecado generado:', JSON.stringify(peticionAntigua));

      hash = peticionAntigua.hash;
      referencia = requestData.referenciaRes as string;
    }

    // Para Step Function: retornar objeto directo con el formato esperado
    console.log('Retornando respuesta para Step Function OTP');
    return {
      hash,
      referencia
    } as any;

  } catch (error) {
    return MapeoService.handleGenerarHashError(event, error);
  }
};



// Funciones auxiliares para reducir complejidad cognitiva
function logInitialDetails(event: any): void {
    console.log('fnInterCrearHash - Event recibido:', JSON.stringify(event));
}

function extractStepFunctionData(event: any): { body: string, headers: Record<string, string>, detalleFlujoResponse: any, responseAnterior: any } {
    console.log('Invocación desde Step Function OTP detectada');
    
    const stepFunctionEvent = event;
    const originalBody = typeof stepFunctionEvent.body === 'string' ? stepFunctionEvent.body : JSON.stringify(stepFunctionEvent.body);
    const headers = stepFunctionEvent.headers || {};
    const detalleFlujoResponse = stepFunctionEvent.detalleFlujoResponse || {};
    const responseAnterior = stepFunctionEvent.responseAnterior || {};
    
    return { body: originalBody, headers, detalleFlujoResponse, responseAnterior };
}


async function processStepFunctionRequest(event: any): Promise<{headers: Record<string, string>, referenciaRes?: string, hashOrigen?: string, hashDeprecado: string, tipoHash?: string}> {
  const stepFunctionData = extractStepFunctionData(event);
  console.log("Headers encontrado => " + JSON.stringify(stepFunctionData));
  const headers = stepFunctionData.headers;
  const responseAnterior = stepFunctionData?.responseAnterior;
  
  // Determinar el tipo de hash basado en el contexto
  let tipoHash = 'referenciaRes'; // Por defecto
  let hashOrigen = stepFunctionData?.detalleFlujoResponse?.hashOrigen;
  let hashDeprecado = stepFunctionData?.detalleFlujoResponse?.hashDeprecado;
  let referenciaRes = Base64.stringify(SHA512(JSON.stringify(responseAnterior) + Util.generateNumber()));

  
  console.log('📦 Datos para hash OTP - Tipo:', tipoHash, 'ReferenciaRes:', referenciaRes, 'Origen:', JSON.stringify(stepFunctionData?.detalleFlujoResponse));
  
  return { headers, referenciaRes, hashOrigen, hashDeprecado, tipoHash };
}
