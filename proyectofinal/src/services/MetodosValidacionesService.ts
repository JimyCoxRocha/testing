import { APIGatewayProxyEventHeaders } from "aws-lambda";
import { ITransferenciaInput, IValidacionRequest } from "../beans/general.interface";
import { HashUsuarioRepository } from "../repository/HashUsuarioRepository";
import { Util } from "../utils/utils";
import { Constants } from "../constant/Constants";
import { ValidacionCacheLoginService } from "./ValidacionCacheLoginService";


export class MetodosValidacionesService {

    /* Validaciones para EjecutarTransferencias */

    async validarTransferencias(body: ITransferenciaInput, header: APIGatewayProxyEventHeaders){
        const response = await this.transferenciaValidarDigital(body, header);
        if(!response.puedeContinuar) return response;
        
        const bodySizeLimit = process.env.BODY_SIZE_LIMIT_TRANSFERENCIA as string;
        const identificacion = header.identificacion as string;

        try{
            Util.validarCaracteresEspeciales({...body, ...header});

            const cacheLoginValidator = new ValidacionCacheLoginService();
            // Validación cache login (cabecera identificacion)
            await cacheLoginValidator.validar(header);

            console.log(`Validaremos el siguiente uritech: ${body.uriTechCodigoUsuario} con la cédula: ${identificacion}`);

            if(body.uriTechCodigoUsuario.indexOf(identificacion) < 0)
                throw new Error(`Los datos de la solicitud no concuerdan.`);
        
            Util.validateBodySizeParam(JSON.stringify(body), bodySizeLimit)

            
        }catch(err: any){
            return {
                bodyResponse: {
                    codigoError: err.codigoError || Constants.CODIGO_ERROR_GENERAL,
                    mensajeUsuario: Constants.MSG_ERROR_USUARIO_GENERAL,
                    mensajeSistema: err.message
                }, 
                puedeContinuar: false
            }
        }

        return { puedeContinuar: true }
    }

    
    private async transferenciaValidarDigital(transferenciaInput: ITransferenciaInput, header: APIGatewayProxyEventHeaders): Promise<IValidacionRequest> {
  
        const APROBADO = 'APROBADO';
        const RETO = 'RETO';
        let puedeContinuar = false;
        const respuestaOk = { puedeContinuar: true };
        
        console.log("Ingreso para la validación: " + JSON.stringify(transferenciaInput) + " - " + JSON.stringify(header) );
        if(!JSON.parse(process.env.VALIDAR_DIGITAL as string)){
            return respuestaOk;
        }

        const sessionId = header.session as string;
        const identificacion = header.identificacion as string;
        const monto = Number(transferenciaInput.montoDestino);
        const tipoTransferencia = transferenciaInput.tipo;
        const tipoBanco = transferenciaInput.nombreBancoDestino;
        const tableNameHashDigital = process.env.TABLA_HASH_DIGITAL_NAME as string;
        
        // Extract nested ternary operation into independent statements
        let tipoTrx = "20273"; // default value
        if (this.esTransferenciaPropia(transferenciaInput, tipoBanco.toUpperCase())) {
            tipoTrx = "2030";
        } else if (tipoBanco.toUpperCase().includes("BOLIVARIANO")) {
            tipoTrx = "20271";
        } else if (tipoTransferencia.toUpperCase() === "SPI") {
            tipoTrx = "20272";
        }


        const hashUsuarioRepo = new HashUsuarioRepository();

        const hashDigital = Util.generarHash(sessionId, identificacion, tipoTrx, monto, APROBADO);
        console.log("hashDigital: " + hashDigital);
        
        puedeContinuar = (await hashUsuarioRepo.existeDigitalHash(hashDigital)).existe;
        console.log("puedeContinuar: " + puedeContinuar);

        if(JSON.parse(process.env.VALIDAR_RETO as string) && !puedeContinuar)
            puedeContinuar = (await hashUsuarioRepo.existeDigitalHash(Util.generarHash(sessionId, identificacion, tipoTrx, monto, RETO))).existe;

        if(!puedeContinuar) {
            return {
                bodyResponse: {
                    codigoError: 3911,
                    mensajeUsuario: process.env.MSG_ERROR_FRAUDE as string,
                    mensajeSistema: "Existió un control que evitó la finalización satisfactoria de esta transacción"
                }, 
                puedeContinuar: false
            }
        }


        // En este punto se borra el hash en dynamodb
        await hashUsuarioRepo.deleteItemByTableName(hashDigital, tableNameHashDigital);

        return respuestaOk;
    }

    private esTransferenciaPropia(transferenciaInput: ITransferenciaInput, tipoBanco: string){
        if((transferenciaInput.identificacionBeneficiario?.identificacion?.trim() === transferenciaInput.identificacionCliente?.identificacion?.trim()) 
            && tipoBanco.toUpperCase().includes("BOLIVARIANO"))
            return true;
        
        return false;
    }

} 