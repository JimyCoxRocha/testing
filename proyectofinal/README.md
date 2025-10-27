# 🏦 BMP MSP Verificar Seguridad

## 📖 Descripción del Proyecto

Microservicio de seguridad bancaria serverless en AWS para **Banco Bolivariano**. Proporciona autenticación, validación de sesiones y protección contra fraudes para operaciones de banca digital.

**Arquitectura:**
- API Gateway REST API con autorización personalizada
- Funciones Lambda especializadas
- Step Functions parametrizables
- DynamoDB para sesiones y hashes de seguridad
- Custom Request Authorizer centralizado

---

## 🛡️ Interceptor Authorizer

### Objetivo

El `interceptorAuthorizer` es un **Custom Request Authorizer** de API Gateway que valida todas las operaciones bancarias protegidas antes de permitir su ejecución.

**Funciones principales:**
1. Validar autenticidad del `clientId` (token JWT generado con una semilla, sessionId y token de CMM)
2. Verificar sesión activa en DynamoDB
3. Validar consistencia de identificación usuario
4. Detectar posibles fraudes
5. Propagar contexto de autorización

### Patrón de Seguridad

**Patrón multicapa basado en:**

**1. Token-Based Authentication (JWT)**
- Autenticación stateless con tokens JWT como `clientId`
- Token contiene información cifrada del usuario

**2. Defense in Depth**
```
Cliente → API Gateway → interceptorAuthorizer
          ↓
  1. Validar clientId existe
  2. Consultar DynamoDB (TABLA_SESION_USUARIO)
  3. Verificar expiración
  4. Decodificar JWT
  5. Validar identificación cruzada
  6. Generar política IAM (Allow/Deny)
          ↓
Step Function → Backend
```

**3. Fraud Detection Pattern**
- Validación cruzada: header.identificacion vs JWT.identificacion
- Detección de inconsistencias
- `FraudeException` con códigos específicos

### Implementación

**Ubicación:** `lib/bmp-msp-verificarseg-stack.ts`

```typescript
const interceptorAuthorizer = new apigateway.RequestAuthorizer(
  this, `${this.stackName}-interceptor-authorizer`, {
    handler: fnValidarClientId,
    identitySources: [
      apigateway.IdentitySource.header('clientId'),
      apigateway.IdentitySource.header('identificacion')
    ],
    resultsCacheTtl: cdk.Duration.seconds(0)
  }
);
```

**Lambda Handler:** `src/functions/fnValidarClientId.ts`

```typescript
// 1. Extrae headers (clientId, identificacion)
// 2. Valida sesión en DynamoDB
await ValidacionesService.existeClientId(headers);
// 3. Valida identificación cruzada JWT vs Header
await ValidacionesService.validarIdentificacion(headers);
// 4. Retorna Allow/Deny Policy
```

### Endpoints Protegidos

**19 endpoints protegidos:**

| Recurso | Endpoints |
|---------|-----------|
| **Cuenta** | `/cuenta/obtenertarifa`, `/cuenta/transferencia` |
| **Interceptor** | `/interceptor/transferencia` |
| **Agenda** | `/agenda/insertarcuentasotrosbancos`, `/agenda/insertarcuentasterceros`, `/agenda/editarcuentasotrosbancos`, `/agenda/editarcuentasterceros`, `/agenda/insertartarjetasterceros`, `/agenda/editartarjetasterceros`, `/agenda/insertartarjetasotrosbancos`, `/agenda/editartarjetasotrosbancos`, `/agenda/ingresaragendapagoservicios` |
| **Seguridad** | `/seguridad/validarotpid`, `/seguridad/generarotpid` |
| **Usuario** | `/usuario/registrodispositivo` |
| **Tarjeta** | `/tarjeta/pagaravanceefectivo`, `/tarjeta/pagartarjetacredito` |

**Endpoint público (sin authorizer):** `/iniciarsesion` - Genera el clientId inicial

