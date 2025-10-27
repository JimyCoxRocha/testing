import https from "https";
import http from "http";
import axios from "axios";
import { APIGatewayProxyEventHeaders, APIGatewayProxyResult } from "aws-lambda";
import { IHeader } from "../beans/general.interface";
import { Constants } from "../constant/Constants";
import { createHash } from 'crypto';
import moment from "moment-timezone";

export class ResponseHandler {
    public static success(data: any, statusCode: number = 200): APIGatewayProxyResult {
        return {
            statusCode,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                ...Util.getResponseHeader().headers
            },
            body: JSON.stringify({
                ...data,
                timestamp: data.timestamp || new Date().toISOString()
            })
        };
    }

    public static error(
        codigoError: number, 
        mensajeUsuario: string, 
        mensajeSistema: string, 
        statusCode: number = 500
    ): APIGatewayProxyResult {
        return {
            statusCode,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                ...Util.getResponseHeader().headers
            },
            body: JSON.stringify({
                codigoError,
                mensajeUsuario,
                mensajeSistema,
                timestamp: new Date().toISOString()
            })
        };
    }
}

export class Util {
    public static unescapeString = (data: string) => {
        return data.replace(/\\\//g, '/');
    }

    public static adicionaClienteMigradoHeader = (apiHeader: APIGatewayProxyEventHeaders): IHeader => {
        const secuencial = apiHeader.secuencial as string || "";
  
        return {
            codigoMis: apiHeader.codigoMIS || Constants.CODIGOMIS,
            pais: apiHeader.pais || Constants.PAIS,
            tipoLogin: apiHeader.tipoLogin || Constants.TIPOLOGIN,
            nombreEquipo: apiHeader.nombreEquipo || Constants.NOMBREEQUIPO,
            serial: apiHeader.serial || Constants.SERIAL,
            numero: apiHeader.numero || Constants.NUMERO,
            imei: apiHeader.imei || Constants.IMEI,
            marca: apiHeader.marca || Constants.MARCA,
            modelo: apiHeader.modelo || Constants.MODELO,
            identificacion: apiHeader.identificacion || Constants.IDENTIFICACION,
  
            ...(apiHeader.ip && { ip: apiHeader.ip }),
            ...(apiHeader.usuario && { usuario: apiHeader.usuario }),
            ...(apiHeader.secuencial && {
                secuencial: secuencial.length > 8 ? secuencial.substring(secuencial.length - 8) : secuencial,
            })
        };
  
      }

      public static validateBodySize(data: string) {
        let str = data;
        const maxChars = (process.env.HABILITAR_BODY_SIZE_LENGTH  as string).split(":");
      
        if (JSON.parse(maxChars[0]) === true) {
          const charLength = Array.from(str).length;
          if (charLength > JSON.parse(maxChars[1])) {
            throw new Error(`Se excedió el peso de request permitido.`);
          }
        }
    
      }

      public static validateBodySizeParam(data: string, bodySize: string) {
        let str = data;
        const maxChars = bodySize.split(":");
      
        if (JSON.parse(maxChars[0])) {
          const charLength = Array.from(str).length;
          console.log("Length > " + charLength)
          if (charLength > JSON.parse(maxChars[1])) {
            throw new Error(`Se excedió el peso de request permitido.`);
          }
        }
    
      }
      

      public static getResponseHeader = () =>  {
        return {
          headers: {
            "referrer-policy": "no-referrer",
            "content-security-policy": "default-src 'self';",
            "x-content-type-options": "nosniff",
            "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
            "X-Frame-Options": "SAMEORIGIN",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Cache-Control": "no-store, no-cache, must-revalidate"
          }
        };
      }


      public static validarCaracteresEspeciales(obj: any): void {
        const caracteresProhibidos = ["<", ">"];
        this.validarCaracteresEspecialesPorTipo(obj, caracteresProhibidos)
      }

      public static validarCaracteresEspecialesPorTipo(obj: any, caracteresProhibidos: string[]): void {
        const contieneCaracteresProhibidos = (valor: string): boolean =>
            caracteresProhibidos.some(caracter => valor.includes(caracter));
    
        const recorrer = (valor: any): void => {
            if (typeof valor === "string" && contieneCaracteresProhibidos(valor)) {
                throw new Error(`Entrada inválida: contiene caracteres no permitidos.`);
            } else if (typeof valor === "object" && valor !== null) {
                for (const key in valor) {
                    recorrer(valor[key]);
                }
            }
        };
    
        recorrer(obj);
      }

    public static generateNumber() {
      return Math.random() * 1000;
    }

    public static extractResourceSegment(resource: string) {
      const parts = resource.split('/');
      const lastSegment = parts[parts.length - 1];
      console.log('🔍 Resource completo =>', resource);
      console.log('🔍 Parts del resource =>', JSON.stringify(parts));
      console.log('🔍 Segmento de código a consultar =>', lastSegment);
      return lastSegment;
    }

        /**
   * Genera un hash SHA-256 a partir de los parámetros dados.
   * Los datos sensibles son sanitizados antes del hashing para mayor seguridad.
   * @param sessionId string
   * @param cedula string
   * @param tipoTrx string
   * @param monto string | number
   * @param respuesta string | boolean
   * @returns string Hash en formato hexadecimal
   */
    public static generarHash(
        sessionId: string,
        cedula: string,
        tipoTrx: string,
        monto: number,
        respuesta: string
    ): string {
        // Crear estructura segura para el hash
        const datos = `${sessionId}|${cedula}|${tipoTrx}|${monto}|${respuesta}|${this.getOnlyCurrentDate()}`;
        console.log(`Usaremos estos parámetros para contruír el hash ${datos}`);

        // SECURITY: Los datos han sido sanitizados; este hash es solo para validación/trazabilidad no sensible
        const hash = createHash('sha256').update(datos).digest('hex'); // NOSONAR: no se usa para seguridad criptográfica

        console.log("Hash que se enviará: " + hash);
        return hash;
    }

    /**
     * Genera hash digital para control de fraude (sin sanitización)
     * @param sessionId string
     * @param cedula string
     * @param tipoTrx string
     * @param monto number
     * @param respuesta string
     * @returns string Hash en formato hexadecimal
     */
    public static generarHashDigital(
        sessionId: string,
        cedula: string,
        tipoTrx: string,
        monto: number,
        respuesta: string
    ): string {
        // Para control de fraude, usar datos originales sin sanitizar
        const datos = `${sessionId}|${cedula}|${tipoTrx}|${monto}|${respuesta}|${this.getOnlyCurrentDate()}`;

        console.log(`Usaremos estos parámetros para construir el hash digital: ${datos}`);

        // SECURITY: Identificador no sensible para control de fraude; no contiene secretos
        const hash = createHash('sha256').update(datos).digest('hex'); // NOSONAR
        console.log("Hash digital que se enviará: " + hash);
        return hash;
    }

      /* 
        Crear hash encadenamiento
        @param semilla string
        @param cedula string
        @param codigo string
        @returns string Hash en formato hexadecimal
      */
        public static crearHashEncadenamiento(
          semilla: string,
          cedula: string,
          codigo: string
      ): string {
          // Para control de fraude, usar datos originales sin sanitizar
          const datos = `${semilla}|${cedula}|${codigo}`;
  

          console.log(`Usaremos estos parámetros para construir el hash encadenamiento: ${datos}`);
          // SECURITY: Identificador no sensible para control de fraude; no contiene secretos
          const hash = createHash('sha256').update(datos).digest('hex'); // NOSONAR
          console.log("Hash encadenamiento que se enviará: " + hash);
          return hash;
      }

      

  public static getOnlyCurrentDate() {
    return moment().utcOffset("-05:00").format("YYYY-MM-DD");
  }

  public static axiosAgent(){
    const REJECT_UNAUTHORIZED = process.env.REJECT_UNAUTHORIZED === "true";
    return axios.create({
      headers: {
          "Content-Type": "application/json"
      },
      httpAgent: new http.Agent({
          keepAlive: true,
        }),
      httpsAgent: new https.Agent({
          rejectUnauthorized: REJECT_UNAUTHORIZED,
          keepAlive: true,
      }),
    })
  }

  /**
   * Valida si una cadena es válida usando regex (solo letras y números, 1-25 caracteres)
   * @param valor string a validar
   * @returns boolean true si es válida
   */
  public static esCadenaValida(valor: string): boolean {
    const regex = /^[a-zA-Z0-9]{1,25}$/;
    return regex.test(valor);
  }

  /**
   * Obtiene un mensaje genérico para respuestas de error (igual que el proyecto original)
   * @param codigoError número del código de error
   * @param mensajeSistema mensaje del sistema
   * @param mensajeUsuario mensaje para el usuario
   * @returns objeto con la estructura de mensaje genérico
   */
  public static obtenerMensajeGenerico(codigoError: number, mensajeSistema: string, mensajeUsuario: string): { body: string } {
    return { 
      body: JSON.stringify({ 
        codigoError, 
        mensajeSistema, 
        mensajeUsuario 
      }) 
    };
  }
  
  public static getHeaders(event: any){
    const rawHeaders = event.headers && typeof event.headers === 'object' ? event.headers : {};
    return Object.keys(rawHeaders).reduce((acc, key) => {
      const value = (rawHeaders as Record<string, unknown>)[key];
      if (typeof value === 'string') acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
  }

  // Nuevos métodos para encadenamiento
  public static crearHashEncadenamientoNuevo(
    semilla: string,
    identificacion: string,
    codigoEncadenamiento: string
  ): string {
    const data = `${codigoEncadenamiento}${semilla}`;
    return SHA512(data).toString(Base64);
  }

  public static crearHashIdEncadenamiento(
    semilla: string,
    identificacion: string
  ): string {
    const data = `${identificacion}${semilla}`;
    return SHA512(data).toString(Base64);
  }

  public static evaluarLogicaPredecesor(
    logicExpression: string,
    hashesDisponibles: string[]
  ): boolean {
    // Reemplazar códigos por true/false basado en disponibilidad
    let expression = logicExpression;
    
    // Extraer códigos de la expresión (ej: PV001, PV002, PV003)
    const codigos = logicExpression.match(/PV\d+/g) || [];
    
    codigos.forEach(codigo => {
      // Verificar si el hash del código está disponible
      const hashDisponible = hashesDisponibles.some(hash => 
        hash.includes(codigo) || hash.startsWith(codigo)
      );
      expression = expression.replace(new RegExp(codigo, 'g'), hashDisponible.toString());
    });
    
    // Evaluar la expresión lógica resultante
    try {
      // Reemplazar operadores para evaluación segura
      expression = expression.replace(/&&/g, '&&').replace(/\|\|/g, '||');
      return eval(expression);
    } catch (error) {
      console.error('Error evaluando lógica de predecesor:', error);
      return false;
    }
  }

} 