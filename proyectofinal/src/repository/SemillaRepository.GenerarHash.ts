import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { IntegrationException } from '../errors/IntegrationException';
import { DiccionarioMensajes } from '../constant/response-dictionary';

const client = new SecretsManagerClient({ region: process.env.region });

export class SemillaRepository {
  async obtenerSemilla(): Promise<string> {
    try {
      const response = await client.send(new GetSecretValueCommand({
        SecretId: process.env.SECRET_NAME,
        VersionStage: 'AWSCURRENT'
      }));
      const secret = JSON.parse(response.SecretString || '{}');
      return secret['semilla_seguridad_wap'];
    } catch (err: any) {
      console.log('Se presentó un problema al obtener la semilla: ', err);
      throw new IntegrationException(9991, err.message, DiccionarioMensajes.mensajeGenerico);
    }
  }
}
