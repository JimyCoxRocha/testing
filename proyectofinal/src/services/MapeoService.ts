import { FraudeException } from "../errors/FraudeException";
import { IFlujoAccionResponse, StepFunctionResult } from "../beans/general.interface";
import { IntegrationException } from "../errors";

export class MapeoService {

    public static buildErrorResponseCrearHash(error: any): any {
        const isFraudeException = error instanceof FraudeException;
        const statusCode = isFraudeException ? 400 : 500;
        const codigoError = isFraudeException ? error.codigoError : 9999;
        const mensajeUsuario = isFraudeException ? error.mensajeUsuario : 'Error interno del sistema';
        // Extract nested ternary operation into independent statement
        let mensajeSistema = 'Error desconocido'; // default
        if (isFraudeException) {
            mensajeSistema = error.mensajeInterno;
        } else if (error instanceof Error) {
            mensajeSistema = error.message;
        }

        return {
            statusCode: statusCode,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                codigoError: codigoError,
                mensajeUsuario: mensajeUsuario,
                mensajeSistema: mensajeSistema
            }) 
        };
    }


    public static buildErrorResponse(error: any): StepFunctionResult {
        let statusCode = 500;
        let errorMessage = 'Error interno del servicio';
        let errorCode = 9999;

        if (error instanceof FraudeException) {
            statusCode = 403; // Código de fraude según DiccionarioMensajes
            errorMessage = error.mensajeUsuario;
            errorCode = error.codigoError;
        } else if (error instanceof IntegrationException) {
            statusCode = 502;
            errorMessage = error.mensajeUsuario;
            errorCode = error.codigoError;
        } else if (error instanceof SyntaxError) {
            statusCode = 400;
            errorMessage = 'Formato JSON inválido';
            errorCode = 9400;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        return {
            statusCode: statusCode,
            headers: {
            'Content-Type': 'application/json'
            },
            body: {
            codigoError: errorCode,
            mensajeUsuario: errorMessage,
            mensajeSistema: errorMessage,
            shouldContinue: false,
            timestamp: new Date().toISOString()
            }
        };
    }


    public static buildGenericSuccessResponse(configuracion: IFlujoAccionResponse, mensajeUsuario: string){
        return {
            statusCode: 200,
            headers: {
            'Content-Type': 'application/json'
            },
            body: {
            codigoError: 0,
            mensajeUsuario: `${mensajeUsuario}`,
            data: {
                urlServicio: configuracion.urlServicio,
                timeoutMilisegundos: configuracion.timeoutMilisegundos,
                configuracion: { ...configuracion.configuracion },
                encadenamiento: configuracion?.encadenamiento ? {...configuracion.encadenamiento} : {},
                shouldContinue: true
            },
            timestamp: new Date().toISOString()
            }
        };
    }

    public static handleGenerarHashError(event: any, error: any): any {
        console.error('Error en fnInterCrearHash:', error);
        const isStepFunctionInvocation = !event.httpMethod && !event.requestContext;

        if (error instanceof FraudeException) {
            if (isStepFunctionInvocation) {
            return {
                codigoError: error.codigoError,
                mensajeUsuario: error.mensajeUsuario,
                mensajeSistema: error.mensajeInterno,
                error: true
            } as any;
            }
            return this.buildErrorResponseCrearHash(error);
        }

        if (isStepFunctionInvocation) {
            return {
            codigoError: 9999,
            mensajeUsuario: 'Error interno del sistema',
            mensajeSistema: error instanceof Error ? error.message : 'Error desconocido',
            error: true
            } as any;
        }
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
            codigoError: 9999,
            mensajeUsuario: 'Error interno del sistema',
            mensajeSistema: error instanceof Error ? error.message : 'Error desconocido'
            }) 
        };
    }

    public static buildValidacionEntradaError(error: any): { codigoError: number, mensajeUsuario: string, mensajeSistema: string } {
        if (error instanceof FraudeException) {
            return {
                codigoError: error.codigoError,
                mensajeUsuario: error.mensajeUsuario,
                mensajeSistema: error.mensajeInterno
            };
        }

        return {
            codigoError: error.codigoError || 9420,
            mensajeUsuario: error.mensajeUsuario || 'No pudimos procesar tu información',
            mensajeSistema: error.mensajeSistema || error.message || 'Error en validación de entrada'
        };
    }

} 