### Ejemplo de Uso

**1. Iniciar sesión:**
```bash
POST /iniciarsesion
{ "identificacion": "0956257497", "codigoDactilar": "E1111V1111", "tipoIdentificacion": "C" }

Response ejemplo: { "clientId": "eyJhbGc..." }
```

**2. Operación protegida:**
```bash
POST /cuenta/transferencia
Headers: 
  clientId: eyJhbGc...
  identificacion: 0956257497
Body: { "monto": 100, "cuentaOrigen": "123456", "cuentaDestino": "789012" }

✅ Success: 200 OK (si authorizer permite)
❌ Error: 403 Unauthorized (si sesión inválida/expirada)
```

### Validaciones Implementadas

**Sesión en DynamoDB:**
```typescript
// Consulta y verifica expiración
const result = await dynamoDB.getItem({ TableName: TABLA_SESION_USUARIO, Key: { id: clientId } });
if (!result.Item || sesionExpirada) throw FraudeException(9403);
```

**Identificación Cruzada:**
```typescript
// Decodifica JWT y compara
const decodedPayload = jwt.decode(clientId);
if (headerIdentificacion !== decodedPayload.identificacion) {
  throw FraudeException(9403, 'Información inconsistente');
}
```
---

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm install              # Instalar dependencias
npm run build           # Compilar TypeScript
npm test                # Ejecutar pruebas

# Despliegue
cdk synth               # Sintetizar CloudFormation
cdk deploy              # Desplegar a AWS
```


---

## 🔐 Características de Seguridad

✅ Autenticación JWT  
✅ Validación sesión tiempo real  
✅ Control expiración temporal  
✅ Detección fraude  
✅ Sin caché (máxima seguridad)  
✅ Logging extensivo  
✅ Validación cruzada identidad  

---

## 🔗 Sistema de Encadenamiento

### Flujo de Encadenamiento

El sistema implementa un flujo de encadenamiento que valida la secuencia de operaciones bancarias:

```
1. fnInterDetalleFlujoEncadenamiento - Obtiene configuración
2. fnInterPredecesorEncadenamiento - Valida operaciones anteriores  
3. fnInterPeticionEncadenamiento - Ejecuta petición principal
4. fnInterSucesorEncadenamiento - Prepara siguiente operación
5. fnInterMapearRespuestaFinal - Consolida respuesta
```

### Funciones de Encadenamiento

**fnInterPredecesorEncadenamiento**: Valida que existe el hash de la operación anterior en DynamoDB y verifica que no esté caducado.

**fnInterSucesorEncadenamiento**: Genera y almacena el hash para la siguiente operación en la cadena con TTL automático.

### Configuración

```json
{
  "encadenamiento": {
    "codigoPredecesor": "TRANSFERENCIA_001",
    "codigoSucesor": "TRANSFERENCIA_002"
  }
}
```

### Variables de Entorno Adicionales

```bash
# Base de datos para hashes de encadenamiento
ENCADENAMIENTO_DB_NAME=encadenamiento-db

# Duración en minutos del hash de encadenamiento  
DURACION_ENCADENAMIENTO=30

# Configuración de memoria para lambdas de encadenamiento
LAMBDA_MEMORY_ALTA_TRANSACCINALIDAD=1024

# Timeouts específicos
LAMBDA_TIMEOUT_EJECUTAR_TRANSFERENCIA=17
LAMBDA_TIMEOUT_ALTA_TRANSACCINALIDAD=3

# Validación SSL
REJECT_UNAUTHORIZED=true
```

### Tabla DynamoDB de Encadenamiento

La tabla `encadenamiento-db` almacena los hashes con los siguientes campos:

- `id`: Hash único de encadenamiento
- `fechaExpiracion`: Fecha de expiración en formato estándar
- `expires_at`: Timestamp Unix para TTL automático

---

**Versión:** 1.0.0 | **Banco Bolivariano** | Enero 2025