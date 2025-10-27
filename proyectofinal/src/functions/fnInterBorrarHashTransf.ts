import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FraudeException } from '../errors/FraudeException';
import { buildSuccessResponse, buildErrorResponse } from '../utils/errorHandlerUtils';
import { HashUsuarioRepository } from '../repository/HashUsuarioRepository';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Lambda InterceptorBorrarHash - Procesando eliminación de hash');
    console.log('Event headers:', JSON.stringify(event.headers));

    const headers = event.headers && typeof event.headers === 'object' ? event.headers : {} as Record<string, string>;
    const hash = headers.hash as string;

    if (typeof hash !== 'string' || hash.trim() === '') {
      throw new FraudeException(9400, 'Falta hash en los headers', 'Datos incompletos');
    }

    const service = new HashUsuarioRepository();
    const tableName = process.env.TABLA_HASH_USUARIO_NAME as string;

    await service.borrar(hash, tableName);

    return buildSuccessResponse('Hash eliminado exitosamente', { 
      hashId: hash.substring(0, 10) + '...' 
    });

  } catch (error) {
    console.error('Error en InterceptorBorrarHash:', error);
    return buildErrorResponse(error, 'Error interno al eliminar hash');
  }
};
