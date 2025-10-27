import { SesionUsuarioRepository } from "../repository/SesionUsuarioRepository";
import { FraudeException } from "../errors/FraudeException";

export class AutorizacionService {

    /**
     * Validar que el clientId existe en DynamoDB - Igual que en el proyecto principal
     */
    async existClientId(r2ClientId: string): Promise<void>{
        const sesionUsuarioRepo = new SesionUsuarioRepository();
        
        try {
            const sesionUsuario = await sesionUsuarioRepo.getSesionUnica(r2ClientId);
            
            if(!sesionUsuario.sesionValida){
                console.error(`Sesión no válida o expirada para clientId`);
                throw new FraudeException(9403, "Se detectó un posible fraude. La sesión no existe o ha expirado", "No hemos podido validar su información");
            }
            
            console.log("Sesión validada exitosamente en DynamoDB");
        } catch (error) {
            if (error instanceof FraudeException) {
                throw error;
            }
            console.error("Error al validar sesión en DynamoDB:", error);
            throw new FraudeException(9500, "Error interno al validar la sesión", "No hemos podido validar su información");
        }
    }
} 