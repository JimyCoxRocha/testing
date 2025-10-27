export enum Constants {
    CODIGO_ERROR_OK = 0,
    CODIGO_ERROR_GENERAL = 9999,
    CODIGO_ERROR_ENCADENAMIENTO = 9402,
    CODIGO_ERROR_VALIDACION = 403,
    MSG_EXITOSO_USUARIO_GENERAL = "TRANSACCION EXITOSA",
    MSG_ERROR_ENCADENAMIENTO = "No pudimos validar tu solicitud, por favor inténtalo mas tarde",
    MSG_ERROR_USUARIO_GENERAL = "No pudimos procesar tu información, por favor inténtalo mas tarde",
    MSG_INFORMACION_INCOMPLETA_O_INCONSISTENTE = "Información incompleta o inconsistente",
    CODIGO_ERROR_EXPIRACION_CLAVE = 1040,
    MSG_INFORMACION_INCONSISTENTE = "Información inconsistente",
    MSG_ERROR_GENERAL = 'No pudimos procesar tu información, por favor inténtalo mas tarde',
    
    // Constantes específicas para registro de dispositivo
    CODIGO_ERROR_REGISTRO_DISPOSITIVO = 9404,
    MSG_ERROR_REGISTRO_DISPOSITIVO = "Error en el registro del dispositivo",
    MSG_ERROR_NOMBRE_DISPOSITIVO_INVALIDO = "El nombre del dispositivo no es válido",
    MSG_ERROR_IDENTIFICACION_REQUERIDA = "La identificación del usuario es requerida",
    MSG_ERROR_CONFIGURACION_FLUJO = "Error en la configuración del flujo",
    MSG_ERROR_SERVICIO_REGISTRO = "Error en el servicio de registro de dispositivo",
    MSG_ERROR_CACHE_SESION = "Error al actualizar el caché de sesión",
    
    // Constantes para validación de entrada y seguridad
    CODIGO_ERROR_VALIDACION_ENTRADA = 9420,
    CODIGO_ERROR_IDENTIFICACION_NO_PROPORCIONADA = 9501,
    CODIGO_ERROR_CEDULA_INCONSISTENTE = 9421,
    MSG_ERROR_IDENTIFICACION_NO_PROPORCIONADA = "La identificación es requerida",
    MSG_ERROR_CEDULA_INCONSISTENTE = "Información inconsistente detectada",
    MSG_ERROR_VALIDACION_ENTRADA = "Error en la validación de entrada",
    
    PAIS = 'EC',
    CODIGOMIS = '0',
    NOMBREEQUIPO = 'alias',
    NUMERO = '0900000000',
    IMEI = '000000000000000',
    MARCA = 'Telefono',
    MODELO = '00000',
    SERIAL = '1234567890',
    IDENTIFICACION = '0999999999',
    TIPOLOGIN = 'C',
    MIN_TIME_LAMBDA_RESPONSE = 300 
  } 