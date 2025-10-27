import moment from 'moment';
import { putItem } from '../datsource/dynamodb';
import { DiccionarioMensajes } from '../constant/response-dictionary';
import { IUsuarioSesion } from '../beans/general.interface';

export class SesionUsuarioRepository {
  async guardarSesion(duracionMinutos: number, props: IUsuarioSesion): Promise<void> {
    const fechaHoraExpiration = this.obtenerExpiresAtDate(duracionMinutos);
    console.log("guardarSesion - obtenerExpiresAtDate " + fechaHoraExpiration);

    const expiresAt = this.obtenerExpiresAt(duracionMinutos);
    console.log("guardarSesion " + expiresAt);

    const sesionUsuario = {
      'id': { S: props.id },
      'expires_at': { N: `${expiresAt}` },
      'sessionId': { S: props.sessionId },
      'token': { S: props.token },
      'uriTech': { S: props.uriTech },
      'expires_date': { S: fechaHoraExpiration }
    };

    await putItem(sesionUsuario, process.env.TABLA_SESION_USUARIO as string);
  }

  obtenerExpiresAt(duracionMinutos: number): number {
    return Math.floor((new Date().getTime() + (duracionMinutos) * 60 * 1000) / 1000);
  }

  obtenerExpiresAtDate(duracionMinutos: number): string {
    return moment().subtract(5, 'hours').add(duracionMinutos, "minutes").format(DiccionarioMensajes.formatoFechaHora);
  }
} 