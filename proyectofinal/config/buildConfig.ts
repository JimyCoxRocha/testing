import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import yaml from 'js-yaml';

export class BuildConfig {
  private nameStackApplication: string;
  private stage: string = 'dev';

  constructor(nameStackApplication: string, stage: string) {
    this.nameStackApplication = nameStackApplication;
    this.stage = stage;
  }


  async getConfig(): Promise<{ [key: string]: string }> {
    try {
      const nameEnvironmentSsm = `/${this.nameStackApplication}/${this.stage}`;
      console.log(
        `### Getting config from SSM Parameter store with name: " +  ${nameEnvironmentSsm}`
      );
      const ssm = new SSMClient();
      const command = new GetParameterCommand({ Name: nameEnvironmentSsm });
      const ssmResponse = await ssm.send(command);
      if (!ssmResponse?.Parameter?.Value) {
        throw Error('No se obtuvo valor desde SSM ssmResponse.Parameter.value');
      }
      console.log('### ssmResponse.Parameter.value', ssmResponse);
      const unparsedEnv = yaml.load(ssmResponse.Parameter.Value) as {
        [name: string]: string;
      };
      console.log('### unparsedEnv', unparsedEnv);

      const buildConfigResponse = {
        STAGE: this.stage, // variable by defual, not remove it
        LAMBDA_TIMEOUT: this.ensureString(unparsedEnv, "LAMBDA_TIMEOUT"),
        VPC_LAMBDA_ID: this.ensureString(unparsedEnv, "VPC_LAMBDA_ID"),
        SUBNET_ID_01: this.ensureString(unparsedEnv, "SUBNET_ID_01"),
        SUBNET_ID_02: this.ensureString(unparsedEnv, "SUBNET_ID_02"),
        SUBNET_ID_03: this.ensureString(unparsedEnv, "SUBNET_ID_03"),
        SECURITY_GROUP_NAME: this.ensureString(unparsedEnv, "SECURITY_GROUP_NAME"),
        SECURITY_GROUP_ID: this.ensureString(unparsedEnv, "SECURITY_GROUP_ID"),
        SECRET_NAME: this.ensureString(unparsedEnv, "SECRET_NAME"),
        
        // Variables del proyecto principal - NOMBRES CORRECTOS DEL SSM
        DURACION_SESION: this.ensureString(unparsedEnv, "DURACION_SESION"),
        DURACION_HASH_USUARIO: this.ensureString(unparsedEnv, "DURACION_HASH_USUARIO"),
        
        // URLs específicas de servicios del SSM
        URL_SERVICIO_TRANSFERENCIA: this.ensureString(unparsedEnv, "URL_SERVICIO_TRANSFERENCIA"),

        //TODO: Verificar urls
        //URL_SERVICIO_CONSULTA: this.ensureString(unparsedEnv, "URL_SERVICIO_CONSULTA"),
        //URL_SERVICIO_PAGOS: this.ensureString(unparsedEnv, "URL_SERVICIO_PAGOS"),
        //URL_SERVICIO_AFILIACION: this.ensureString(unparsedEnv, "URL_SERVICIO_AFILIACION"),
        //URL_SERVICIO_OTP: this.ensureString(unparsedEnv, "URL_SERVICIO_OTP"),

        // Variables específicas del proyecto personal
        VALIDAR_IDENTIFICACION_PETICION: this.ensureString(unparsedEnv, "VALIDAR_IDENTIFICACION_PETICION"),
        LAMBDA_MEMORY_AUTORIZADOR: this.ensureString(unparsedEnv, "LAMBDA_MEMORY_AUTORIZADOR"),
        MEMORY_CLIENTID_LOGIN: this.ensureString(unparsedEnv, "MEMORY_CLIENTID_LOGIN"),
        ARN_INICIARSESION: this.ensureString(unparsedEnv, "ARN_INICIARSESION"),
        HABILITAR_BODY_SIZE_LENGTH: this.ensureString(unparsedEnv, "HABILITAR_BODY_SIZE_LENGTH"),
        
        // Variables para tablas DynamoDB (usando nombres del SSM)
        TABLA_SESION_USUARIO_NAME: this.ensureString(unparsedEnv, "TABLA_SESION_USUARIO_NAME"),
        TABLA_HASH_USUARIO_NAME: this.ensureString(unparsedEnv, "TABLA_HASH_USUARIO_NAME"),
        TABLA_SESION_USUARIO_ARN: this.ensureString(unparsedEnv, "TABLA_SESION_USUARIO_ARN"),
        TABLA_HASH_USUARIO_ARN: this.ensureString(unparsedEnv, "TABLA_HASH_USUARIO_ARN"),
        
        TABLA_HASH_DIGITAL_NAME: this.ensureString(unparsedEnv, "TABLA_HASH_DIGITAL_NAME"),
        VALIDAR_RETO: this.ensureString(unparsedEnv, "VALIDAR_RETO"),
        VALIDAR_DIGITAL: this.ensureString(unparsedEnv, "VALIDAR_DIGITAL"),
        MSG_ERROR_FRAUDE: this.ensureString(unparsedEnv, "MSG_ERROR_FRAUDE"),
        BODY_SIZE_LIMIT: this.ensureString(unparsedEnv, "BODY_SIZE_LIMIT"),
        
        // Variables de timeout específicas para lambdas de transferencia
        LAMBDA_TIMEOUT_EJECUTAR_TRANSFERENCIA: this.ensureString(unparsedEnv, "LAMBDA_TIMEOUT_EJECUTAR_TRANSFERENCIA"),
        LAMBDA_TIMEOUT_ALTA_TRANSACCINALIDAD: this.ensureString(unparsedEnv, "LAMBDA_TIMEOUT_ALTA_TRANSACCINALIDAD"),
        
        // Variables de memoria específicas para lambdas de transferencia
        LAMBDA_MEMORY_ALTA_TRANSACCINALIDAD: this.ensureString(unparsedEnv, "LAMBDA_MEMORY_ALTA_TRANSACCINALIDAD"),

        BODY_SIZE_LIMIT_TRANSFERENCIA: this.ensureString(unparsedEnv, "BODY_SIZE_LIMIT_TRANSFERENCIA"),
        URL_CUENTA_OBTENER_TARIFA: this.ensureString(unparsedEnv, "URL_CUENTA_OBTENER_TARIFA"),
        
        REJECT_UNAUTHORIZED: this.ensureString(unparsedEnv, "REJECT_UNAUTHORIZED"),
        BB_BASE_URL: this.ensureString(unparsedEnv, "BB_BASE_URL"),
        
        ENCADENAMIENTO_DB_NAME: this.ensureString(unparsedEnv, "ENCADENAMIENTO_DB_NAME"),
        DURACION_ENCADENAMIENTO: this.ensureString(unparsedEnv, "DURACION_ENCADENAMIENTO"),
        /*//TODO: Depurar poco a poco, escoger lo que haga falta.
        DURACION_HASH_USUARIO: this.ensureString(unparsedEnv, "DURACION_HASH_USUARIO"),
        SEGURIDAD_URL: this.ensureString(unparsedEnv, "SEGURIDAD_URL"),
        RETRIES: this.ensureString(unparsedEnv, "RETRIES"),
        DELAY: this.ensureString(unparsedEnv, "DELAY"),
        USUARIO_URL: this.ensureString(unparsedEnv, "USUARIO_URL"),
        CLIENTEV2_URL: this.ensureString(unparsedEnv, "CLIENTEV2_URL"),
        PAGORAPIDO_URL: this.ensureString(unparsedEnv, "PAGORAPIDO_URL"),
        CUENTA_URL: this.ensureString(unparsedEnv, "CUENTA_URL"),
        INTERCEPTOR_HABILITADO: this.ensureString(unparsedEnv, "INTERCEPTOR_HABILITADO"),
        INICIAR_SESION_LAMBDA: this.ensureString(unparsedEnv, "INICIAR_SESION_LAMBDA"),
        INICIO_SESIONV2_HABILITADO: this.ensureString(unparsedEnv, "INICIO_SESIONV2_HABILITADO"),
        CLIENTEV2_LAMBDA: this.ensureString(unparsedEnv, "CLIENTEV2_LAMBDA"),
        STATE_MACHINE_ARN: this.ensureString(unparsedEnv, "STATE_MACHINE_ARN"),
        URL_INTEROPERABILIDAD: this.ensureString(unparsedEnv, "URL_INTEROPERABILIDAD"),
        AGENDA_URL: this.ensureString(unparsedEnv, "AGENDA_URL"),
        LAMBDA_MEMORY: this.ensureString(unparsedEnv, "LAMBDA_MEMORY")*/
      };
      console.log(`### buildConfig OK ${JSON.stringify(buildConfigResponse)}`);

      return buildConfigResponse;
    } catch (error) {
      console.log('error getConfig', error);
      console.log(`### I can't retrive the SSM Parameter from AWS`);
      return {
        STAGE: this.stage,
      };
    }
  }

  ensureString(object: { [name: string]: string }, propName: string): string {
    if (!object[propName] || object[propName].trim().length === 0)
      throw new Error(propName + ' does not exist or is empty');

    return object[propName];
  }
}