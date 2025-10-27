import { DeleteItemCommand, DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import moment from 'moment';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import { IUsuarioSesionDb } from '../beans/general.interface';

// Usar la variable de entorno del SSM
const TABLE_SESION_USUARIO = process.env.TABLA_SESION_USUARIO as string;

export class SesionUsuarioRepository {
    dynamo = new DynamoDBClient({});
    
    async getSesionUnica(id: string): Promise<IUsuarioSesionDb> {
        
        try {
            const command = new GetItemCommand({
                TableName: TABLE_SESION_USUARIO,
                Key: { 'id': { S: id } }
            });
            const result: GetItemCommandOutput = await this.dynamo.send(command);


            console.log("resultado => " + JSON.stringify(result));
            if (!result.Item) {
                return { sesionValida: false } as IUsuarioSesionDb;
            }

            const storedMoment = moment(result.Item.expires_date?.S, DiccionarioMensajes.formatoFechaHora);
            const currentMoment = moment().subtract(5, 'hours');
            const isBefore = currentMoment.isBefore(storedMoment);

            return {
                sessionId: result.Item.sessionId?.S || '',
                token: result.Item.token?.S || '',
                uriTech: result.Item.uriTech?.S || '',
                id: result.Item.id?.S || '',
                expires_date: result.Item.expires_date?.S || '',
                sesionValida: isBefore
            };
        } catch (error) {
            console.error('Error al consultar sesión:', error);
            return { sesionValida: false } as IUsuarioSesionDb;
        }
    }

    async deleteItem(key: string, tableName: string): Promise<void> {
    
        const command = new DeleteItemCommand({
            "Key": {
            "id": {
                "S": key
            }
            },
            "TableName": tableName
        });
        
        await this.dynamo.send(command);
    }
} 