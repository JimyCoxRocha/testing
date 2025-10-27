import { SHA512, HmacSHA512, enc } from 'crypto-js';

export function obtenerSimpleHashBase64(input: string): string {
  return enc.Base64.stringify(SHA512(input));
}

export function generarHashFinalBase64(pyResponse: string, clientId: string, semilla: string): string {
  const data = JSON.stringify({ r1: pyResponse, r2: clientId });
  console.log("generarHashFinalBase64 => " + data + " semilla => " + semilla);
  return enc.Base64.stringify(HmacSHA512(data, semilla));
}
