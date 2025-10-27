import axios from 'axios';
import { FraudeException, IntegrationException } from '../errors';

export class ValidacionCacheLoginService {
  public async validar(headers: Record<string, any>): Promise<void> {
    // Siempre habilitado (igual que el proyecto original que no tiene esta validación)

    const identificacion = headers?.identificacion;

    const key = `CACHE_LOGIN-${identificacion.trim()}`;
    const urlBase = process.env.BB_BASE_URL as string;
    const url = `${urlBase}/v1/cache/obtener`;

    try {
      console.log('🔎 CacheLogin → request', JSON.stringify({ url, params: { key } }));
      const response = await axios.get(url, {
        params: { key },
        timeout: 10000,
        validateStatus: (status) => status < 500
      });
      console.log('🔎 CacheLogin → status', response?.status);

      if (!response || !response.data) {
        throw new IntegrationException(9501, 'Respuesta inválida del cache', 'Body vacío');
      }

      const data = response.data as Record<string, any>;
      console.log('🔎 CacheLogin → raw keys', JSON.stringify({
        codigoError: data?.codigoError,
        hasKey: !!data?.key,
        valueType: typeof data?.value,
        valueLen: typeof data?.value === 'string' ? data?.value.length : undefined
      }));

      // El payload real viene en data.value (string JSON)
      const rawValue = data.value;
      if (!rawValue || typeof rawValue !== 'string') {
        throw new IntegrationException(9501, 'Respuesta inválida del cache', 'value ausente o no string');
      }

      let parsed: Record<string, any>;
      try {
        parsed = JSON.parse(rawValue);
      } catch (e: any) {
        throw new IntegrationException(9501, 'Respuesta inválida del cache', 'value no es JSON válido');
      }

      const tieneDispositivo = parsed.tieneDispositivo;
      const tieneEntrust = parsed.tieneEntrust;
      console.log('🔎 CacheLogin → parsed flags', JSON.stringify({ tieneDispositivo, tieneEntrust }));

      if (tieneDispositivo === undefined || tieneEntrust === undefined) {
        throw new FraudeException(9410, 'Validación de seguridad no disponible', 'Campos requeridos ausentes en cache');
      }

      const toBool = (v: any) => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') return v.toLowerCase() === 'true';
        return false;
      };

      if (!toBool(tieneDispositivo) || !toBool(tieneEntrust)) {
        console.warn('⚠️ CacheLogin → flags invalid', JSON.stringify({
          tieneDispositivo,
          tieneEntrust,
          toBoolDispositivo: toBool(tieneDispositivo),
          toBoolEntrust: toBool(tieneEntrust)
        }));
        throw new FraudeException(9411, 'Por favor, acércate a una agencia', 'Dispositivo o Entrust no habilitados');
      }

    } catch (error: any) {
      if (error instanceof FraudeException || error instanceof IntegrationException) {
        throw error;
      }
      if (error?.code === 'ECONNABORTED' || error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
        throw new IntegrationException(9502, 'Error consultando cache', `Fallo de conexión: ${error.message}`);
      }
      throw new IntegrationException(9503, 'Error consultando cache', error instanceof Error ? error.message : 'Error desconocido');
    }
  }
}


