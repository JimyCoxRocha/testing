import { APIGatewayProxyEventHeaders } from "aws-lambda";

export enum ACCION_FLUJO {
  TRANSFERENCIA = "TRANSFERENCIA",
  CONSULTA_SALDO = "CONSULTA_SALDO", 
  PAGO_SERVICIOS = "PAGO_SERVICIOS",
  AFILIACION = "AFILIACION",
  DESAFILIACION = "DESAFILIACION",
  CAMBIO_CLAVE = "CAMBIO_CLAVE",
  VALIDACION_OTP = "VALIDACION_OTP",
  GENERAR_OTP = "GENERAR_OTP"
}

export interface IAccionConfig {
  accion: ACCION_FLUJO;
  urlServicio: string;
  acciones: string[];
  validarHash?: boolean;
  llamarServicioUrl?: boolean;
  borrarHash?: boolean;
  crearClientId?: boolean;
  validarClientId?: boolean;
  requiereAutorizacion?: boolean;
}

export interface IFlowResponse {
  accion: ACCION_FLUJO;
  configuracion: IAccionConfig;
  nextSteps: string[];
  shouldContinue: boolean;
}

export default class ConfiguracionFlujoService {

  private static readonly CONFIGURACIONES: Map<ACCION_FLUJO, IAccionConfig> = new Map([
    [ACCION_FLUJO.TRANSFERENCIA, {
      accion: ACCION_FLUJO.TRANSFERENCIA,
      // URL específica del servicio de transferencia
      urlServicio: process.env.URL_SERVICIO_TRANSFERENCIA || "http://NLB-API-PRD-33c0193af8356ff1.elb.us-east-1.amazonaws.com:9004/cuentaPY/ejecutarTransferencia",
      acciones: ["validarHash", "llamarServicioUrl", "borrarHash", "crearClientId"],
      validarHash: true,
      llamarServicioUrl: true,
      borrarHash: true,
      crearClientId: true,
      requiereAutorizacion: true
    }],
    [ACCION_FLUJO.CONSULTA_SALDO, {
      accion: ACCION_FLUJO.CONSULTA_SALDO,
      urlServicio: process.env.URL_SERVICIO_CONSULTA || "https://api-py.bancobolivariano.com/consulta-saldo",
      acciones: ["validarClientId", "llamarServicioUrl"],
      validarClientId: true,
      llamarServicioUrl: true,
      requiereAutorizacion: true
    }],
    [ACCION_FLUJO.PAGO_SERVICIOS, {
      accion: ACCION_FLUJO.PAGO_SERVICIOS,
      urlServicio: process.env.URL_SERVICIO_PAGOS || "https://api-py.bancobolivariano.com/pago-servicios",
      acciones: ["validarHash", "llamarServicioUrl", "borrarHash", "crearClientId"],
      validarHash: true,
      llamarServicioUrl: true,
      borrarHash: true,
      crearClientId: true,
      requiereAutorizacion: true
    }],
    [ACCION_FLUJO.AFILIACION, {
      accion: ACCION_FLUJO.AFILIACION,
      urlServicio: process.env.URL_SERVICIO_AFILIACION || "https://api-py.bancobolivariano.com/afiliacion",
      acciones: ["validarClientId", "llamarServicioUrl"],
      validarClientId: true,
      llamarServicioUrl: true,
      requiereAutorizacion: true
    }],
    [ACCION_FLUJO.VALIDACION_OTP, {
      accion: ACCION_FLUJO.VALIDACION_OTP,
      urlServicio: process.env.URL_SERVICIO_OTP || "https://24movildesa.cuentafuturo.com/seguridad/validarotpid",
      acciones: ["validarHash", "llamarServicioUrl", "borrarHash"],
      validarHash: true,
      llamarServicioUrl: true,
      borrarHash: true,
      requiereAutorizacion: false
    }],
    [ACCION_FLUJO.GENERAR_OTP, {
      accion: ACCION_FLUJO.GENERAR_OTP,
      urlServicio: process.env.URL_SERVICIO_GENERAR_OTP || "https://api-py.bancobolivariano.com/generar-otp",
      acciones: ["llamarServicioUrl", "crearClientId"],
      llamarServicioUrl: true,
      crearClientId: true,
      requiereAutorizacion: false
    }]
  ]);

  public determinarAccion(resource: string): ACCION_FLUJO {
    console.log(`Determinando acción para resource: ${resource}`);
    
    const parts = resource.split('/');
    const lastSegment = parts[parts.length - 1].toLowerCase();
    
    console.log(`Último segmento extraído: ${lastSegment}`);

    // Mapeo de segmentos a acciones
    const accionMap = new Map<string, ACCION_FLUJO>([
      ["transferencia", ACCION_FLUJO.TRANSFERENCIA],
      ["ejecutartransferencia", ACCION_FLUJO.TRANSFERENCIA],
      ["consultasaldo", ACCION_FLUJO.CONSULTA_SALDO],
      ["obtenersaldo", ACCION_FLUJO.CONSULTA_SALDO],
      ["pagoservicios", ACCION_FLUJO.PAGO_SERVICIOS],
      ["pagos", ACCION_FLUJO.PAGO_SERVICIOS],
      ["afiliacion", ACCION_FLUJO.AFILIACION],
      ["afiliar", ACCION_FLUJO.AFILIACION],
      ["desafiliacion", ACCION_FLUJO.DESAFILIACION],
      ["desafiliar", ACCION_FLUJO.DESAFILIACION],
      ["cambiarclave", ACCION_FLUJO.CAMBIO_CLAVE],
      ["validarotp", ACCION_FLUJO.VALIDACION_OTP],
      ["generarotp", ACCION_FLUJO.GENERAR_OTP]
    ]);

    const accion = accionMap.get(lastSegment);
    
    if (accion) {
      console.log(`Acción determinada: ${accion}`);
      return accion;
    }

    // Fallback para transferencia si no se encuentra
    console.log(`No se encontró mapeo específico, usando TRANSFERENCIA como default`);
    return ACCION_FLUJO.TRANSFERENCIA;
  }

