import { RequestSesionCache, ResponseSesionCache, KeySesionCache, ResponseMensajeSalida } from "../beans/usuariopy.interface";
import axios from "axios";

/*******   Obtiene el sesionCache desde la API    *******/
export const obtener = async (identificacion: string): Promise<KeySesionCache> => {
    console.log(`Procedemos con la obtención del sesionCache-${identificacion}`);

    const key = `CACHE_LOGIN-${identificacion.trim()}`;
    const urlBase = process.env.BB_BASE_URL as string;
    const url = `${urlBase}/v1/cache/obtener`;

    const response = await axios.get(url, {
        params: { key },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

    const data = response.data as ResponseSesionCache;

    console.log("OBTENER - RESPONSE: " + JSON.stringify(data));

    return JSON.parse(data.value) as KeySesionCache;
};

/*******   Guarda el sesionCache en la API    *******/
export const guardar = async (
    identificacion: string,
    requests: RequestSesionCache[]
) => {
    console.log(`Procedemos con el almacenamiento del sesionCache-${identificacion}`);
    const urlBase = process.env.BB_BASE_URL as string;

    const url = `${urlBase}/v1/cache/guardar`;

    return axios.post(url, JSON.stringify(requests), { timeout: 10000 });
};

/*******   Actualiza el sesionCache agregando tieneDispositivo = "true"    *******/
export const actualizar = async (identificacion: string) => {
    console.log(`Inicia el proceso de actualizar-${identificacion}`);
    const dataKey = await obtener(identificacion);

    // Calculamos duración de cache en milisegundos (default 24h)
    const tiempoMilisegundos = process.env.CACHE_LOGIN_DURACION_MILI?.toString() || "86400000";
    const sesionCacheTexto = "CACHE_LOGIN-";
    const key = sesionCacheTexto + identificacion;
    const keyEnteMis = sesionCacheTexto + dataKey.enteMis;

    // Actualizamos propiedad
    dataKey.tieneDispositivo = "true";

    // Escapamos value y ponemos dentro de un arreglo
    const request = [
        {
            key: key,
            keyEntemis: keyEnteMis,
            tiempoDuracionMilisegundos: tiempoMilisegundos,
            value: JSON.stringify(dataKey)
        }
    ];

    console.log("KeySesionCache: " + JSON.stringify(dataKey));
    console.log("GUARDAR - REQUEST: " + JSON.stringify(request));

    const response = await guardar(identificacion, request) as any;
    const responseData = response.data as ResponseMensajeSalida;
    console.log("ResponseMensajeSalida: " + JSON.stringify(responseData));
    return responseData;
};
