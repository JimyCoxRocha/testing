import { APIGatewayProxyResult } from 'aws-lambda';
import { FraudeException } from '../errors/FraudeException';

export interface SuccessResponse {
  codigoError: number;
  mensajeUsuario: string;
  eliminado: boolean;
  timestamp: string;
  [key: string]: any; // Para campos adicionales específicos
}

export interface ErrorResponse {
  codigoError: number;
  mensajeUsuario: string;
  eliminado: boolean;
  timestamp: string;
}

export function buildSuccessResponse(
  mensajeUsuario: string,
  additionalFields: Record<string, any> = {}
): APIGatewayProxyResult {
  const responseBody: SuccessResponse = {
    codigoError: 0,
    mensajeUsuario,
    eliminado: true,
    timestamp: new Date().toISOString(),
    ...additionalFields
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(responseBody)
  };
}

export function buildErrorResponse(
  error: unknown,
  defaultErrorMessage: string = 'Error interno del sistema'
): APIGatewayProxyResult {
  let statusCode = 500;
  let errorMessage = defaultErrorMessage;
  let errorCode = 9999;

  if (error instanceof FraudeException) {
    statusCode = 400;
    errorMessage = error.mensajeUsuario;
    errorCode = error.codigoError;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const responseBody: ErrorResponse = {
    codigoError: errorCode,
    mensajeUsuario: errorMessage,
    eliminado: false,
    timestamp: new Date().toISOString()
  };

  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(responseBody)
  };
}
