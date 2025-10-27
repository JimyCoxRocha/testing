import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FraudeException } from '../errors/FraudeException';
import { buildSuccessResponse, buildErrorResponse } from '../utils/errorHandlerUtils';
import { SesionUsuarioRepository } from '../repository/SesionUsuarioRepository';

interface BorrarClientIdService {
  borrar(clientId: string): Promise<void>;
}

class BorrarClientIdServiceImpl implements BorrarClientIdService {
  async borrar(clientId: string): Promise<void> {
    console.log(`Eliminando clientId: ${clientId}`);
    
    // Simular eliminación de DynamoDB
    // En implementación real, aquí iría la lógica para eliminar de DynamoDB
    if (!clientId || clientId.trim() === '') {
      throw new FraudeException(9400, 'ClientId inválido para eliminación', 'ClientId vacío');
    }

    const sesionUsuario = new SesionUsuarioRepository();
    await sesionUsuario.deleteItem(clientId, process.env.TABLA_SESION_USUARIO as string);
    
    console.log(`ClientId ${clientId} eliminado exitosamente`);
  }
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Lambda InterceptorBorrarClientId - Procesando eliminación de clientId');
    console.log('Event headers:', JSON.stringify(event.headers));

    const headers = event.headers && typeof event.headers === 'object' ? event.headers : {} as Record<string, string>;
    const clientId = (headers.clientId || headers.CLIENTID || headers.clientid) as string;

    if (typeof clientId !== 'string' || clientId.trim() === '') {
      throw new FraudeException(9400, 'Falta clientId en los headers', 'Datos incompletos');
    }

    const service = new BorrarClientIdServiceImpl();
    await service.borrar(clientId);

    return buildSuccessResponse('ClientId eliminado exitosamente', { clientId });

  } catch (error) {
    console.error('Error en InterceptorBorrarClientId:', error);
    return buildErrorResponse(error, 'Error interno al eliminar clientId');
  }
};
