import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as path from 'path';
import * as fs from 'fs';
import * as cr from 'aws-cdk-lib/custom-resources';

export class BMPIniciarSesion extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const config = props!.tags!;
    const timeOutValue = parseInt(config.LAMBDA_TIMEOUT) || 3;


    // Timeouts específicos para lambdas de transferencia
    const timeOutEjecutarTransferencia = parseInt(config.LAMBDA_TIMEOUT_EJECUTAR_TRANSFERENCIA) || 17;

    const timeOutAltaTrx = parseInt(config.LAMBDA_TIMEOUT_ALTA_TRANSACCINALIDAD) || 3;

    // Memoria específica para lambdas de transferencia
    const memoryLambdaAltaTrx = parseInt(config.LAMBDA_MEMORY_ALTA_TRANSACCINALIDAD) || 1024;
    

    const lambdaRole = new iam.Role(this, `MyRole`, {
      roleName: `${this.stackName}-role-stack`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream', 
        'logs:PutLogEvents',
        'secretsmanager:GetSecretValue',
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
        'ec2:AttachNetworkInterface',
        'ec2:DetachNetworkInterface',
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
        'lambda:InvokeFunction'
      ],
      resources: ['*'],
    }));

    const dynamoPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Query', 'dynamodb:Scan'],
      resources: [config.TABLA_SESION_USUARIO_ARN, config.TABLA_HASH_USUARIO_ARN]
    });

    const secretReference = Secret.fromSecretNameV2(this, 'iseguridadsec', config.SECRET_NAME);
    secretReference.grantRead(lambdaRole);

    lambdaRole.addToPolicy(dynamoPolicy);

    const vpcLambda = ec2.Vpc.fromVpcAttributes(this, "ExistingVpcLambda", {
      vpcId: config.VPC_LAMBDA_ID,
      availabilityZones: ["us-east-1a", "us-east-1b", "us-east-1c"],
    });

    const subnets = [config.SUBNET_ID_01, config.SUBNET_ID_02, config.SUBNET_ID_03].map((subnetId) =>
      ec2.Subnet.fromSubnetId(this, subnetId, subnetId)
    );

    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, config.SECURITY_GROUP_NAME, config.SECURITY_GROUP_ID);

    const stepFunctionPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['states:StartSyncExecution'],
      resources: [config.ARN_INICIARSESION]
    });
    lambdaRole.addToPolicy(stepFunctionPolicy);

    const interDetalleDb = new dynamodb.Table(this, `interdetalleflujo`, {
      tableName: `${this.stackName}-interdetalleflujo`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "expires_at",
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      deletionProtection: true
    });

    const hashcachetrx = new dynamodb.Table(this, `hashcachetrx`, {
      tableName: `${this.stackName}-hashcachetrx`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "expires_at",
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      deletionProtection: true
    });

    new dynamodb.Table(this, `encadenamientodb`, {
      tableName: `${this.stackName}-${config.ENCADENAMIENTO_DB_NAME}`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "expires_at",
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      deletionProtection: true
    });

    const lambdaProps: NodejsFunctionProps = {
      bundling: { minify: true, externalModules: ["aws-sdk"] },
      runtime: lambda.Runtime.NODEJS_20_X,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: RetentionDays.ONE_MONTH,
      role: lambdaRole,
      vpc: vpcLambda,
      vpcSubnets: { subnets },
      securityGroups: [securityGroup],
    };

    const fnValidarClientId = new NodejsFunction(this, `${this.stackName}-fnValidarClientId`, {
      functionName: `${this.stackName}-fnValidarClientId`,
      description: 'Authorizer lambda en modo request',
      entry: path.join(__dirname, '/../src/functions/fnValidarClientId.ts'),
      handler: 'fnValidarClientId',
      timeout: cdk.Duration.seconds(timeOutValue),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_SESION_USUARIO: config.TABLA_SESION_USUARIO_NAME,
        VALIDAR_IDENTIFICACION_PETICION: config.VALIDAR_IDENTIFICACION_PETICION,
      },
      memorySize: parseInt(config.LAMBDA_MEMORY_AUTORIZADOR || "256"),
      ...lambdaProps,
    });


    const fnGenerarClientIdLogin = new NodejsFunction(this, `${this.stackName}-fnGenerarClientIdLogin`, {
      functionName: `${this.stackName}-fnGenerarClientIdLogin`,
      description: 'Lambda para generar Client ID solo para login',
      entry: path.join(__dirname, '/../src/functions/fnGenerarClientIdLogin.ts'),
      handler: 'fnGenerarClientIdLogin',
      timeout: cdk.Duration.seconds(timeOutValue),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: config.LAMBDA_TIMEOUT,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_SESION_USUARIO: config.TABLA_SESION_USUARIO_NAME,
        VALIDAR_IDENTIFICACION_PETICION: config.VALIDAR_IDENTIFICACION_PETICION,
        DURACION_SESION: config.DURACION_SESION,
        ARN_INICIARSESION: config.ARN_INICIARSESION,
        HABILITAR_BODY_SIZE_LENGTH: config.HABILITAR_BODY_SIZE_LENGTH
      },
      memorySize: parseInt(config.MEMORY_CLIENTID_LOGIN || "256"),
      ...lambdaProps,
    });


     const fnInterCrearHashTransf = new NodejsFunction(this, `${this.stackName}-fnInterCrearHashTransf`, {
       functionName: `${this.stackName}-fnInterCrearHashTransf`,
      description: 'Lambda para generar hash SHA-512 y HMAC-SHA512',
       entry: path.join(__dirname, '/../src/functions/fnInterCrearHashTransf.ts'),
      handler: 'handler',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_SESION_USUARIO: config.TABLA_SESION_USUARIO_NAME,
        // Usar nombres de tablas del proyecto principal
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO,
        region: 'us-east-1'
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

     const fnDetalleFlujoTransf = new NodejsFunction(this, `${this.stackName}-fnDetalleFlujoTransf`, {
       functionName: `${this.stackName}-fnDetalleFlujoTransf`,
      description: 'Lambda para procesar detalle flujo parametrizable',
       entry: path.join(__dirname, '/../src/functions/fnDetalleFlujoTransf.ts'),
      handler: 'handler',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterDetalleFlujoValidarGen = new NodejsFunction(this, `${this.stackName}-fnInterDetalleFlujoValidarGen`, {
       functionName: `${this.stackName}-fnInterDetalleFlujoValidarGen`,
      description: 'Lambda para obtener detalle flujo parametrizable',
       entry: path.join(__dirname, '/../src/functions/fnInterDetalleFlujo.ts'),
      handler: 'fnInterDetalleFlujo',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        DB_DETALLE_PARAMETRIZABLE: `${this.stackName}-interdetalleflujo`


      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterDetalleFlujoGenerarSegOtp = new NodejsFunction(this, `${this.stackName}-fnInterDetalleFlujoGenerarSegOtp`, {
       functionName: `${this.stackName}-fnInterDetalleFlujoGenerarSegOtp`,
      description: 'Lambda para obtener detalle flujo parametrizable',
       entry: path.join(__dirname, '/../src/functions/fnInterDetalleFlujo.ts'),
      handler: 'fnInterDetalleFlujo',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        DB_DETALLE_PARAMETRIZABLE: `${this.stackName}-interdetalleflujo`


      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    


    const fnInterDetalleFlujoControlMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterDetalleFlujoControlMonetOtro`, {
       functionName: `${this.stackName}-fnInterDetalleFlujoControlMonetOtro`,
      description: 'Lambda para obtener detalle flujo parametrizable',
       entry: path.join(__dirname, '/../src/functions/fnInterDetalleFlujo.ts'),
      handler: 'fnInterDetalleFlujo',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        DB_DETALLE_PARAMETRIZABLE: `${this.stackName}-interdetalleflujo`


      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterDetalleFlujoEncadenamiento = new NodejsFunction(this, `${this.stackName}-fnInterDetalleFlujoEncadenamiento`, {
       functionName: `${this.stackName}-fnInterDetalleFlujoEncadenamiento`,
      description: 'Lambda para obtener detalle flujo parametrizable',
       entry: path.join(__dirname, '/../src/functions/fnInterDetalleFlujo.ts'),
      handler: 'fnInterDetalleFlujo',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        DB_DETALLE_PARAMETRIZABLE: `${this.stackName}-interdetalleflujo`


      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });



    const fnInterDetalleFlujoValidarSegOtp = new NodejsFunction(this, `${this.stackName}-fnInterDetalleFlujoValidarSegOtp`, {
       functionName: `${this.stackName}-fnInterDetalleFlujoValidarSegOtp`,
      description: 'Lambda para obtener detalle flujo parametrizable',
       entry: path.join(__dirname, '/../src/functions/fnInterDetalleFlujo.ts'),
      handler: 'fnInterDetalleFlujo',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        DB_DETALLE_PARAMETRIZABLE: `${this.stackName}-interdetalleflujo`


      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    interDetalleDb.grantReadWriteData(fnInterDetalleFlujoValidarGen);


    // Función Lambda para obtener configuración de servicios HTTP
    const fnHabilitarAutorizadorServicios = new NodejsFunction(this, `${this.stackName}-fnHabilitarAutorizadorServicios`, {
      functionName: `${this.stackName}-fnHabilitarAutorizadorServicios`,
      description: 'Lambda para obtener configuración de servicios HTTP desde DynamoDB',
      entry: path.join(__dirname, '/../src/functions/fnHabilitarAutorizadorServicios.ts'),
      handler: 'fnHabilitarAutorizadorServicios',
      timeout: cdk.Duration.seconds(timeOutValue),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        DB_DETALLE_PARAMETRIZABLE: interDetalleDb.tableName
      },
      memorySize: 256,
      ...lambdaProps,
    });
   
    // Dar permisos de lectura a la tabla
    interDetalleDb.grantReadData(fnHabilitarAutorizadorServicios);
 
    // Dar permisos a la Lambda para administrar recursos del API Gateway
    fnHabilitarAutorizadorServicios.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'apigateway:GET',
        'apigateway:POST',
        'apigateway:PUT',
        'apigateway:DELETE',
        'apigateway:PATCH'
      ],
      resources: ['arn:aws:apigateway:*::/restapis/*']
    }));
    
     const GenerarClientidTransf = new NodejsFunction(this, `${this.stackName}-GenerarClientidTransf`, {
       functionName: `${this.stackName}-GenerarClientidTransf`,
      description: 'Lambda para generar ClientId de autorización',
       entry: path.join(__dirname, '/../src/functions/GenerarClientidTransf.ts'),
      handler: 'handler',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_SESION_USUARIO: config.TABLA_SESION_USUARIO_NAME,
        DURACION_SESION: config.DURACION_SESION,
        ARN_INICIARSESION: config.ARN_INICIARSESION
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const GenerarClientidControlSegurOtro = new NodejsFunction(this, `${this.stackName}-GenerarClientidControlSegurOtro`, {
       functionName: `${this.stackName}-GenerarClientidControlSegurOtro`,
      description: 'Lambda para generar ClientId de autorización',
       entry: path.join(__dirname, '/../src/functions/GenerarClientidTransf.ts'),
      handler: 'handler',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_SESION_USUARIO: config.TABLA_SESION_USUARIO_NAME,
        DURACION_SESION: config.DURACION_SESION,
        ARN_INICIARSESION: config.ARN_INICIARSESION
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const GenerarClientidMonetOtro = new NodejsFunction(this, `${this.stackName}-GenerarClientidMonetOtro`, {
       functionName: `${this.stackName}-GenerarClientidMonetOtro`,
      description: 'Lambda para generar ClientId de autorización',
       entry: path.join(__dirname, '/../src/functions/GenerarClientidTransf.ts'),
      handler: 'handler',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_SESION_USUARIO: config.TABLA_SESION_USUARIO_NAME,
        DURACION_SESION: config.DURACION_SESION,
        ARN_INICIARSESION: config.ARN_INICIARSESION
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

     const fnInterBorrarClientIdTransf = new NodejsFunction(this, `${this.stackName}-fnInterBorrarClientIdTransf`, {
       functionName: `${this.stackName}-fnInterBorrarClientIdTransf`,
      description: 'Lambda para borrar ClientId después de uso',
       entry: path.join(__dirname, '/../src/functions/fnInterBorrarClientIdTransf.ts'),
      handler: 'handler',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_SESION_USUARIO: config.TABLA_SESION_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

     const fnInterBorrarHashTransf = new NodejsFunction(this, `${this.stackName}-fnInterBorrarHashTransf`, {
       functionName: `${this.stackName}-fnInterBorrarHashTransf`,
      description: 'Lambda para borrar Hash de seguridad',
       entry: path.join(__dirname, '/../src/functions/fnInterBorrarHashTransf.ts'),
      handler: 'handler',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

     const fnInterValidarHashTransf = new NodejsFunction(this, `${this.stackName}-fnInterValidarHashTransf`, {
       functionName: `${this.stackName}-fnInterValidarHashTransf`,
      description: 'Lambda para validar Hash de seguridad',
       entry: path.join(__dirname, '/../src/functions/fnInterValidarHashTransf.ts'),
      handler: 'handler',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar nombres de tablas del proyecto principal
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

     const fnInterValidarHashGen = new NodejsFunction(this, `${this.stackName}-fnInterValidarHashGen`, {
       functionName: `${this.stackName}-fnInterValidarHashGen`,
      description: 'Lambda para validar Hash de seguridad',
       entry: path.join(__dirname, '/../src/functions/fnInterValidarHash.ts'),
      handler: 'fnInterValidarHash',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar nombres de tablas del proyecto principal
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

     const fnInterBorrarHashGen = new NodejsFunction(this, `${this.stackName}-fnInterBorrarHashGen`, {
       functionName: `${this.stackName}-fnInterBorrarHashGen`,
      description: 'Lambda para borrar Hash de seguridad',
       entry: path.join(__dirname, '/../src/functions/fnInterBorrarHash.ts'),
      handler: 'fnInterBorrarHash',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar nombres de tablas del proyecto principal
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });
    

    // === OTP: Lambda Generar OTP ===
    const fnInterPeticionGenerarSegurOtp = new NodejsFunction(this, `${this.stackName}-fnInterPeticionGenerarSegurOtp`, {
      functionName: `${this.stackName}-fnInterPeticionGenerarSegurOtp`,
      description: 'Lambda para generar OTP',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        URL_SERVICIO_OTP: config.URL_SERVICIO_OTP,
        URL_SERVICIO_GENERAR_OTP: config.URL_SERVICIO_GENERAR_OTP,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });
    

    // === OTP: Lambda Generar OTP ===
    const fnInterPeticionControlMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterPeticionControlMonetOtro`, {
      functionName: `${this.stackName}-fnInterPeticionControlMonetOtro`,
      description: 'Lambda para invocar el servicio parametrizado por DynamoDB',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        URL_SERVICIO_OTP: config.URL_SERVICIO_OTP,
        URL_SERVICIO_GENERAR_OTP: config.URL_SERVICIO_GENERAR_OTP,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });
    // === OTP: Lambda Generar OTP ===
    const fnInterPeticionEncadenamiento = new NodejsFunction(this, `${this.stackName}-fnInterPeticionEncadenamiento`, {
      functionName: `${this.stackName}-fnInterPeticionEncadenamiento`,
      description: 'Lambda para invocar el servicio parametrizado por DynamoDB',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        URL_SERVICIO_OTP: config.URL_SERVICIO_OTP,
        URL_SERVICIO_GENERAR_OTP: config.URL_SERVICIO_GENERAR_OTP,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    // === OTP: lambdas auxiliares ===
    const fnInterValidarHashSegurOTP = new NodejsFunction(this, `${this.stackName}-fnInterValidarHashSegurOTP`, {
      functionName: `${this.stackName}-fnInterValidarHashSegurOTP`,
      description: 'Lambda para validar Hash de seguridad (OTP)',
      entry: path.join(__dirname, '/../src/functions/fnInterValidarHash.ts'),
      handler: 'fnInterValidarHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterBorrarHashSegurOTP = new NodejsFunction(this, `${this.stackName}-fnInterBorrarHashSegurOTP`, {
      functionName: `${this.stackName}-fnInterBorrarHashSegurOTP`,
      description: 'Lambda para borrar Hash de seguridad (OTP)',
      entry: path.join(__dirname, '/../src/functions/fnInterBorrarHash.ts'),
      handler: 'fnInterBorrarHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterCrearHashSegurOTP = new NodejsFunction(this, `${this.stackName}-fnInterCrearHashSegurOTP`, {
      functionName: `${this.stackName}-fnInterCrearHashSegurOTP`,
      description: 'Lambda para crear Hash de seguridad (OTP)',
      entry: path.join(__dirname, '/../src/functions/fnInterCrearHash.ts'),
      handler: 'fnInterCrearHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterCrearHashControlMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterCrearHashControlMonetOtro`, {
      functionName: `${this.stackName}-fnInterCrearHashControlMonetOtro`,
      description: 'Lambda para crear Hash en control monet otro',
      entry: path.join(__dirname, '/../src/functions/fnInterCrearHash.ts'),
      handler: 'fnInterCrearHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    // Permisos para la tabla hashcachetrans
    const fnEjecutarTransferencia = new NodejsFunction(this, `${this.stackName}-fnEjecutarTransferencia`, {
      functionName: `${this.stackName}-fnEjecutarTransferencia`,
      description: 'Lambda para ejecutar transferencias según el flujo',
      entry: path.join(__dirname, '/../src/functions/fnEjecutarTransferencia.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(timeOutEjecutarTransferencia),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutEjecutarTransferencia}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        TABLA_HASH_DIGITAL_NAME: config.TABLA_HASH_DIGITAL_NAME,
        VALIDAR_RETO: config.VALIDAR_RETO,
        VALIDAR_DIGITAL: config.VALIDAR_DIGITAL,
        MSG_ERROR_FRAUDE: config.MSG_ERROR_FRAUDE,
        BODY_SIZE_LIMIT: config.BODY_SIZE_LIMIT,
        BB_BASE_URL: config.BB_BASE_URL,
        BODY_SIZE_LIMIT_TRANSFERENCIA: config.BODY_SIZE_LIMIT_TRANSFERENCIA
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterPeticionGen = new NodejsFunction(this, `${this.stackName}-fnInterPeticionGen`, {
      functionName: `${this.stackName}-fnInterPeticionGen`,
      description: 'Lambda para ejecutar transferencias según el flujo',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutEjecutarTransferencia),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        TABLA_HASH_DIGITAL_NAME: config.TABLA_HASH_DIGITAL_NAME,
        VALIDAR_RETO: config.VALIDAR_RETO,
        VALIDAR_DIGITAL: config.VALIDAR_DIGITAL,
        MSG_ERROR_FRAUDE: config.MSG_ERROR_FRAUDE,
        BODY_SIZE_LIMIT: config.BODY_SIZE_LIMIT,
        BODY_SIZE_LIMIT_TRANSFERENCIA: config.BODY_SIZE_LIMIT_TRANSFERENCIA
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

     // === OTP: Lambda Validar OTP ===
    const fnInterPeticionValidarSegurOtp = new NodejsFunction(this, `${this.stackName}-fnInterPeticionValidarSegurOtp`, {
      functionName: `${this.stackName}-fnInterPeticionValidarSegurOtp`,
      description: 'Lambda para validar OTP (TOKENRO o con hash)',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        URL_SERVICIO_OTP: config.URL_SERVICIO_OTP,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    // ===== PREGUNTAS DE SEGURIDAD (PregSeg): Lambdas Detalle Flujo =====
    const fnInterDetalleFlujoGenerarSegPregSeg = new NodejsFunction(this, `${this.stackName}-fnInterDetalleFlujoGenerarSegPregSeg`, {
      functionName: `${this.stackName}-fnInterDetalleFlujoGenerarSegPregSeg`,
      description: 'Lambda para obtener detalle flujo parametrizable (Generar PregSeg)',
      entry: path.join(__dirname, '/../src/functions/fnInterDetalleFlujo.ts'),
      handler: 'fnInterDetalleFlujo',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        DB_DETALLE_PARAMETRIZABLE: `${this.stackName}-interdetalleflujo`
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterDetalleFlujoValidarSegPregSeg = new NodejsFunction(this, `${this.stackName}-fnInterDetalleFlujoValidarSegPregSeg`, {
      functionName: `${this.stackName}-fnInterDetalleFlujoValidarSegPregSeg`,
      description: 'Lambda para obtener detalle flujo parametrizable (Validar PregSeg)',
      entry: path.join(__dirname, '/../src/functions/fnInterDetalleFlujo.ts'),
      handler: 'fnInterDetalleFlujo',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        DB_DETALLE_PARAMETRIZABLE: `${this.stackName}-interdetalleflujo`
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    // ===== PREGUNTAS DE SEGURIDAD (PregSeg): Lambda Generar PregSeg =====
    const fnInterPeticionGenerarSegurPregSeg = new NodejsFunction(this, `${this.stackName}-fnInterPeticionGenerarSegurPregSeg`, {
      functionName: `${this.stackName}-fnInterPeticionGenerarSegurPregSeg`,
      description: 'Lambda para generar Preguntas de Seguridad',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        URL_SERVICIO_OTP: config.URL_SERVICIO_OTP,
        URL_SERVICIO_GENERAR_OTP: config.URL_SERVICIO_GENERAR_OTP,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    // ===== PREGUNTAS DE SEGURIDAD (PregSeg): Lambda Validar PregSeg =====
    const fnInterPeticionValidarSegurPregSeg = new NodejsFunction(this, `${this.stackName}-fnInterPeticionValidarSegurPregSeg`, {
      functionName: `${this.stackName}-fnInterPeticionValidarSegurPregSeg`,
      description: 'Lambda para validar Preguntas de Seguridad (TOKENRO o con hash)',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        URL_SERVICIO_OTP: config.URL_SERVICIO_OTP,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    // ===== PREGUNTAS DE SEGURIDAD (PregSeg): Lambdas auxiliares =====
    const fnInterValidarHashSegurPregSeg = new NodejsFunction(this, `${this.stackName}-fnInterValidarHashSegurPregSeg`, {
      functionName: `${this.stackName}-fnInterValidarHashSegurPregSeg`,
      description: 'Lambda para validar Hash de seguridad (PregSeg)',
      entry: path.join(__dirname, '/../src/functions/fnInterValidarHash.ts'),
      handler: 'fnInterValidarHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterBorrarHashSegurPregSeg = new NodejsFunction(this, `${this.stackName}-fnInterBorrarHashSegurPregSeg`, {
      functionName: `${this.stackName}-fnInterBorrarHashSegurPregSeg`,
      description: 'Lambda para borrar Hash de seguridad (PregSeg)',
      entry: path.join(__dirname, '/../src/functions/fnInterBorrarHash.ts'),
      handler: 'fnInterBorrarHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterCrearHashSegurPregSeg = new NodejsFunction(this, `${this.stackName}-fnInterCrearHashSegurPregSeg`, {
      functionName: `${this.stackName}-fnInterCrearHashSegurPregSeg`,
      description: 'Lambda para crear Hash de seguridad (PregSeg)',
      entry: path.join(__dirname, '/../src/functions/fnInterCrearHash.ts'),
      handler: 'fnInterCrearHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    // Permisos DynamoDB para lambdas de PregSeg
    interDetalleDb.grantReadWriteData(fnInterDetalleFlujoGenerarSegPregSeg);
    interDetalleDb.grantReadWriteData(fnInterDetalleFlujoValidarSegPregSeg);
    hashcachetrx.grantReadWriteData(fnInterValidarHashSegurPregSeg);
    hashcachetrx.grantReadWriteData(fnInterBorrarHashSegurPregSeg);
    hashcachetrx.grantReadWriteData(fnInterCrearHashSegurPregSeg);

    // Lambda para obtener productos (nueva para flujo obtenerTarifa)
    const fnObtenerTarifaTransf = new NodejsFunction(this, `${this.stackName}-fnObtenerTarifaTransf`, {
      functionName: `${this.stackName}-fnObtenerTarifaTransf`,
      description: 'Lambda para obtener productos del cliente',
      entry: path.join(__dirname, '/../src/functions/fnObtenerTarifaTransf.ts'),
      handler: 'fnObtenerTarifaTransf',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        URL_CUENTA_OBTENER_TARIFA: config.URL_CUENTA_OBTENER_TARIFA
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });


    // ===== FUNCIONES ESPECÍFICAS PARA RETIRO SIN TARJETA =====
    
    const fnInterCrearHashMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterCrearHashMonetOtro`, {
      functionName: `${this.stackName}-fnInterCrearHashMonetOtro`,
      description: 'Lambda para crear hash de seguridad específico para retiro sin tarjeta',
      entry: path.join(__dirname, '/../src/functions/fnInterCrearHash.ts'),
      handler: 'fnInterCrearHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterValidarHashMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterValidarHashMonetOtro`, {
      functionName: `${this.stackName}-fnInterValidarHashMonetOtro`,
      description: 'Lambda para validar hash de seguridad específico para retiro sin tarjeta',
      entry: path.join(__dirname, '/../src/functions/fnInterValidarHash.ts'),
      handler: 'fnInterValidarHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterBorrarHashMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterBorrarHashMonetOtro`, {
      functionName: `${this.stackName}-fnInterBorrarHashMonetOtro`,
      description: 'Lambda para borrar hash de seguridad específico para retiro sin tarjeta',
      entry: path.join(__dirname, '/../src/functions/fnInterBorrarHash.ts'),
      handler: 'fnInterBorrarHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterBorrarClientIdMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterBorrarClientIdMonetOtro`, {
      functionName: `${this.stackName}-fnInterBorrarClientIdMonetOtro`,
      description: 'Lambda para borrar ClientId específico para retiro sin tarjeta',
      entry: path.join(__dirname, '/../src/functions/fnInterBorrarClientIdTransf.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_SESION_USUARIO: config.TABLA_SESION_USUARIO_NAME,
        DURACION_SESION: config.DURACION_SESION
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterPeticionMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterPeticionMonetOtro`, {
      functionName: `${this.stackName}-fnInterPeticionMonetOtro`,
      description: 'Lambda para ejecutar servicio de retiro sin tarjeta usando fnInterPeticion genérica',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutEjecutarTransferencia),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        LAMBDA_TIMEOUT: `${timeOutEjecutarTransferencia}`,
        SECRET_NAME: config.SECRET_NAME,
        BB_BASE_URL: config.BB_BASE_URL,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });
    
    const fnInterPrepararRespuestaFinalMonetOtro = new NodejsFunction(this, `${this.stackName}-fnInterPrepararRespuestaFinalMonetOtro`, {
      functionName: `${this.stackName}-fnInterPrepararRespuestaFinalMonetOtro`,
      description: 'Lambda para ejecutar servicio de retiro sin tarjeta usando fnInterPeticion genérica',
      entry: path.join(__dirname, '/../src/functions/fnInterMapearRespuestaFinal.ts'),
      handler: 'fnInterMapearRespuestaFinal',
      timeout: cdk.Duration.seconds(timeOutEjecutarTransferencia),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        LAMBDA_TIMEOUT: `${timeOutEjecutarTransferencia}`,
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });
    const fnInterEncadenamientoMapeoFinal = new NodejsFunction(this, `${this.stackName}-fnInterEncadenamientoMapeoFinal`, {
      functionName: `${this.stackName}-fnInterEncadenamientoMapeoFinal`,
      description: 'Lambda para ejecutar servicio de retiro sin tarjeta usando fnInterPeticion genérica',
      entry: path.join(__dirname, '/../src/functions/fnInterMapearRespuestaFinal.ts'),
      handler: 'fnInterMapearRespuestaFinal',
      timeout: cdk.Duration.seconds(timeOutEjecutarTransferencia),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        LAMBDA_TIMEOUT: `${timeOutEjecutarTransferencia}`,
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });
    
    const fnInterPredecesorEncadenamiento = new NodejsFunction(this, `${this.stackName}-fnInterPredecesorEncadenamiento`, {
      functionName: `${this.stackName}-fnInterPredecesorEncadenamiento`,
      description: 'Lambda para ejecutar servicio de retiro sin tarjeta usando fnInterPeticion genérica',
      entry: path.join(__dirname, '/../src/functions/fnInterEncadenamiento.ts'),
      handler: 'fnInterPredecesorEncadenamiento',
      timeout: cdk.Duration.seconds(timeOutEjecutarTransferencia),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        ENCADENAMIENTO_DB_NAME: `${this.stackName}-${config.ENCADENAMIENTO_DB_NAME}`,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        SECRET_NAME: config.SECRET_NAME,
        LAMBDA_TIMEOUT: `${timeOutEjecutarTransferencia}`,
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

      const fnInterSucesorEncadenamiento = new NodejsFunction(this, `${this.stackName}-fnInterSucesorEncadenamiento`, {
      functionName: `${this.stackName}-fnInterSucesorEncadenamiento`,
      description: 'Lambda para ejecutar servicio de retiro sin tarjeta usando fnInterPeticion genérica',
      entry: path.join(__dirname, '/../src/functions/fnInterEncadenamiento.ts'),
      handler: 'fnInterSucesorEncadenamiento',
      timeout: cdk.Duration.seconds(timeOutEjecutarTransferencia),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        ENCADENAMIENTO_DB_NAME: `${this.stackName}-${config.ENCADENAMIENTO_DB_NAME}`,
        SECRET_NAME: config.SECRET_NAME,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        LAMBDA_TIMEOUT: `${timeOutEjecutarTransferencia}`,
        DURACION_ENCADENAMIENTO: config.DURACION_ENCADENAMIENTO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });
    
    const fnInterPrepararRespuestaFinalValidarGen = new NodejsFunction(this, `${this.stackName}-fnInterPrepararRespuestaFinalValidarGen`, {
      functionName: `${this.stackName}-fnInterPrepararRespuestaFinalValidarGen`,
      description: 'Lambda para ejecutar servicio de retiro sin tarjeta usando fnInterPeticion genérica',
      entry: path.join(__dirname, '/../src/functions/fnInterMapearRespuestaFinal.ts'),
      handler: 'fnInterMapearRespuestaFinal',
      timeout: cdk.Duration.seconds(timeOutEjecutarTransferencia),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        LAMBDA_TIMEOUT: `${timeOutEjecutarTransferencia}`,
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    // === REGISTRO DE DISPOSITIVO: Lambda fnRegistrarDispositivo ===
    const fnInterPeticionControlSegurOtro = new NodejsFunction(this, `${this.stackName}-fnInterPeticionControlSegurOtro`, {
      functionName: `${this.stackName}-fnInterPeticionControlSegurOtro`,
      description: 'Lambda para registrar dispositivo y actualizar caché de sesión',
      entry: path.join(__dirname, '/../src/functions/fnInterPeticion.ts'),
      handler: 'fnInterPeticion',
      timeout: cdk.Duration.seconds(timeOutValue),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        REJECT_UNAUTHORIZED: config.REJECT_UNAUTHORIZED,
        LAMBDA_TIMEOUT: `${timeOutValue}`,
        SECRET_NAME: config.SECRET_NAME,
        SESION_CACHE_URL: config.SESION_CACHE_URL,
        CACHE_LOGIN_DURACION_MILI: config.CACHE_LOGIN_DURACION_MILI,
        BB_BASE_URL: config.BB_BASE_URL,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DB_DETALLE_PARAMETRIZABLE: config.DB_DETALLE_PARAMETRIZABLE
      },
      ...lambdaProps,
    });


    const fnInterValidarHashControlSegurOtro = new NodejsFunction(this, `${this.stackName}-fnInterValidarHashControlSegurOtro`, {
      functionName: `${this.stackName}-fnInterValidarHashControlSegurOtro`,
      description: 'Lambda para validar hash de seguridad específico para retiro sin tarjeta',
      entry: path.join(__dirname, '/../src/functions/fnInterValidarHash.ts'),
      handler: 'fnInterValidarHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterBorrarHashControlSegurOtro = new NodejsFunction(this, `${this.stackName}-fnInterBorrarHashControlSegurOtro`, {
      functionName: `${this.stackName}-fnInterBorrarHashControlSegurOtro`,
      description: 'Lambda para borrar hash de seguridad específico para retiro sin tarjeta',
      entry: path.join(__dirname, '/../src/functions/fnInterBorrarHash.ts'),
      handler: 'fnInterBorrarHash',
      timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        TABLA_HASH_USUARIO_NAME: config.TABLA_HASH_USUARIO_NAME,
        TABLA_HASH_USUARIO_NAME_TRX: `${this.stackName}-hashcachetrx`,
        DURACION_HASH_USUARIO: config.DURACION_HASH_USUARIO
      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });

    const fnInterDetalleFlujoControlSegurOtro = new NodejsFunction(this, `${this.stackName}-fnInterDetalleFlujoControlSegurOtro`, {
       functionName: `${this.stackName}-fnInterDetalleFlujoControlSegurOtro`,
      description: 'Lambda para obtener detalle flujo parametrizable',
       entry: path.join(__dirname, '/../src/functions/fnInterDetalleFlujo.ts'),
      handler: 'fnInterDetalleFlujo',
       timeout: cdk.Duration.seconds(timeOutAltaTrx),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        STAGE: config.STAGE,
        LAMBDA_TIMEOUT: `${timeOutAltaTrx}`,
        SECRET_NAME: config.SECRET_NAME,
        // Usar variables del proyecto principal para transferencia
        URL_SERVICIO_TRANSFERENCIA: config.URL_SERVICIO_TRANSFERENCIA,
        DB_DETALLE_PARAMETRIZABLE: `${this.stackName}-interdetalleflujo`


      },
      memorySize: memoryLambdaAltaTrx,
      ...lambdaProps,
    });
    
    fnGenerarClientIdLogin.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));
    fnInterCrearHashTransf.grantInvoke(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // Rol para Step Function
    const stepFunctionRole = new iam.Role(this, `${this.stackName}-stepfunction-role`, {
      roleName: `${this.stackName}-stepfunction-role`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        StepFunctionExecutionPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeFunction'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });


       // Rol para Step Function
    const stepFunctionRoleMonetOtros = new iam.Role(this, `${this.stackName}-stepfunction-seguridad-otros-role`, {
      roleName: `${this.stackName}-stepfunction-seguridad-otros-role`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        StepFunctionExecutionPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeFunction'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });


    stepFunctionRoleMonetOtros.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        fnInterPeticionControlMonetOtro.functionArn,
        fnInterDetalleFlujoControlMonetOtro.functionArn,
        fnInterCrearHashControlMonetOtro.functionArn,
        `${fnInterPeticionControlMonetOtro.functionArn}:*`,
        `${fnInterDetalleFlujoControlMonetOtro.functionArn}:*`,
        `${fnInterCrearHashControlMonetOtro.functionArn}:*`,
      ]
    }));


    // Rol para Step Function Encadenamiento
    const stepFunctionRoleEncadenamiento = new iam.Role(this, `${this.stackName}-stepfunction-seguridad-encadenamiento-role`, {
      roleName: `${this.stackName}-stepfunction-encadenamiento-role`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        StepFunctionExecutionPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeFunction'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    stepFunctionRoleEncadenamiento.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        fnInterPeticionEncadenamiento.functionArn,
        fnInterDetalleFlujoEncadenamiento.functionArn,
        fnInterPredecesorEncadenamiento.functionArn,
        fnInterSucesorEncadenamiento.functionArn,
        fnInterEncadenamientoMapeoFinal.functionArn,
        `${fnInterEncadenamientoMapeoFinal.functionArn}:*`,
        `${fnInterPeticionEncadenamiento.functionArn}:*`,
        `${fnInterDetalleFlujoEncadenamiento.functionArn}:*`,
        `${fnInterPredecesorEncadenamiento.functionArn}:*`,
        `${fnInterSucesorEncadenamiento.functionArn}:*`
      ]
    }));

    // Rol para Step Function PregSeg (Preguntas de Seguridad)
    const stepFunctionRolePregSeg = new iam.Role(this, `${this.stackName}-stepfunction-preguntas-seguridad-role`, {
      roleName: `${this.stackName}-stepfunction-preguntas-seguridad-role`,
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        StepFunctionExecutionPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams'
              ],
              resources: ['*']
            }),
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'lambda:InvokeFunction'
              ],
              resources: ['*']
            })
          ]
        })
      }
    });

    stepFunctionRolePregSeg.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        fnInterPeticionGenerarSegurPregSeg.functionArn,
        fnInterDetalleFlujoGenerarSegPregSeg.functionArn,
        fnInterCrearHashSegurPregSeg.functionArn,
        fnInterValidarHashSegurPregSeg.functionArn,
        fnInterBorrarHashSegurPregSeg.functionArn,
        fnInterPeticionValidarSegurPregSeg.functionArn,
        fnInterDetalleFlujoValidarSegPregSeg.functionArn,
        `${fnInterPeticionGenerarSegurPregSeg.functionArn}:*`,
        `${fnInterDetalleFlujoGenerarSegPregSeg.functionArn}:*`,
        `${fnInterCrearHashSegurPregSeg.functionArn}:*`,
        `${fnInterValidarHashSegurPregSeg.functionArn}:*`,
        `${fnInterBorrarHashSegurPregSeg.functionArn}:*`,
        `${fnInterPeticionValidarSegurPregSeg.functionArn}:*`,
        `${fnInterDetalleFlujoValidarSegPregSeg.functionArn}:*`
      ]
    }));

    // Permisos para que Step Function pueda invocar todas las lambdas
    stepFunctionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [
        fnInterCrearHashTransf.functionArn,
        fnValidarClientId.functionArn,
        fnDetalleFlujoTransf.functionArn,
        GenerarClientidTransf.functionArn,
        GenerarClientidMonetOtro.functionArn,
        GenerarClientidControlSegurOtro.functionArn,
        fnInterBorrarClientIdTransf.functionArn,
        fnInterBorrarHashTransf.functionArn,
        fnInterValidarHashTransf.functionArn,
        fnInterValidarHashGen.functionArn,
        fnInterBorrarHashGen.functionArn,
        fnEjecutarTransferencia.functionArn,
        fnObtenerTarifaTransf.functionArn,
        fnInterPeticionGenerarSegurOtp.functionArn,
        fnInterDetalleFlujoGenerarSegOtp.functionArn,
        fnInterBorrarHashSegurOTP.functionArn,
        fnInterValidarHashSegurOTP.functionArn,
        fnInterPeticionValidarSegurOtp.functionArn,
        fnInterCrearHashSegurOTP.functionArn,
        fnInterDetalleFlujoValidarSegOtp.functionArn,
        fnInterPeticionControlSegurOtro.functionArn,
        fnInterValidarHashControlSegurOtro.functionArn,
        fnInterBorrarHashControlSegurOtro.functionArn,
        fnInterDetalleFlujoControlSegurOtro.functionArn,
        fnInterCrearHashMonetOtro.functionArn,
        fnInterValidarHashMonetOtro.functionArn,
        fnInterBorrarHashMonetOtro.functionArn,
        fnInterBorrarClientIdMonetOtro.functionArn,
        fnInterPeticionMonetOtro.functionArn,
        fnInterPrepararRespuestaFinalValidarGen.functionArn,
        fnInterPrepararRespuestaFinalMonetOtro.functionArn,
        `${fnInterPrepararRespuestaFinalMonetOtro.functionArn}:*`,
        `${fnInterPrepararRespuestaFinalValidarGen.functionArn}:*`,
        `${fnInterDetalleFlujoControlSegurOtro.functionArn}:*`,
        `${fnInterBorrarHashControlSegurOtro.functionArn}:*`,
        `${fnInterValidarHashControlSegurOtro.functionArn}:*`,
        `${fnInterCrearHashTransf.functionArn}:*`,
        `${fnValidarClientId.functionArn}:*`,
        `${fnDetalleFlujoTransf.functionArn}:*`,
        `${GenerarClientidTransf.functionArn}:*`,
        `${GenerarClientidMonetOtro.functionArn}:*`,
        `${GenerarClientidControlSegurOtro.functionArn}:*`,
        `${fnInterBorrarClientIdTransf.functionArn}:*`,
        `${fnInterBorrarHashTransf.functionArn}:*`,
        `${fnInterValidarHashTransf.functionArn}:*`,
        `${fnInterValidarHashGen.functionArn}:*`,
        `${fnInterBorrarHashGen.functionArn}:*`,
        `${fnEjecutarTransferencia.functionArn}:*`,
        `${fnObtenerTarifaTransf.functionArn}:*`,
        `${fnInterPeticionGenerarSegurOtp.functionArn}:*`,
        `${fnInterDetalleFlujoGenerarSegOtp.functionArn}:*`,
        `${fnInterBorrarHashSegurOTP.functionArn}:*`,
        `${fnInterValidarHashSegurOTP.functionArn}:*`,
        `${fnInterPeticionValidarSegurOtp.functionArn}:*`,
        `${fnInterCrearHashSegurOTP.functionArn}:*`,
        `${fnInterDetalleFlujoValidarSegOtp.functionArn}:*`,
        `${fnInterPeticionControlSegurOtro.functionArn}:*`,
        `${fnInterCrearHashMonetOtro.functionArn}:*`,
        `${fnInterValidarHashMonetOtro.functionArn}:*`,
        `${fnInterBorrarHashMonetOtro.functionArn}:*`,
        `${fnInterBorrarClientIdMonetOtro.functionArn}:*`,
        `${fnInterPeticionMonetOtro.functionArn}:*`,
        `arn:aws:lambda:${this.region}:${this.account}:function:*`
      ]
    }));

    // Cargar definición del Step Function desde archivo JSON y reemplazar variables
    const stepFunctionDefinitionPath = path.join(__dirname, '../step-function-interceptor.json');
    let stepFunctionDefinitionString = fs.readFileSync(stepFunctionDefinitionPath, 'utf8');
    
    // Reemplazar variables dinámicas en el Step Function
    stepFunctionDefinitionString = stepFunctionDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnDetalleFlujoTransf/g, fnDetalleFlujoTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnValidarClientId/g, fnValidarClientId.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:GenerarClientidTransf/g, GenerarClientidTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarClientIdTransf/g, fnInterBorrarClientIdTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarHashTransf/g, fnInterBorrarHashTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterValidarHashTransf/g, fnInterValidarHashTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnEjecutarTransferencia/g, fnEjecutarTransferencia.functionArn);

    const stepFunctionDefinition = JSON.parse(stepFunctionDefinitionString);

    // Crear Step Function Express con logs habilitados
    const stepFunctionLogGroup = new logs.LogGroup(this, `${this.stackName}-sfnEjecutarTransferencias-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-sfnEjecutarTransferencias`,
      retention: RetentionDays.ONE_MONTH
    });

    const interceptorStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-sfnEjecutarTransferencias`, {
      stateMachineName: `${this.stackName}-sfnEjecutarTransferencias`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionDefinition)),
      role: stepFunctionRole,
      timeout: cdk.Duration.minutes(5),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: {
        destination: stepFunctionLogGroup,
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true
      }
    });

    // Crear Step Function para obtenerTarifa
    const stepFunctionObtenerTarifaDefinitionPath = path.join(__dirname, '../step-function-obtenertarifa.json');
    let stepFunctionObtenerTarifaDefinitionString = fs.readFileSync(stepFunctionObtenerTarifaDefinitionPath, 'utf8');
    
    // Reemplazar variables dinámicas en el Step Function de obtenerTarifa
    stepFunctionObtenerTarifaDefinitionString = stepFunctionObtenerTarifaDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnValidarClientId/g, fnValidarClientId.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnObtenerTarifaTransf/g, fnObtenerTarifaTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterCrearHashTransf/g, fnInterCrearHashTransf.functionArn);

    const stepFunctionObtenerTarifaDefinition = JSON.parse(stepFunctionObtenerTarifaDefinitionString);

    // Log Group para Step Function obtenerTarifa
    const stepFunctionObtenerTarifaLogGroup = new logs.LogGroup(this, `${this.stackName}-stepfunction-obtenertarifa-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-obtenertarifa`,
      retention: RetentionDays.ONE_MONTH
    });

    const obtenerTarifaStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-obtenertarifa-stepfunction`, {
      stateMachineName: `${this.stackName}-obtenertarifa-stepfunction`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionObtenerTarifaDefinition)),
      role: stepFunctionRole,
      timeout: cdk.Duration.minutes(3),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: {
        destination: stepFunctionObtenerTarifaLogGroup,
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true
      }
    });


    // Cargar definición del Step Function desde archivo JSON y reemplazar variables
    const stepFunctionValidarGeneralDefinitionPath = path.join(__dirname, '../step-function-validarGen.json');
    let stepFunctionGeneralDefinitionString = fs.readFileSync(stepFunctionValidarGeneralDefinitionPath, 'utf8');

    // Reemplazar variables dinámicas en el Step Function
    stepFunctionGeneralDefinitionString = stepFunctionGeneralDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujoValidarGen/g, fnInterDetalleFlujoValidarGen.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnValidarClientId/g, fnValidarClientId.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:GenerarClientidTransf/g, GenerarClientidTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarClientIdTransf/g, fnInterBorrarClientIdTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPrepararRespuestaFinalValidarGen/g, fnInterPrepararRespuestaFinalValidarGen.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarHashGen/g, fnInterBorrarHashGen.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterValidarHashGen/g, fnInterValidarHashGen.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionGen/g, fnInterPeticionGen.functionArn);

    const stepFunctionGeneralDefinition = JSON.parse(stepFunctionGeneralDefinitionString);
    
    const sfnNameValidarGen = `${this.stackName}-sfnValidarGen`;
    
        // Log Group para Step Function obtenerTarifa
    const stepFunctionGeneralLogGroup = new logs.LogGroup(this, `${sfnNameValidarGen}-logs`, {
      logGroupName: `/aws/stepfunctions/${sfnNameValidarGen}`,
      retention: RetentionDays.ONE_MONTH
    });


    const validacionGeneralStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-sfnValidarGen`, {
      stateMachineName: `${this.stackName}-sfnValidarGen`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionGeneralDefinition)),
      role: stepFunctionRole,
      timeout: cdk.Duration.minutes(3),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: {
        destination: stepFunctionGeneralLogGroup,
        level: stepfunctions.LogLevel.ALL,
        includeExecutionData: true
      }
    });

    // === Step Function: Validar OTP ===
    const stepFunctionOtpDefinitionPath = path.join(__dirname, '../step-function-validarSegurOtp.json');
    let stepFunctionValidarOtpDefinitionString = fs.readFileSync(stepFunctionOtpDefinitionPath, 'utf8');
    stepFunctionValidarOtpDefinitionString = stepFunctionValidarOtpDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterValidarHashSegurOTP/g, fnInterValidarHashSegurOTP.functionArn)
      //TODO: Colocar uno solo para este validar OTP
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujoValidarSegOtp/g, fnInterDetalleFlujoValidarSegOtp.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionValidarSegurOtp/g, fnInterPeticionValidarSegurOtp.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarHashSegurOTP/g, fnInterBorrarHashSegurOTP.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterCrearHashSegurOTP/g, fnInterCrearHashSegurOTP.functionArn);

    const stepFunctionOtpDefinition = JSON.parse(stepFunctionValidarOtpDefinitionString);

    const stepFunctionOtpLogGroup = new logs.LogGroup(this, `${this.stackName}-otp-stepfunction-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-SfnValidarSegurOTP`,
      retention: RetentionDays.ONE_MONTH
    });

    const validarOtpStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-otp-stepfunction`, {
      stateMachineName: `${this.stackName}-SfnValidarSegurOTP`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionOtpDefinition)),
      role: stepFunctionRole,
      timeout: cdk.Duration.minutes(3),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: { destination: stepFunctionOtpLogGroup, level: stepfunctions.LogLevel.ALL, includeExecutionData: true }
    });

    // === Step Function: Generar OTP ===
    const stepFunctionGenerarOtpDefinitionPath = path.join(__dirname, '../step-function-generarSegurOtp.json');
    let stepFunctionGenerarOtpDefinitionString = fs.readFileSync(stepFunctionGenerarOtpDefinitionPath, 'utf8');
    stepFunctionGenerarOtpDefinitionString = stepFunctionGenerarOtpDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionGenerarSegurOtp/g, fnInterPeticionGenerarSegurOtp.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujoGenerarSegOtp/g, fnInterDetalleFlujoGenerarSegOtp.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterCrearHashSegurOTP/g, fnInterCrearHashSegurOTP.functionArn);

    const stepFunctionGenerarOtpDefinition = JSON.parse(stepFunctionGenerarOtpDefinitionString);

    const stepFunctionGenerarOtpLogGroup = new logs.LogGroup(this, `${this.stackName}-generar-otp-stepfunction-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-SfnGenerarOTP`,
      retention: RetentionDays.ONE_MONTH
    });

    const generarOtpStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-generar-otp-stepfunction`, {
      stateMachineName: `${this.stackName}-SfnGenerarOTP`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionGenerarOtpDefinition)),
      role: stepFunctionRole,
      timeout: cdk.Duration.minutes(3),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: { destination: stepFunctionGenerarOtpLogGroup, level: stepfunctions.LogLevel.ALL, includeExecutionData: true }
    });

    // === Step Function: Generar Preguntas de Seguridad (PregSeg) ===
    const stepFunctionGenerarPregSegDefinitionPath = path.join(__dirname, '../step-function-generarSegurPregSeg.json');
    let stepFunctionGenerarPregSegDefinitionString = fs.readFileSync(stepFunctionGenerarPregSegDefinitionPath, 'utf8');
    stepFunctionGenerarPregSegDefinitionString = stepFunctionGenerarPregSegDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionGenerarSegurPregSeg/g, fnInterPeticionGenerarSegurPregSeg.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujoGenerarSegPregSeg/g, fnInterDetalleFlujoGenerarSegPregSeg.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterCrearHashSegurPregSeg/g, fnInterCrearHashSegurPregSeg.functionArn);

    const stepFunctionGenerarPregSegDefinition = JSON.parse(stepFunctionGenerarPregSegDefinitionString);

    const stepFunctionGenerarPregSegLogGroup = new logs.LogGroup(this, `${this.stackName}-generar-pregseg-stepfunction-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-SfnControlSegurPregSeg`,
      retention: RetentionDays.ONE_MONTH
    });

    const generarPregSegStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-generar-pregseg-stepfunction`, {
      stateMachineName: `${this.stackName}-SfnControlSegurPregSeg`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionGenerarPregSegDefinition)),
      role: stepFunctionRolePregSeg,
      timeout: cdk.Duration.minutes(3),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: { destination: stepFunctionGenerarPregSegLogGroup, level: stepfunctions.LogLevel.ALL, includeExecutionData: true }
    });

    // === Step Function: Validar Preguntas de Seguridad (PregSeg) ===
    const stepFunctionValidarPregSegDefinitionPath = path.join(__dirname, '../step-function-validarSegurPregSeg.json');
    let stepFunctionValidarPregSegDefinitionString = fs.readFileSync(stepFunctionValidarPregSegDefinitionPath, 'utf8');
    stepFunctionValidarPregSegDefinitionString = stepFunctionValidarPregSegDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujoValidarSegPregSeg/g, fnInterDetalleFlujoValidarSegPregSeg.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterValidarHashSegurPregSeg/g, fnInterValidarHashSegurPregSeg.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionValidarSegurPregSeg/g, fnInterPeticionValidarSegurPregSeg.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarHashSegurPregSeg/g, fnInterBorrarHashSegurPregSeg.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterCrearHashSegurPregSeg/g, fnInterCrearHashSegurPregSeg.functionArn);

    const stepFunctionValidarPregSegDefinition = JSON.parse(stepFunctionValidarPregSegDefinitionString);

    const stepFunctionValidarPregSegLogGroup = new logs.LogGroup(this, `${this.stackName}-validar-pregseg-stepfunction-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-SfnValidarSegurPregSeg`,
      retention: RetentionDays.ONE_MONTH
    });

    const validarPregSegStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-validar-pregseg-stepfunction`, {
      stateMachineName: `${this.stackName}-SfnValidarSegurPregSeg`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionValidarPregSegDefinition)),
      role: stepFunctionRolePregSeg,
      timeout: cdk.Duration.minutes(3),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: { destination: stepFunctionValidarPregSegLogGroup, level: stepfunctions.LogLevel.ALL, includeExecutionData: true }
    });

    // ===== INTEGRACIONES API GATEWAY PARA PREGUNTAS DE SEGURIDAD (PregSeg) =====
    
    // Integración para Generar Preguntas de Seguridad
    const stepFunctionGenerarPregSegIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-generar-pregseg-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionGenerarPregSegPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [generarPregSegStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${generarPregSegStateMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Type = $headers.X-Flow-Type)
#set($context.responseOverride.header.X-Hash-Generated = $headers.X-Hash-Generated)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Lo sentimos, por favor inténtalo más tarde",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function"
}
#end`
            }
          }
        ]
      }
    });

    // Integración para Validar Preguntas de Seguridad
    const stepFunctionValidarPregSegIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-validar-pregseg-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionValidarPregSegPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [validarPregSegStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${validarPregSegStateMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Type = $headers.X-Flow-Type)
#set($context.responseOverride.header.X-Hash-Generated = $headers.X-Hash-Generated)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Lo sentimos, por favor inténtalo más tarde",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function"
}
#end`
            }
          }
        ]
      }
    });

    // === Step Function: Registro de Dispositivo ===
    const stepFunctionRegistroDispositivoDefinitionPath = path.join(__dirname, '../step-function-controlSegurOtro.json');
    let stepFunctionRegistroDispositivoDefinitionString = fs.readFileSync(stepFunctionRegistroDispositivoDefinitionPath, 'utf8');
    stepFunctionRegistroDispositivoDefinitionString = stepFunctionRegistroDispositivoDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujo/g, fnInterDetalleFlujoControlSegurOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterValidarHashSeguridad/g, fnInterValidarHashControlSegurOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionControlSegurOtro/g, fnInterPeticionControlSegurOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:GenerarClientidControlSegurOtro/g, GenerarClientidControlSegurOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarClientIdTransf/g, fnInterBorrarClientIdTransf.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarHashSeguridad/g, fnInterBorrarHashControlSegurOtro.functionArn);

    const stepFunctionRegistroDispositivoDefinition = JSON.parse(stepFunctionRegistroDispositivoDefinitionString);

    const stepFunctionRegistroDispositivoLogGroup = new logs.LogGroup(this, `${this.stackName}-sfnValidarSegurOtro-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-sfnValidarSegurOtro`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const registroDispositivoStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-registro-dispositivo-stepfunction`, {
      stateMachineName: `${this.stackName}-sfnValidarSegurOtro`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionRegistroDispositivoDefinition)),
      role: stepFunctionRole,
      timeout: cdk.Duration.minutes(5),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: { destination: stepFunctionRegistroDispositivoLogGroup, level: stepfunctions.LogLevel.ALL, includeExecutionData: true }
    });

        //// - Step Function: controlMonetOtro - ////
    const stepFunctionEncadenamientoDefinitionPath = path.join(__dirname, '../step-function-sfnEncadenamiento.json');
    let stepFunctionEncadenamientoDefinitionString = fs.readFileSync(stepFunctionEncadenamientoDefinitionPath, 'utf8');
    stepFunctionEncadenamientoDefinitionString = stepFunctionEncadenamientoDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujoEncadenamiento/g, fnInterDetalleFlujoEncadenamiento.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPredecesorEncadenamiento/g, fnInterPredecesorEncadenamiento.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterEncadenamientoMapeoFinal/g, fnInterEncadenamientoMapeoFinal.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionEncadenamiento/g, fnInterPeticionEncadenamiento.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterSucesorEncadenamiento/g, fnInterSucesorEncadenamiento.functionArn);

    const stepFunctionEncadenamiento = JSON.parse(stepFunctionEncadenamientoDefinitionString);

    const stepFunctionEncadenamientoLogGroup = new logs.LogGroup(this, `${this.stackName}-sfnEncadenamiento-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-SfnEncadenamiento`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const EncadenamientoMachine = new stepfunctions.StateMachine(this, `${this.stackName}-sfnEncadenamiento`, {
      stateMachineName: `${this.stackName}-sfnEncadenamiento`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionEncadenamiento)),
      role: stepFunctionRoleEncadenamiento,
      timeout: cdk.Duration.minutes(3),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: { destination: stepFunctionEncadenamientoLogGroup, level: stepfunctions.LogLevel.ALL, includeExecutionData: true }
    });

    

    //// - Step Function: controlMonetOtro - ////
    const stepFunctionControlMonetOtroDefinitionPath = path.join(__dirname, '../step-function-controlMonetOtro.json');
    let stepFunctionControlMonetOtroDefinitionString = fs.readFileSync(stepFunctionControlMonetOtroDefinitionPath, 'utf8');
    stepFunctionControlMonetOtroDefinitionString = stepFunctionControlMonetOtroDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionControlMonetOtro/g, fnInterPeticionControlMonetOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujoControlMonetOtro/g, fnInterDetalleFlujoControlMonetOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterCrearHashControlMonetOtro/g, fnInterCrearHashControlMonetOtro.functionArn);

    const stepFunctionControlMonetOtro = JSON.parse(stepFunctionControlMonetOtroDefinitionString);

    const stepFunctionControlMonetOtroLogGroup = new logs.LogGroup(this, `${this.stackName}-sfnControlMonetOtro-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-SfnControlMonetOtro`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const controlMonetOtroMachine = new stepfunctions.StateMachine(this, `${this.stackName}-sfnControlMonetOtro`, {
      stateMachineName: `${this.stackName}-sfnControlMonetOtro`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionControlMonetOtro)),
      role: stepFunctionRoleMonetOtros,
      timeout: cdk.Duration.minutes(3),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: { destination: stepFunctionControlMonetOtroLogGroup, level: stepfunctions.LogLevel.ALL, includeExecutionData: true }
    });


    // === Step Function: Retiro Sin Tarjeta ===
    const stepFunctionRetiroSinTarjetaDefinitionPath = path.join(__dirname, '../step-function-ejecutarMonetOtro.json');
    let stepFunctionRetiroSinTarjetaDefinitionString = fs.readFileSync(stepFunctionRetiroSinTarjetaDefinitionPath, 'utf8');
    stepFunctionRetiroSinTarjetaDefinitionString = stepFunctionRetiroSinTarjetaDefinitionString
      .replace(/\$\{AWS::Region\}/g, this.region)
      .replace(/\$\{AWS::AccountId\}/g, this.account)
      .replace(/\$\{StackName\}/g, this.stackName)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterDetalleFlujo/g, fnInterDetalleFlujoValidarGen.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnValidarClientId/g, fnValidarClientId.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterValidarHashMonetOtro/g, fnInterValidarHashMonetOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPeticionMonetOtro/g, fnInterPeticionMonetOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterPrepararRespuestaFinalMonetOtro/g, fnInterPrepararRespuestaFinalMonetOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarHashMonetOtro/g, fnInterBorrarHashMonetOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:fnInterBorrarClientIdMonetOtro/g, fnInterBorrarClientIdMonetOtro.functionArn)
      .replace(/arn:aws:lambda:\$\{aws:region\}:\$\{aws:accountId\}:function:GenerarClientidMonetOtro/g, GenerarClientidMonetOtro.functionArn);

    const stepFunctionRetiroSinTarjetaDefinition = JSON.parse(stepFunctionRetiroSinTarjetaDefinitionString);

    const stepFunctionRetiroSinTarjetaLogGroup = new logs.LogGroup(this, `${this.stackName}-retiro-sin-tarjeta-stepfunction-logs`, {
      logGroupName: `/aws/stepfunctions/${this.stackName}-SfnEjecutarMonetOtro`,
      retention: RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const retiroSinTarjetaStateMachine = new stepfunctions.StateMachine(this, `${this.stackName}-retiro-sin-tarjeta-stepfunction`, {
      stateMachineName: `${this.stackName}-SfnEjecutarMonetOtro`,
      definitionBody: stepfunctions.DefinitionBody.fromString(JSON.stringify(stepFunctionRetiroSinTarjetaDefinition)),
      role: stepFunctionRole,
      timeout: cdk.Duration.minutes(5),
      tracingEnabled: true,
      stateMachineType: stepfunctions.StateMachineType.EXPRESS,
      logs: { destination: stepFunctionRetiroSinTarjetaLogGroup, level: stepfunctions.LogLevel.ALL, includeExecutionData: true }
    });

    // Integraciones al API Gateway
    const gerarClientIdLogin = new apigateway.LambdaIntegration(fnGenerarClientIdLogin);


    // Integración del Step Function con API Gateway
    const stepFunctionIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [interceptorStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${interceptorStateMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"servicioTarget\\": \\"$util.escapeJavaScript($input.params('servicioTarget'))\\", \\"generarHashLambda\\": \\"${fnInterCrearHashTransf.functionArn}\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Completed = $headers.X-Flow-Completed)
#set($context.responseOverride.header.X-Original-Headers-Processed = $headers.X-Original-Headers-Processed)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Error en el procesamiento del interceptor",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function"
}
#end`
            }
          }
        ]
      }
    });

    // Integración del Step Function obtenerTarifa con API Gateway
    const stepFunctionObtenerTarifaIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-obtenertarifa-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionObtenerTarifaPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [obtenerTarifaStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${obtenerTarifaStateMachine.stateMachineArn}",
            $util.escapeJavaScript($input)

            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Type = $headers.X-Flow-Type)
