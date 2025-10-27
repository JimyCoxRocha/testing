import { AttributeValue, DynamoDBClient, PutItemCommand, GetItemCommand, GetItemCommandOutput, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { IDetalleFlujo, IDigitalDb, IEncadenamiento, IServiciosHttpResponse } from "../beans/general.interface";

const client = new DynamoDBClient({ region: process.env.region });
const docClient = DynamoDBDocumentClient.from(client);

export const putItem = async (tableElement: Record<string, AttributeValue>, tableName: string) => {
  try {
    const command = new PutItemCommand({
      TableName: tableName,
      Item: tableElement,
    });

    return await docClient.send(command);

  } catch (error) {
    console.error('Ha ocurrido un error al guardar los datos en base de datos: ', error);
    return null;
  }
}; 


export const getEstatusDigital = async(hashDigital: string, tableName: string): Promise<IDigitalDb> => {

  try {

    const resultado = await getItemCustom(hashDigital, tableName);
    console.log("DYNAMO: respuesta de consulta => ", JSON.stringify(resultado));
    if(!!resultado?.Item && !!resultado?.Item?.id?.S){
      return {
        hash: resultado.Item.id.S,
        existe: true,
        fechaExpiracion: resultado.Item.fechaExpiracion.S as string
      }
    }
    
  } catch (error) {
    console.error('Ha ocurrido un error al consultar los datos en base de datos: ' + error);
  }
  return { existe: false } as IDigitalDb;

}

export const getDetalleFlujo = async(id: string, tableName: string): Promise<IDetalleFlujo> => {

  try {

    const resultado = await getItemCustom(id, tableName);
    console.log("DYNAMO: respuesta de consulta getDetalleFlujo => ", JSON.stringify(resultado));
    if(!!resultado?.Item && !!resultado?.Item?.id?.S){
      return {
        id: resultado.Item.id.S,
        value: resultado.Item.value.S as string
      }
    }
    
  } catch (error) {
    console.error('Ha ocurrido un error al consultar los datos en base de datos: ' + error);
  }
  return { id: "", value: "" } as IDetalleFlujo;

}

export const getServiciosHttp = async(id: string, tableName: string): Promise<IServiciosHttpResponse> => {
  try {
    const resultado = await getItemCustom(id, tableName);
    console.log("DYNAMO: respuesta de consulta getServiciosHttp => ", JSON.stringify(resultado));
   
    if(!!resultado?.Item && !!resultado?.Item?.id?.S && !!resultado?.Item?.value?.S){
      return JSON.parse(resultado.Item.value.S) as IServiciosHttpResponse;
    }
   
  } catch (error) {
    console.error('Ha ocurrido un error al consultar los servicios HTTP en base de datos: ' + error);
  }
 
  return {} as IServiciosHttpResponse;
}

export const getEncadenamientoDb = async(id: string, tableName: string): Promise<IEncadenamiento> => {

  try {

    const resultado = await getItemCustom(id, tableName);
    console.log("DYNAMO: respuesta de consulta => ", JSON.stringify(resultado));
    if(!!resultado?.Item && !!resultado?.Item?.id?.S){
      return {
        hash: resultado.Item.id.S,
        existe: true,
        fechaExpiracion: resultado.Item.fechaExpiracion.S as string
      }
    }
    
  } catch (error) {
    console.error('Ha ocurrido un error al consultar los datos en base de datos: ' + error);
  }
  return { existe: false } as IEncadenamiento;

}

const getItemCustom = async (key: string, tableName: string): Promise<GetItemCommandOutput> => {
    const command = new GetItemCommand({
      "Key": {
        "id": {
          "S": key
        }
      },
      "TableName": tableName
    });
    
    return client.send(command);
};


export const deleteItem = async (key: string, tableName: string): Promise<void> => {
    
  const command = new DeleteItemCommand({
    "Key": {
      "id": {
        "S": key
      }
    },
    "TableName": tableName
  });
  
  await client.send(command);
};