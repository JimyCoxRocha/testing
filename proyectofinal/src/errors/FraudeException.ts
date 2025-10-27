export class FraudeException extends Error {
    public codigoError: number;
    public mensajeInterno: string;
    public mensajeUsuario: string;
  
    constructor(codigoError: number, mensajeInterno: string, mensajeUsuario: string) {
      super(mensajeInterno);
      this.codigoError = codigoError;
      this.mensajeInterno = mensajeInterno;
      this.mensajeUsuario = mensajeUsuario;
      this.name = 'FraudeException';
    }
} 