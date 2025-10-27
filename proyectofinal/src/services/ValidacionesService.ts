import { AutorizacionService } from "./AutorizacionService";
import { FraudeException } from "../errors/FraudeException";
import { IJwtPayload } from "../beans/general.interface";
import { Constants } from "../constant/Constants";
import { DiccionarioMensajes } from "../constant/response-dictionary";
import * as jwt from 'jsonwebtoken';
import { Util } from "../utils/utils";

export class ValidacionesService {

    /**
     * Validar que existe el clientId - Igual que en el proyecto principal
     */
    public static async existeClientId(header: any): Promise<void> {
        const authService = new AutorizacionService();
        
        if(header.clientId == undefined || header.clientId == null || header.clientId.trim() == "") {
            throw new FraudeException(9403, "No se ha detectado un clientId válido o no existe", DiccionarioMensajes.msgErrorUsuarioGeneral);
        }

        const clientId = Util.unescapeString(header.clientId);
        console.log("ClientId unescape: ", clientId);

        // Validar clientID existe dentro de dynamo
        await authService.existClientId(clientId);
    }

    /**
     * Validar identificación - Versión actualizada del proyecto principal
     */
    public static async validarIdentificacion(header: any): Promise<void> {
        // CAMBIO IMPORTANTE: Ahora usa variable de entorno por defecto "SI"
        const validarIdentificacionPeticion = process.env.VALIDAR_IDENTIFICACION_PETICION || "SI";
        const headerIdentificacion = header.identificacion;
        const clientId = header.clientId;

        // Si no hay clientId, no podemos validar
        if (!clientId) {
            return;
        }

        try {
            // Decodificar el JWT para obtener la identificación del payload
            const decodedPayload = jwt.decode(Util.unescapeString(clientId)) as IJwtPayload;
            const payloadIdentificacion = decodedPayload?.identificacion;

            // Caso 1: No llega el header identificación
            if (!headerIdentificacion || headerIdentificacion.trim() === "") {
                if (validarIdentificacionPeticion === "SI") {
                    // CAMBIO: Usa las nuevas constantes de mensaje
                    throw new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
                }
                // Si es "NO", simplemente deja pasar
                return;
            }

            // Caso 2: Sí llega el header identificación
            if (headerIdentificacion && payloadIdentificacion) {
                if (headerIdentificacion !== payloadIdentificacion) {
                    // CAMBIO: Usa las nuevas constantes de mensaje
                    throw new FraudeException(Constants.CODIGO_ERROR_VALIDACION, Constants.MSG_INFORMACION_INCONSISTENTE, DiccionarioMensajes.msgErrorUsuarioGeneral);
                }
            }

            console.log("Validación de identificación exitosa");

        } catch (error) {
            if (error instanceof FraudeException) {
                throw error;
            }
            console.error("Error al validar identificación:", error);
            // Si hay error al decodificar el JWT, solo falla si la validación está habilitada
            if (validarIdentificacionPeticion === "SI") {
                throw new FraudeException(Constants.CODIGO_ERROR_VALIDACION, "Error al validar la identificación", DiccionarioMensajes.msgErrorUsuarioGeneral);
            }
        }
    }

    /**
     * Validar que existe referencia y hash - Igual que en el proyecto principal
     */
    public static async existeReferenciaHash(header: any): Promise<void> {
        if(header.referenciaRes == undefined || header.referenciaRes == null || header.referenciaRes.trim() == "") {
            throw new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral);
        }
        
        if(header.hash == undefined || header.hash == null || header.hash.trim() == "") {
            throw new FraudeException(403, "No se ha detectado la referencia", DiccionarioMensajes.msgErrorUsuarioGeneral);
        }
    }
} 