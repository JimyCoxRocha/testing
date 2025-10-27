import { Util } from '../utils/utils';
import { HashUsuarioRepository } from '../repository/HashUsuarioRepository';
import { SemillaRepository } from '../repository/SemillaRepository.GenerarHash';
import { FraudeException } from '../errors/FraudeException';
import Base64 from 'crypto-js/enc-base64';
import { HmacSHA512 } from 'crypto-js';

export class GenerarHashService {
  async generar(headers: Record<string, string>, referenciaRes: string) {
    
    const hash = await this.generarOnlyHash(headers, referenciaRes);

    const tableName = process.env.TABLA_HASH_USUARIO_NAME as string;
    const hashRepo = new HashUsuarioRepository();
    const minutos = Number(process.env.DURACION_HASH_USUARIO);
    if (!Number.isFinite(minutos) || minutos <= 0) {
      throw new FraudeException(9400, 'DURACION_HASH_USUARIO inválido o no definido', 'Configuración inválida');
    }
    await hashRepo.guardarHashEnTabla(hash, minutos, tableName);

    return { referencia: referenciaRes, hash };
  }


  async guardarEnTabla(tableName: string, hash: string): Promise<void> {
    const hashRepo = new HashUsuarioRepository();
    const minutos = Number(process.env.DURACION_HASH_USUARIO);
    await hashRepo.guardarHashEnTabla(hash, minutos, tableName);
  }



  async generarOnlyHash(headers: Record<string, string>, texto: string) {
    
    const clientId = Util.unescapeString(headers.clientId);

    console.log("clientId que se usará: " + JSON.stringify(clientId));
    const semillaRepo = new SemillaRepository();
    const semilla = await semillaRepo.obtenerSemilla();

    console.log("DATA: " + JSON.stringify({semilla, texto, clientId}));
    return Base64.stringify(HmacSHA512(JSON.stringify({
            r1: texto,
            r2: clientId
        }), semilla));
  }

}
