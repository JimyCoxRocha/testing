

import { SFNClient, StartSyncExecutionCommand } from "@aws-sdk/client-sfn";
import { IHeader, IMensajeGenerico } from "../beans/general.interface";


export default class PeticionesService {


    async llamarServicioIniciarSesionStf(body: string, valueHeader: IHeader) {
        let result;

        const arnIniciarSesion = process.env.ARN_INICIARSESION as string;
        let wsResponse = {} as IMensajeGenerico;


        try {
            const client = new SFNClient();

            const startSyncCommand = new StartSyncExecutionCommand({
                stateMachineArn: arnIniciarSesion,
                input: JSON.stringify({
                    body: JSON.parse(body),
                    headers: valueHeader
                })
            });

            const startResponse = await client.send(startSyncCommand);
            console.log("startResponse: ", startResponse);

            // El resultado final estará en 'startResponse.output'
            result = startResponse.output ? JSON.parse(startResponse.output) : {};
            console.log("Resultado del Step Function: ", JSON.stringify(result));
            
        } catch (err: any) {
            console.log("Ocurrió un error al levantar el step function: ", err);
            
        }


        console.log("RESPONSE LAMBDA => ", JSON.stringify(result));
        wsResponse = JSON.parse(result);

        return wsResponse;
    }



}