  public obtenerConfiguracion(accion: ACCION_FLUJO): IAccionConfig {
    const config = ConfiguracionFlujoService.CONFIGURACIONES.get(accion);
    
    if (!config) {
      console.warn(`No se encontró configuración para acción: ${accion}, usando TRANSFERENCIA como default`);
      return ConfiguracionFlujoService.CONFIGURACIONES.get(ACCION_FLUJO.TRANSFERENCIA)!;
    }

    console.log(`Configuración obtenida para ${accion}:`, JSON.stringify(config));
    return config;
  }

  public async procesarFlujo(
    body: string, 
    headers: APIGatewayProxyEventHeaders | null, 
    resource: string
  ): Promise<IFlowResponse> {
    try {
      console.log('=== INICIO PROCESAMIENTO FLUJO ===');
      console.log(`Resource: ${resource}`);
      console.log(`Body: ${body}`);
      console.log(`Headers: ${JSON.stringify(headers)}`);

      // 1. Determinar acción basada en resource
      const accion = this.determinarAccion(resource);
      
      // 2. Obtener configuración para la acción
      const configuracion = this.obtenerConfiguracion(accion);
      
      
      // No es requerido (la lógica de negocio debe estar limitada a el backend)
      // 3. Validar datos de entrada según la configuración
      //const requestData = JSON.parse(body);
      // 4. Validaciones específicas por tipo de acción
      //await this.validarDatosSegunAccion(accion, requestData, headers);
      
      // 5. Determinar próximos pasos
      const nextSteps = this.determinarProximosPasos(configuracion);
      
      const response: IFlowResponse = {
        accion,
        configuracion,
        nextSteps,
        shouldContinue: true
      };

      console.log('=== RESPUESTA FLUJO ===');
      console.log(JSON.stringify(response, null, 2));
      
      return response;

    } catch (error) {
      console.error('Error en procesarFlujo:', error);
      throw error;
    }
  }

  private async validarDatosSegunAccion(
    accion: ACCION_FLUJO, 
    requestData: any, 
    headers: APIGatewayProxyEventHeaders | null
  ): Promise<void> {
    console.log(`Validando datos para acción: ${accion}`);

    switch (accion) {
      case ACCION_FLUJO.TRANSFERENCIA:
        this.validarDatosTransferencia(requestData);
        break;
      case ACCION_FLUJO.CONSULTA_SALDO:
        this.validarDatosConsulta(requestData);
        break;
      case ACCION_FLUJO.PAGO_SERVICIOS:
        this.validarDatosPagos(requestData);
        break;
      case ACCION_FLUJO.AFILIACION:
        this.validarDatosAfiliacion(requestData);
        break;
      default:
        console.log(`Validación genérica para acción: ${accion}`);
        break;
    }
  }

  private validarDatosTransferencia(data: any): void {
    const camposRequeridos = ['monto', 'cuentaOrigen', 'cuentaDestino', 'concepto'];
    for (const campo of camposRequeridos) {
      if (!data[campo]) {
        throw new Error(`Campo obligatorio faltante para transferencia: ${campo}`);
      }
    }
    
    if (data.monto <= 0) {
      throw new Error('El monto debe ser mayor a cero');
    }
  }

  private validarDatosConsulta(data: any): void {
    if (!data.numeroCuenta) {
      throw new Error('Número de cuenta requerido para consulta');
    }
  }

  private validarDatosPagos(data: any): void {
    const camposRequeridos = ['monto', 'empresa', 'referencia'];
    for (const campo of camposRequeridos) {
      if (!data[campo]) {
        throw new Error(`Campo obligatorio faltante para pago: ${campo}`);
      }
    }
  }

  private validarDatosAfiliacion(data: any): void {
    const camposRequeridos = ['telefono', 'email', 'tipoDocumento', 'numeroDocumento'];
    for (const campo of camposRequeridos) {
      if (!data[campo]) {
        throw new Error(`Campo obligatorio faltante para afiliación: ${campo}`);
      }
    }
  }

  private determinarProximosPasos(configuracion: IAccionConfig): string[] {
    const pasos: string[] = [];
    
    if (configuracion.validarHash) {
      pasos.push("fnInterceptorValidarHash");
    }
    
    if (configuracion.validarClientId) {
      pasos.push("fnValidarClientId");
    }
    
    if (configuracion.llamarServicioUrl) {
      pasos.push("EjecutarServicioX");
    }
    
    if (configuracion.crearClientId) {
      pasos.push("fnAuthGenerarClientId");
    }
    
    if (configuracion.borrarHash) {
      pasos.push("fnInterceptorBorrarHash");
    }

    console.log(`Próximos pasos determinados: ${JSON.stringify(pasos)}`);
    return pasos;
  }

  public static obtenerUrlServicio(accion: ACCION_FLUJO): string {
    const config = ConfiguracionFlujoService.CONFIGURACIONES.get(accion);
    return config?.urlServicio || "";
  }
}
