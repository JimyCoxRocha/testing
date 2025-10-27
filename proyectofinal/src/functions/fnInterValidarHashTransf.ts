import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FraudeException } from '../errors/FraudeException';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import { Constants } from '../constant/Constants';
import { ValidacionesService } from '../services/ValidacionesService';
import { HashUsuarioRepository } from '../repository/HashUsuarioRepository';
import { Util } from '../utils/utils';

interface ValidarHashService {
  validar(body: string, headers: Record<string, string>): Promise<boolean>;
}

class ValidarHashServiceImpl implements ValidarHashService {
  async validar(body: string, headers: Record<string, string>): Promise<boolean> {
    console.log('Validando hash de seguridad');
    
    if (!body || body.trim() === '') {
      throw new FraudeException(403, 'Cuerpo de petición requerido para validación', DiccionarioMensajes.msgErrorUsuarioGeneral);
    }

    // Validar que el JSON es válido
    try {
      JSON.parse(body);
    } catch (error) {
      throw new FraudeException(403, 'Formato JSON inválido', DiccionarioMensajes.msgErrorUsuarioGeneral);
    }

    // Validar que existe referenciaRes y hash en headers (igual que el proyecto principal)
    try {
        await ValidacionesService.existeReferenciaHash(headers);
        console.log('🔍 ✅ Referencia y hash validados por ValidacionesService');
    } catch (error) {
        if (error instanceof FraudeException) {
            throw error;
        }
        throw new FraudeException(403, "Error al validar referencia y hash", DiccionarioMensajes.msgErrorUsuarioGeneral);
    }

    // Consultar DynamoDB para validar existencia del hash (igual que el proyecto principal)
    const hashRepo = new HashUsuarioRepository();
    const tableHash = process.env.TABLA_HASH_USUARIO_NAME as string;
    const hashUsuario = await hashRepo.getHash(headers.hash, tableHash);
    
    if (!hashUsuario || !hashUsuario.sesionValida) {
      throw new FraudeException(403, 'Hash de seguridad no encontrado', DiccionarioMensajes.msgErrorUsuarioGeneral);
    }
    
    console.log('🔍 ✅ Hash encontrado y validado en DynamoDB');

    console.log('Hash validado exitosamente');
    return true;
  }
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Lambda InterceptorValidarHash - Procesando validación de hash');
    console.log('Event body:', event.body);
    console.log('Event headers:', JSON.stringify(event.headers));

    if (!event || typeof event.body !== 'string' || event.body.trim() === '') {
      console.log('Error: El cuerpo de la petición esta mal formado:', event.body);
      throw new FraudeException(403, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
    }

    const headers: Record<string, string> = Util.getHeaders(event);

    const service = new ValidarHashServiceImpl();
    const isValid = await service.validar(event.body, headers);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        codigoError: 0,
        mensajeUsuario: 'Hash validado exitosamente',
        valido: isValid,
        hashValidado: true,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Error en InterceptorValidarHash:', error);

    // Para que el Step Function funcione correctamente, 
    // NO retornamos respuesta de error, SINO lanzamos la excepción
    if (error instanceof FraudeException) {
      // Re-lanzar la excepción para que el Step Function la capture
      throw error;
    } else if (error instanceof SyntaxError) {
      // Convertir SyntaxError a FraudeException
      throw new FraudeException(403, 'Formato JSON inválido', DiccionarioMensajes.msgErrorUsuarioGeneral);
    } else if (error instanceof Error) {
      // Convertir Error genérico a FraudeException
      throw new FraudeException(403, error.message, DiccionarioMensajes.msgErrorUsuarioGeneral);
    } else {
      // Error desconocido
      throw new FraudeException(403, 'Error interno en validación de hash', DiccionarioMensajes.msgErrorUsuarioGeneral);
    }
  }
};
