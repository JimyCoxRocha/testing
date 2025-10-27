import { DynamoDBClient, GetItemCommand, DeleteItemCommand, GetItemCommandOutput, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { IHashUsuarioDb } from '../beans/general.interface';
import moment from 'moment';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import { deleteItem, getEstatusDigital } from '../datsource/dynamodb';
import { FraudeException } from '../errors';

// Usar la variable de entorno del SSM
const TABLE_HASH_USUARIO = process.env.TABLA_HASH_USUARIO_NAME as string;

export class HashUsuarioRepository {
    
    private dynamo = new DynamoDBClient({});

    async deleteHash(id: string): Promise<void> {
        
        try {
            const command = new DeleteItemCommand({
                TableName: TABLE_HASH_USUARIO,
                Key: { 'id': { S: id } }
            });
            await this.dynamo.send(command);
            console.log(`Hash eliminado exitosamente para id: ${id}`);
        } catch (error) {
            console.error('Error al eliminar hash:', error);
            throw error;
        }
    }

    async getHash(id: string, tableHash: string): Promise<IHashUsuarioDb | null> {
        
        try {
            console.log(`🔍 Hash a buscar: ${id}`);
            
            const command = new GetItemCommand({
                TableName: tableHash,
                Key: { 'id': { S: id } }
            });
            const result: GetItemCommandOutput = await this.dynamo.send(command);

            console.log(`🔍 Resultado de DynamoDB:`, JSON.stringify(result));

            if (!result.Item) {
                console.log('❌ Hash no encontrado en DynamoDB');
                return null;
            }

            console.log('✅ Hash encontrado en DynamoDB');

            // Mapear la estructura real de la tabla de hash (igual que el proyecto principal)
            return {
                id: result.Item.id?.S as string,
                hash: result.Item.id?.S as string, // El hash es el mismo que el ID
                expires_date: result.Item.expires_date?.S as string,
                referenciaRes: '', // No se guarda en la tabla de hash del proyecto principal
                sesionValida: true // Indicar que el hash es válido (igual que el proyecto principal)
            } as IHashUsuarioDb;
        } catch (error) {
            console.error('❌ Error al consultar hash:', error);
            return null;
        }
    }

  async guardarHashEnTabla(hash: string, duracionMinutos: number, tabla: string) {
    const expiresAt = Math.floor((Date.now() + duracionMinutos * 60 * 1000) / 1000);
    const expiresAtDate = moment().subtract(5, 'hours').add(duracionMinutos, 'minutes').format(DiccionarioMensajes.formatoFechaHora);

    const command = new PutItemCommand({
      TableName: tabla,
      Item: {
        'id': { S: hash },
        'expires_at': { N: `${expiresAt}` },
        'expires_date': { S: expiresAtDate },
        'fueusado': { S: 'NO_FUE_USADO' }
      }
    });

    await this.dynamo.send(command);
  }
  
  async borrar(hash: string, tableName: string): Promise<void> {
    console.log(`🔍 Eliminando hash: ${hash.substring(0, 10)}...`);
    
    // Validar que el hash no esté vacío
    if (!hash || hash.trim() === '') {
      throw new FraudeException(9400, 'Hash inválido para eliminación', 'Hash vacío');
    }

    // Validar que el hash tenga al menos 10 caracteres (base64 o hexadecimal)
    if (hash.length < 10) {
      throw new FraudeException(9401, 'Formato de hash inválido', 'Hash muy corto');
    }

    try {
      // Eliminar hash de DynamoDB
      const deleteCommand = new DeleteItemCommand({
        TableName: tableName,
        Key: {
          id: { S: hash.trim() }
        }
      });

      console.log(`🗑️ Ejecutando delete en DynamoDB para hash: ${hash.substring(0, 10)}...`);
      const result = await this.dynamo.send(deleteCommand);
      console.log(`✅ Hash eliminado exitosamente de DynamoDB`);
      console.log(`📊 Resultado DynamoDB:`, JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error(`❌ Error al eliminar hash de DynamoDB:`, error);
      throw new FraudeException(9402, 'Error al eliminar hash de la base de datos', 'Error de DynamoDB');
    }
  }
  

  async existeDigitalHash(hashDigital: string) {
    return getEstatusDigital(hashDigital, (process.env.TABLA_HASH_DIGITAL_NAME as string));
  }

  async deleteItemByTableName(id: string, tableName: string) {
      try{
          await deleteItem(id, tableName);
          return true;
      }catch(err: any){
          return false;
      }
  }
}