#set($context.responseOverride.header.X-Hash-Generated = $headers.X-Hash-Generated)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Error en el procesamiento de obtener tarifa",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function"
}
#end`
            }
          }
        ]
      }
    });


    // Integración del Step Function obtenerTarifa con API Gateway
    const stepFunctionValidarGeneralIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-control-gen-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionObtenerTarifaPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [validacionGeneralStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${validacionGeneralStateMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$context.resourcePath\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Type = $headers.X-Flow-Type)
#set($context.responseOverride.header.X-Hash-Generated = $headers.X-Hash-Generated)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Lo sentimos, por favor inténtalo más tarde",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function"
}
#end`
            }
          }
        ]
      }
    });

    // API REST
    const api = new apigateway.RestApi(this, `apiGateway`, {
      restApiName: `${this.stackName}`,
      deployOptions: {
        tracingEnabled: true,
        stageName: `${config.STAGE}`,
        metricsEnabled: true
      },
      endpointTypes: [apigateway.EndpointType.REGIONAL]
    });

    const gerarClientIdLoginResource = api.root;
    gerarClientIdLoginResource.addResource("iniciarsesion")
    .addMethod(
      'POST',
      gerarClientIdLogin
    );

 
    /// Authorizer para el interceptor
    const interceptorAuthorizer = new apigateway.RequestAuthorizer(this, `${this.stackName}-interceptor-authorizer`, {
      handler: fnValidarClientId,
      identitySources: [
        apigateway.IdentitySource.header('clientId'),
        apigateway.IdentitySource.header('identificacion')
      ],
      authorizerName: `${this.stackName}-interceptor-authorizer`,
      resultsCacheTtl: cdk.Duration.seconds(0)
    });


    // Endpoint para obtener tarifa (nuevo Step Function)
    const cuentaResource = api.root.addResource("cuenta");
    cuentaResource.addResource("obtenertarifa")
    .addMethod(
      'POST',
      stepFunctionObtenerTarifaIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          },
          {
            statusCode: '500',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );

    // Método común para configurar endpoints
      cuentaResource.addResource("transferencia").addMethod(
        'POST',
        stepFunctionIntegration,
        {
          authorizer: interceptorAuthorizer,
          requestParameters: {
            'method.request.querystring.servicioTarget': false // opcional
          },
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                // Headers se manejan directamente en responseTemplate
              },
              responseModels: {
                'application/json': apigateway.Model.EMPTY_MODEL
              }
            }
          ]
        }
      );


    const interceptorResource = api.root.addResource("interceptor");
    interceptorResource.addResource("transferencia").addMethod(
        'POST',
        stepFunctionIntegration,
        {
          authorizer: interceptorAuthorizer,
          requestParameters: {
            'method.request.querystring.servicioTarget': false // opcional
          },
          methodResponses: [
            {
              statusCode: '200',
              responseParameters: {
                // Headers se manejan directamente en responseTemplate
              },
              responseModels: {
                'application/json': apigateway.Model.EMPTY_MODEL
              }
            }
          ]
        }
      );


      
    // Endpoint para validaciones generales (nuevo Step Function)
    const agendaResource = api.root.addResource("agenda");
    agendaResource.addResource("insertarcuentasotrosbancos")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );
    agendaResource.addResource("insertarcuentasterceros")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );
    agendaResource.addResource("editarcuentasotrosbancos")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );
    agendaResource.addResource("editarcuentasterceros")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );

    // Nuevos endpoints para tarjetas terceros
    agendaResource.addResource("insertartarjetasterceros")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );

    agendaResource.addResource("editartarjetasterceros")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );

    // Nuevos endpoints para tarjetas otros bancos
    agendaResource.addResource("insertartarjetasotrosbancos")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );

    agendaResource.addResource("editartarjetasotrosbancos")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );

    // Nuevo endpoint para agenda pago servicios
    agendaResource.addResource("ingresaragendapagoservicios")
    .addMethod(
      'POST',
      stepFunctionValidarGeneralIntegration,
      {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      }
    );

    // Endpoint para validar OTP
    const seguridadResource = api.root.addResource("seguridad");

    const stepFunctionOtpIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-otp-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionOtpPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [validarOtpStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${validarOtpStateMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Type = $headers.X-Flow-Type)
#set($context.responseOverride.header.X-Hash-Generated = $headers.X-Hash-Generated)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Lo sentimos, por favor inténtalo más tarde",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function"
}
#end`
            }
          }
        ]
      }
    });

    seguridadResource.addResource("validarotpid")
      .addMethod('POST', stepFunctionOtpIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });

    // Endpoint para generar OTP
    const stepFunctionGenerarOtpIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-generar-otp-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionGenerarOtpPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [generarOtpStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${generarOtpStateMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Type = $headers.X-Flow-Type)
#set($context.responseOverride.header.X-Hash-Generated = $headers.X-Hash-Generated)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Lo sentimos, por favor inténtalo más tarde",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function"
}
#end`
            }
          }
        ]
      }
    });


    seguridadResource.addResource("generarotpid")
      .addMethod('POST', stepFunctionGenerarOtpIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });

    // Endpoint para generar Preguntas de Seguridad (PregSeg)
    seguridadResource.addResource("obtenerpreguntadesafio")
      .addMethod('POST', stepFunctionGenerarPregSegIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });

    // Endpoint para validar Preguntas de Seguridad (PregSeg)
    seguridadResource.addResource("validarrespuestadesafio")
      .addMethod('POST', stepFunctionValidarPregSegIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });

    // Integración para registro de dispositivo
    const stepFunctionRegistroDispositivoIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-registro-dispositivo-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionRegistroDispositivoPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [registroDispositivoStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${registroDispositivoStateMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Type = $headers.X-Flow-Type)
#set($context.responseOverride.header.X-Hash-Generated = $headers.X-Hash-Generated)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Lo sentimos, por favor inténtalo más tarde",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function"
}
#end`
            }
          }
        ]
      }
    });

    // Endpoint para registro de dispositivo
    const usuarioResource = api.root.addResource("usuario");
    usuarioResource.addResource("registrodispositivo")
      .addMethod('POST', stepFunctionRegistroDispositivoIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });

    // Integración para retiro sin tarjeta
    const stepFunctionRetiroSinTarjetaIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-retiro-sin-tarjeta-stepfunction-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionRetiroSinTarjetaPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [retiroSinTarjetaStateMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${retiroSinTarjetaStateMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Completed = $headers.X-Flow-Completed)
#set($context.responseOverride.header.X-Original-Headers-Processed = $headers.X-Original-Headers-Processed)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Error en el retiro sin tarjeta",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function de retiro"
}
#end`
            }
          }
        ]
      }
    });



    // Integración para retiro sin tarjeta
    const stepFunctionSfnMonetOtroIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-sfn-control-monet-otro-logs-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionRetiroSinTarjetaPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [controlMonetOtroMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${controlMonetOtroMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Completed = $headers.X-Flow-Completed)
#set($context.responseOverride.header.X-Original-Headers-Processed = $headers.X-Original-Headers-Processed)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Error en el retiro sin tarjeta",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function de retiro"
}
#end`
            }
          }
        ]
      }
    });



    // Integración para retiro sin tarjeta
    const stepFunctionEncadenamientoIntegration = new apigateway.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: new iam.Role(this, `${this.stackName}-apigw-sfn-control-encadenamiento-logs-role`, {
          assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
          inlinePolicies: {
            StepFunctionRetiroSinTarjetaPolicy: new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['states:StartSyncExecution'],
                  resources: [EncadenamientoMachine.stateMachineArn]
                })
              ]
            })
          }
        }),
        requestTemplates: {
          'application/json': `{
            "stateMachineArn": "${EncadenamientoMachine.stateMachineArn}",
            "input": "{ \\"body\\": $util.escapeJavaScript($input.body).replaceAll("\\\\'", ""), \\"headers\\": { #foreach($param in $input.params().header.keySet()) \\"$param\\": \\"$util.escapeJavaScript($input.params().header.get($param))\\"#if($foreach.hasNext),#end #end }, \\"authorizerContext\\": { #foreach($param in $context.authorizer.keySet()) \\"$param\\": \\"$util.escapeJavaScript($context.authorizer.get($param))\\"#if($foreach.hasNext),#end #end }, \\"resource\\": \\"$util.escapeJavaScript($context.resourcePath)\\", \\"httpMethod\\": \\"$util.escapeJavaScript($context.httpMethod)\\", \\"originalRequestId\\": \\"$util.escapeJavaScript($context.requestId)\\", \\"stage\\": \\"$util.escapeJavaScript($context.stage)\\" }"
          }`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            },
            responseTemplates: {
              'application/json': `#set($inputRoot = $util.parseJson($input.body))
#if($inputRoot.output)
#set($output = $util.parseJson($inputRoot.output))
#set($headers = $output.headers)
#if($headers)
#set($context.responseOverride.header.referrer-policy = $headers.referrer-policy)
#set($context.responseOverride.header.content-security-policy = $headers.content-security-policy)
#set($context.responseOverride.header.x-content-type-options = $headers.x-content-type-options)
#set($context.responseOverride.header.Permissions-Policy = $headers.Permissions-Policy)
#set($context.responseOverride.header.X-Frame-Options = $headers.X-Frame-Options)
#set($context.responseOverride.header.Strict-Transport-Security = $headers.Strict-Transport-Security)
#set($context.responseOverride.header.Cache-Control = $headers.Cache-Control)
#set($context.responseOverride.header.X-Flow-Completed = $headers.X-Flow-Completed)
#set($context.responseOverride.header.X-Original-Headers-Processed = $headers.X-Original-Headers-Processed)
#end
#if($output.body)
$output.body
#else
$util.toJson($output)
#end
#else
{
  "codigoError": 9999,
  "mensajeUsuario": "Error en el retiro sin tarjeta",
  "mensajeSistema": "No se pudo obtener respuesta del Step Function de retiro"
}
#end`
            }
          }
        ]
      }
    });


    // Endpoints para retiro sin tarjeta
    const tarjetaResource = api.root.addResource("tarjeta");
    tarjetaResource.addResource("pagaravanceefectivo")
      .addMethod('POST', stepFunctionRetiroSinTarjetaIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });
    
    // Nuevo endpoint para pagar tarjeta de crédito
    tarjetaResource.addResource("pagartarjetacredito")
      .addMethod('POST', stepFunctionValidarGeneralIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              // Headers se manejan directamente en responseTemplate
            }
          }
        ]
      });
    
    
    //Pago rápido
    const pagorapidoResource = api.root.addResource("pagorapido");
    
    pagorapidoResource.addResource("validarservicio")
      .addMethod('POST', stepFunctionEncadenamientoIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });
    
    // Crear el recurso cuenta/retiro/sin-tarjeta
    const cuentaRetiroResource = api.root.addResource("cuenta-retiro");
    const sinTarjetaResource = cuentaRetiroResource.addResource("sin-tarjeta");
    
    sinTarjetaResource.addResource("codigo")
      .addMethod('POST', stepFunctionRetiroSinTarjetaIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });
    
    sinTarjetaResource.addResource("historico")
      .addMethod('POST', stepFunctionEncadenamientoIntegration, {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: interceptorAuthorizer,
        requestParameters: {
          'method.request.header.clientId': true,
          'method.request.header.identificacion': true
        },
        methodResponses: [{ statusCode: '200' }]
      });

      // Custom Resource para leer configuración de servicios HTTP Dynamo
      const serviciosHttpProvider = new cr.Provider(this, `${this.stackName}-ServiciosHttpProvider`, {
        onEventHandler: fnHabilitarAutorizadorServicios,
      });
    
      const serviciosHttpResource = new cdk.CustomResource(this, `${this.stackName}-ServiciosHttpResource`, {
        serviceToken: serviciosHttpProvider.serviceToken,
        properties: {
          Timestamp: Date.now(),
          RestApiId: api.restApiId,
          StageName: `${config.STAGE}`,
          TableName: interDetalleDb.tableName
        }
      });

  }
}