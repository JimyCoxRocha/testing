import { RequestSesionCache } from "../beans/usuariopy.interface";
import { obtener, guardar, actualizar } from "../repository/SesionCacheRepositorio";

export default class SesionCacheService {

    obtener = async (identificacion: string) => {
        console.log("Inicia metodo: obtener - " + identificacion)

        return obtener(identificacion);
    }

    guardar = async (identificacion: string, body: RequestSesionCache[]) => {
        console.log("Inicia metodo: guardar - " + identificacion)

        return guardar(identificacion, body);
    }

    actualizar = async (identificacion: string) => {
        console.log("Inicia metodo: actualizar - " + identificacion)

        return actualizar(identificacion);
    }
}
