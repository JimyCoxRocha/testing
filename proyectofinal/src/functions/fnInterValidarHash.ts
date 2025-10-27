import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FraudeException } from '../errors/FraudeException';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import { HashUsuarioRepository } from '../repository/HashUsuarioRepository';
import { GenerarHashService } from '../services/GenerarHashService';
import { Util } from '../utils/utils';

class ValidarHashService {

  async validar(body: string, headers: Record<string, string>, origen: string, tokenro: boolean): Promise<boolean> {
    console.log('Validando hash de seguridad: ' + JSON.stringify(body) + " Headers: " + JSON.stringify(headers));
    
    if (!body || body.trim() === '') {
      throw new FraudeException(403, 'Cuerpo de petición requerido para validación', DiccionarioMensajes.msgErrorUsuarioGeneral);
    }

    if(JSON.parse(body).metodo?.toUpperCase() === "TOKENRO" && tokenro){
      return true;
    }


    // Consultar DynamoDB para validar existencia del hash (igual que el proyecto principal)
    const hashRepo = new HashUsuarioRepository();
    const hashService = new GenerarHashService();
    
    const tableHash = process.env.TABLA_HASH_USUARIO_NAME_TRX as string;
    const hashValue = await hashService.generarOnlyHash(headers, origen);
    console.log("HashValue: ", hashValue);

    const hashUsuario = await hashRepo.getHash(hashValue, tableHash);
    console.log("hashUsuario: ", hashValue);

    
    if (!hashUsuario || !hashUsuario.sesionValida) {
      throw new FraudeException(403, 'Hash de seguridad no encontrado', DiccionarioMensajes.msgErrorUsuarioGeneral);
    }
    
    console.log('🔍 ✅ Hash encontrado y validado en DynamoDB');

    console.log('Hash validado exitosamente');
    return true;
  }
  
}

export const fnInterValidarHash: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Lambda InterceptorValidarHash - Procesando validación de hash');
    console.log('Event body:', JSON.stringify(event));
    console.log('Event headers:', JSON.stringify(event.headers));

    const headers = Util.getHeaders(event);

    const validarTokenro = (event as any).habilitarTokenro || false;
    console.log("Valor de tokenro: " + validarTokenro)

    const service = new ValidarHashService();
    const isValid = await service.validar((event as any).body, headers, (event as any).hashOrigen, validarTokenro);

    console.log("isValid: "  + isValid);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        codigoError: 0,
        mensajeUsuario: 'Hash validado exitosamente',
        valido: true,
        hashValidado: true,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error: any) {
    console.error('Error en InterceptorValidarHash:', error);

    throw new FraudeException(403, error.message, DiccionarioMensajes.msgErrorUsuarioGeneral);

  }
};
