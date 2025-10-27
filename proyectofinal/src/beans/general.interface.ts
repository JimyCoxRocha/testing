import { JwtPayload } from "jsonwebtoken";


export interface IMensajeGenerico {
  mensajeUsuario: string;
  mensajeSistema: string;
  codigoError: number;
}

export interface IHeader {
  secuencial?: string;
  codigoMis?: string;
  pais?: string;
  tipoLogin?: string;
  nombreEquipo?: string;
  serial?: string;
  numero?: string;
  imei?: string;
  marca?: string;
  modelo?: string;
  ip?: string;
  usuario?: string;
  identificacion?: string
}


export interface IResponseAuth {

  body: string;
  headers?: {
      clientId?: string;
      hash?: string;
  }

}

export interface ISesionUnicaUsuario {
  sessionId: string;
  token: string;
  uriTech: string;
  identificacion: string;
}

export interface IUsuarioSesion {
  id: string;
  sessionId: string;
  token: string;
  uriTech: string;
}

export interface IUsuarioSesionDb {
  sessionId: string;
  token: string;
  uriTech: string;
  id: string;
  expires_date: string;
  sesionValida: boolean;
}

export interface IJwtPayload extends JwtPayload {
  sessionId: string;
  token: string;
  uriTech: string;
  identificacion: string;
}

export interface IHashUsuarioDb {
  id: string;
  hash: string;
  expires_date: string;
  referenciaRes: string;
  sesionValida?: boolean; // Campo opcional para compatibilidad con el proyecto principal
}

export interface ITransferenciaInput {
  montoDestino: string;
  nombreBancoDestino: string;
  tipo: string;
  identificacionBeneficiario: {
      identificacion: string
  }
  identificacionCliente: {
      identificacion: string
  }
  uriTechCodigoUsuario: string
}

export interface IDigitalDb {
    hash?: string
    existe: boolean
    fechaExpiracion: string
}

export interface IEncadenamiento {
    hash?: string
    existe: boolean
    fechaExpiracion: string
}

export interface IDetalleFlujo {
    id: string
    value: string
}

export interface IValidacionRequest {
  puedeContinuar: boolean,
  bodyResponse?: IMensajeGenerico
}

// Tipo personalizado para Step Functions que permite body como object
export interface StepFunctionResult {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
}


export interface IFlujoHeaderResponse {
  [x : string]: IFlujoAccionResponse
}

export interface IFlujoFiltroResponse {
  [x : string]: string
}

export interface IFlujoAccionResponse {
  urlServicio: string;
  timeoutMilisegundos: string;
  configuracion: IConfiguracionFlujo;
  encadenamiento: any
}

export interface IConfiguracionFlujo {
  validarHash?: string;
  borrarClientId?: string;
  llamarServicioUrl?: string;
  crearHash?: string;
  borrarHash?: string;
  crearClientId?: string;
  validarClientId?: string;
  requiereAutorizacion?: string;
}

// Nuevas interfaces para encadenamiento
export interface IEncadenamientoNuevo {
  codigoPredecesor?: string;
  codigoSucesor?: string;
}

export interface IEncadenamientoDB {
  id: string; // HASH(identificacion + semilla)
  expires_at: number; // Conservar
  expires_date: string; // Conservar
  encadenamiento: string[]; // [hash(PV001 + semilla), hash(PV002 + semilla), hash(PV003 + semilla)]
}

export interface IPredecesorLogic {
  codigoPredecesor: string;
  logicExpression: string; // "PV001 && PV002 || PV003"

}
// Interfaces para servicios HTTP
export interface IServicioHttpConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
}
 
export interface IServiciosHttpResponse {
  [key: string]: IServicioHttpConfig;
}