import { getServiciosHttp } from '../datsource/dynamodb';
import { IServicioHttpConfig } from "../beans/general.interface";
import {
  APIGatewayClient,
  GetResourcesCommand,
  CreateResourceCommand,
  PutMethodCommand,
  PutIntegrationCommand,
  CreateDeploymentCommand
} from "@aws-sdk/client-api-gateway";
 
interface CustomResourceEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResourceProperties: {
    Timestamp: number;
    RestApiId?: string;
    StageName?: string;
    TableName?: string;
  };
  PhysicalResourceId?: string;
}
 
export const fnHabilitarAutorizadorServicios = async (event: CustomResourceEvent): Promise<any> => {
  console.log('fnHabilitarAutorizadorServicios:', JSON.stringify(event));
 
  const apigw = new APIGatewayClient({ region: process.env.AWS_REGION || 'us-east-1' });
 
  try {
    if (event.RequestType === 'Delete') {
      // No eliminamos recursos por seguridad
      return { PhysicalResourceId: event.PhysicalResourceId || `servicios-http-${Date.now()}` };
    }
 
    const restApiId = event.ResourceProperties.RestApiId;
    const stageName = event.ResourceProperties.StageName;
    const tableName = event.ResourceProperties.TableName || process.env.DB_DETALLE_PARAMETRIZABLE;
 
    if (!restApiId) throw new Error('RestApiId no proporcionado en ResourceProperties');
    if (!stageName) throw new Error('StageName no proporcionado en ResourceProperties');
    if (!tableName) throw new Error('TableName no disponible (propiedad o env)');
 
    console.log(`RestApiId=${restApiId} StageName=${stageName} TableName=${tableName}`);
 
    // Obtener configuración desde DynamoDB
    const serviciosConfig = await getServiciosHttp('servicioshttp', tableName);
    if (!serviciosConfig || Object.keys(serviciosConfig).length === 0) {
      console.log('No hay servicios HTTP configurados en DynamoDB.');
      return { PhysicalResourceId: event.PhysicalResourceId || `servicios-http-${Date.now()}`, Data: { created: [] } };
    }
 
    const serviciosArray: IServicioHttpConfig[] = Object.values(serviciosConfig);
    console.log('Servicios HTTP obtenidos:', JSON.stringify(serviciosArray));
 
 
    // Obtener recursos existentes
    const resourcesResp: any = await apigw.send(new GetResourcesCommand({ restApiId, limit: 500 }));
    const resources: any[] = resourcesResp.items || [];
 
    // buscar el recurso raíz
    const root = resources.find((r: any) => r.path === '/');
    if (!root) throw new Error('No se encontró el recurso raíz del API');
 
    // Helper: buscar hijo por pathPart (tipamos 'r' como any)
    const findChild = (parentId: string, part: string) =>
      resources.find((r: any) => r.parentId === parentId && r.pathPart === part);
     
    // Helper: crear recurso y actualizar cache
    const createResource = async (parentId: string, part: string) => {
      const resp: any = await apigw.send(new CreateResourceCommand({ restApiId, parentId, pathPart: part }));
      resources.push(resp);
      return resp;
    };
 
    const createdPaths: string[] = [];
 
    for (const servicio of serviciosArray) {
 
      if (!servicio.path || !servicio.url) {
        console.warn('Servicio inválido (se requiere path y url):', servicio);
        continue;
      }
      const method = (servicio.method || 'ANY').toUpperCase();
      const cleaned = servicio.path.replace(/^\//, '').replace(/\/$/, '');
      const segments = cleaned ? cleaned.split('/') : [];
 
      let parentId = root.id as string;
 
      // Crear/obtener cada segmento
      for (const seg of segments) {
        let child = findChild(parentId, seg);
        if (!child) {
          console.log(`Creando recurso '${seg}' bajo parent ${parentId}`);
          child = await createResource(parentId, seg);
        }
        parentId = child.id as string;
      }
 
      // Crear método (si no existe)
      try {
        // putMethod (crea o reemplaza)
        await apigw.send(new PutMethodCommand({
          restApiId,
          resourceId: parentId,
          httpMethod: method,
          authorizationType: 'NONE',
          apiKeyRequired: false
        }));
 
        // Crear integración HTTP_PROXY hacia la URL del servicio
        await apigw.send(new PutIntegrationCommand({
          restApiId,
          resourceId: parentId,
          httpMethod: method,
          type: 'HTTP_PROXY',
          integrationHttpMethod: servicio.method || 'POST',
          uri: servicio.url
        }));
 
        createdPaths.push(`${servicio.path} [${method}] -> ${servicio.url}`);
        console.log(`Configurado ${servicio.path} ${method} -> ${servicio.url}`);
      } catch (err) {
        console.error('Error creando método/integración para', servicio.path, err);
      }
    }
 
    // Crear deployment para aplicar cambios al stage
    try {
      const dep: any = await apigw.send(new CreateDeploymentCommand({
        restApiId,
        stageName,
        description: `Deployment from custom resource ${Date.now()}`
      }));
      console.log('Deployment creado:', dep.id);
    } catch (depErr) {
      console.error('Error creando deployment:', depErr);
    }
 
    return {
      PhysicalResourceId: event.PhysicalResourceId || `servicios-http-${Date.now()}`,
      Data: {
        created: createdPaths
      }
    };
  } catch (error) {
    console.error('Error crítico al gestionar servicios HTTP:', error);
    throw error;
  }
};