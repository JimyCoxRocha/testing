import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { FraudeException } from '../errors/FraudeException';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import moment from 'moment';

const TABLE_SESION_USUARIO = process.env.TABLA_SESION_USUARIO as string;

export class ValidarClientIdService {
  private dynamo = new DynamoDBClient({});

  async existClientId(id: string): Promise<void> {
    const result: GetItemCommandOutput = await this.dynamo.send(new GetItemCommand({
      TableName: TABLE_SESION_USUARIO,
      Key: { 'id': { S: id } }
    }));

    if (!result.Item) {
      throw new FraudeException(9403, 'Sesión no válida o expirada', DiccionarioMensajes.mensajeGenericoFraude);
    }

    const storedMoment = moment(result.Item.expires_date?.S, DiccionarioMensajes.formatoFechaHora);
    const currentMoment = moment().subtract(5, 'hours');
    const isBefore = currentMoment.isBefore(storedMoment);

    if (!isBefore) {
      throw new FraudeException(9403, 'Sesión no válida o expirada', DiccionarioMensajes.mensajeGenericoFraude);
    }
  }
}
