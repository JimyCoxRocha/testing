import { IHeader, IResponseAuth, ISesionUnicaUsuario, IUsuarioSesion } from '../beans/general.interface';
import { SemillaRepository } from '../repository/SemillaRepository.GenerarClientId';
import { SesionUsuarioRepository } from '../repository/SesionUsuarioRepository.GenerarClientId';
import jwt from 'jsonwebtoken';
import PeticionesService from './PeticionesService';
import { IiniciarSesion } from '../beans/usuariopy.interface';
import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { Util } from '../utils/utils';
import { Constants } from '../constant/Constants';

export class AuthService {

  async generarAutorizacion(sesionUnica: ISesionUnicaUsuario): Promise<string> {
    const semillaRepo = new SemillaRepository();

    const semilla = await semillaRepo.obtenerSemilla();
    const clientId = await this.generarClientId(semilla, sesionUnica);
    await this.guardarTokenSesion(clientId, sesionUnica);

    console.log("token: ", clientId);

    return clientId;
  }

  async generarClientId(semilla: string, sesionUnica: ISesionUnicaUsuario): Promise<string> {
    return jwt.sign({ ...sesionUnica }, semilla, { algorithm: 'HS512' });
  }

  async guardarTokenSesion(clientId: string, usuarioSesion: ISesionUnicaUsuario): Promise<void> {
    const sesionUsuarioRepo = new SesionUsuarioRepository();
    const sesionUsuario: IUsuarioSesion = { ...usuarioSesion, id: clientId };
    await sesionUsuarioRepo.guardarSesion(Number(process.env.DURACION_SESION as string), sesionUsuario);
  }

  async peticionLogin(body: string, header: APIGatewayProxyEventHeaders):Promise<IResponseAuth> {
    const peticionService = new PeticionesService();
    let obtenerClientId = "";
    // Validación de caracteres especiales
    const valueHeader: IHeader = Util.adicionaClienteMigradoHeader(header);
    const headerRequeridos = {
      identificacion: valueHeader.identificacion,
      secuencial: valueHeader.secuencial
    }


    Util.validateBodySize(body)
    
    Util.validarCaracteresEspeciales({...JSON.parse(body), headerRequeridos});

    const wsResponse = await peticionService.llamarServicioIniciarSesionStf(body, valueHeader) as IiniciarSesion

    if (wsResponse.codigoError === Constants.CODIGO_ERROR_OK || wsResponse.codigoError === Constants.CODIGO_ERROR_EXPIRACION_CLAVE)
      obtenerClientId = await this.generarAutorizacion({
          sessionId: wsResponse.sesionUnica.sessionId,
          token: wsResponse.sesionUnica.token,
          uriTech: wsResponse.sesionUnica.uriTech,
          identificacion: wsResponse.cliente.identificacion.identificacion
      });

    return {
        body: JSON.stringify({ ...wsResponse, clientId: obtenerClientId })
    };


  }

} 