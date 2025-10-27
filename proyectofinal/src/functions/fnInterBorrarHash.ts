import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildSuccessResponse, buildErrorResponse } from '../utils/errorHandlerUtils';
import { GenerarHashService } from '../services/GenerarHashService';
import { HashUsuarioRepository } from '../repository/HashUsuarioRepository';

export const fnInterBorrarHash: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Lambda InterceptorBorrarHash - Procesando eliminación de hash');
    console.log('Event headers:', JSON.stringify(event));
    const hashService = new GenerarHashService();


    const hashValue = await hashService.generarOnlyHash({
      clientId: event.headers.clientId as string
    }, (event as any).hashOrigen);
    console.log("HashValue: ", hashValue);
    const tableName = process.env.TABLA_HASH_USUARIO_NAME_TRX as string;

    const service = new HashUsuarioRepository();
    await service.borrar(hashValue, tableName);

    return buildSuccessResponse('Hash eliminado exitosamente', { 
      hashId: hashValue.substring(0, 10) + '...' 
    });

  } catch (error) {
    console.error('Error en InterceptorBorrarHash:', error);
    return buildErrorResponse(error, 'Error interno al eliminar hash');
  }
};
