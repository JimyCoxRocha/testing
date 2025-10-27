import { APIGatewayRequestAuthorizerHandler } from 'aws-lambda';
import { ValidacionesService } from '../services/ValidacionesService';
import { FraudeException } from '../errors/FraudeException';
import { DiccionarioMensajes } from '../constant/response-dictionary';

export const fnValidarClientId: APIGatewayRequestAuthorizerHandler = async (event) => {
    try {
        console.log('🛡️ =========================== AUTHORIZER INICIO ===========================');
        console.log('🛡️ Event completo:', JSON.stringify(event, null, 2));
        console.log('🛡️ Event type:', event.type);
        console.log('🛡️ Method ARN:', event.methodArn);
        console.log('🛡️ Resource:', event.resource);
        console.log('🛡️ Path:', event.path);
        console.log('🛡️ HttpMethod:', event.httpMethod);
        console.log('🛡️ Headers recibidos:', JSON.stringify(event.headers, null, 2));
        console.log('🛡️ Query params:', JSON.stringify(event.queryStringParameters, null, 2));
        console.log('🛡️ Stage variables:', JSON.stringify(event.stageVariables, null, 2));
        console.log('🛡️ Request context:', JSON.stringify(event.requestContext, null, 2));
        console.log('🛡️ Authorizer Lambda - Validando clientId e identificación');
        
        // Extraer headers del evento REQUEST
        const headers = event.headers || {};
        console.log('🛡️ Headers extraídos:', JSON.stringify(headers, null, 2));
        
        // El clientId puede venir de dos formas:
        // Extraer clientId desde header directo
        const clientId = headers.clientId;
        console.log('🛡️ ClientId encontrado:', clientId ? 'SÍ (longitud: ' + clientId.length + ')' : 'NO');
        
        if (!clientId) {
            console.error('🛡️ ❌ ERROR: No se proporcionó clientId');
            console.error('🛡️ ❌ Headers disponibles:', Object.keys(headers));
            throw new FraudeException(403, "No se ha detectado un clientId válido o no exíste", DiccionarioMensajes.msgErrorUsuarioGeneral);
        }

        console.log('🛡️ ✅ ClientId extraído correctamente, longitud:', clientId.length);
        console.log('🛡️ ✅ Identificación recibida:', headers.identificacion);

        // Simular headers como en el proyecto principal
        const headersForValidation = {
            clientId: clientId,
            identificacion: headers.identificacion
        };

        console.log('🛡️ Iniciando validaciones de negocio...');
        
        // 1. Validar que existe el clientId
        console.log('🛡️ Step 1: Validando existencia de clientId...');
        await ValidacionesService.existeClientId(headersForValidation);
        console.log('🛡️ ✅ Step 1: ClientId existe y es válido');

        // 2. Validar identificación
        console.log('🛡️ Step 2: Validando identificación...');
        await ValidacionesService.validarIdentificacion(headersForValidation);
        console.log('🛡️ ✅ Step 2: Identificación válida');

        console.log('🛡️ ✅ VALIDACIÓN EXITOSA - ClientId e identificación validados');

        const authResponse = {
            principalId: 'user',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Allow' as const,
                        Resource: event.methodArn
                    }
                ]
            },
            context: {
                clientId: clientId,
                validated: 'true',
                timestamp: new Date().toISOString(),
                ...(headers.identificacion && { identificacion: headers.identificacion })
            }
        };

        console.log('🛡️ ✅ Política de autorización generada:', JSON.stringify(authResponse, null, 2));
        console.log('🛡️ =========================== AUTHORIZER FIN ===========================');
        
        // Política de autorización exitosa
        return authResponse;

    } catch (error) {
        console.error('🛡️ ❌ ========================= AUTHORIZER ERROR =========================');
        console.error('🛡️ ❌ Error completo:', error);
        console.error('🛡️ ❌ Error tipo:', typeof error);
        console.error('🛡️ ❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
        
        let errorMessage = 'Error de autorización';
        let errorCode = '9999';
        
        if (error instanceof FraudeException) {
            errorMessage = error.mensajeUsuario;
            errorCode = error.codigoError.toString();
            console.error('🛡️ ❌ FraudeException:', { codigo: errorCode, mensaje: errorMessage });
        } else if (error instanceof Error) {
            errorMessage = error.message;
            console.error('🛡️ ❌ Error genérico:', errorMessage);
        }
        
        const denyResponse = {
            principalId: 'user',
            policyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Action: 'execute-api:Invoke',
                        Effect: 'Deny' as const,
                        Resource: event.methodArn
                    }
                ]
            },
            context: {
                error: errorMessage,
                errorCode: errorCode,
                validated: 'false',
                timestamp: new Date().toISOString()
            }
        };
        
        console.error('🛡️ ❌ Política DENY generada:', JSON.stringify(denyResponse, null, 2));
        console.error('🛡️ ❌ ======================= AUTHORIZER ERROR FIN =======================');
        
        // Política de denegación
        return denyResponse;
    }
}; 