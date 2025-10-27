import { IMensajeGenerico } from "./general.interface";

export interface IiniciarSesion extends IMensajeGenerico{
    
    sesionUnica: ISesionUnica;
    cliente: ICliente;

}

export interface ICliente {
    identificacion: {
        tipoIdentificacion: string;
        identificacion: string;
    };
}

export interface ISesionUnica {
    sessionId:string;
    token:string;
    uriTech:string;
}

export interface IExtenderTiempoSesion {
    sessionId: string
}

// Interfaces para registro de dispositivo
export interface IRegistroDispositivo {
    dispositivo: IDispositivoInfo;
}

export interface IDispositivoInfo {
    nombreDispositivo: string;
}

// Interfaces para caché de sesión
export interface ResponseMensajeSalida {
    codigoError: number;
    mensajeUsuario: string;
    mensajeSistema: string;
    habilitado: boolean;  
}

export interface ResponseSesionCache extends ResponseMensajeSalida {  
    key: string;
    value: string;
}

export interface KeySesionCache {
    uriTech: string;
    userName: string;
    uriEntidad: string;
    token: string;
    sessionId: string;
    authenticationMethodSchema: string;
    customerId: string;
    emailAddress: string;
    methodAuthentication: string;
    isEmployee: string | boolean;
    segmento: string;
    tieneDispositivo: string;
    tieneEntrust: string;
    enteMis: string | number;
    sIntitutionId: string;
}

export interface RequestSesionCache {
    key: string;
    keyEntemis: string;
    tiempoDuracionMilisegundos: string;
    value: string;
}