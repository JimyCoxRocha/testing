import SesionCacheService from "./SesionCacheService";

export class PostProcesadoresService {


    async ejecutarPostProcesadorParametrizada(transaccion: string, serviceResponse: any, clientRequest: any){
        console.log("Estos parámetros están llegando => ", JSON.stringify({ transaccion, serviceResponse, clientRequest }));
        
        if(!transaccion)
            return;

        const transacciones = {
            "registrodispositivo": () => this.registroDispositivoPostProcesador(serviceResponse, clientRequest)
        }

        await transacciones[transaccion as keyof typeof transacciones]();
    }

    private async registroDispositivoPostProcesador(serviceResponse: any, clientRequest: any){
        try{
            console.log("registroDispositivoPostProcesador: ", JSON.stringify(serviceResponse));
            if (clientRequest.cliente.identificacion !== undefined && (serviceResponse.codigoError === 0 || serviceResponse.codigoError === "0")) {
                const sesionCache = new SesionCacheService();
                await sesionCache.actualizar(clientRequest.cliente.identificacion);
            }
        }catch(err: any){
            console.log("Ocurrió este error con el post procesador de registro de dispositivo: ", JSON.stringify(err))
        }
    }

} 