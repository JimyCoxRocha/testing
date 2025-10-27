import { obtenerSimpleHashBase64, generarHashFinalBase64 } from '../src/utils/hash.util';

describe('Hash Utility Functions', () => {
  describe('obtenerSimpleHashBase64', () => {
    it('should generate consistent hash for same input', () => {
      const input = 'test input string';
      const hash1 = obtenerSimpleHashBase64(input);
      const hash2 = obtenerSimpleHashBase64(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hashes for different inputs', () => {
      const input1 = 'test input 1';
      const input2 = 'test input 2';
      
      const hash1 = obtenerSimpleHashBase64(input1);
      const hash2 = obtenerSimpleHashBase64(input2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = obtenerSimpleHashBase64('');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const input = 'test@#$%^&*()_+{}|:"<>?[]\\;\'.,/';
      const hash = obtenerSimpleHashBase64(input);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle unicode characters', () => {
      const input = 'test with ñ and é and 中文';
      const hash = obtenerSimpleHashBase64(input);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle very long strings', () => {
      const longInput = 'a'.repeat(10000);
      const hash = obtenerSimpleHashBase64(longInput);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle JSON strings', () => {
      const jsonInput = JSON.stringify({ 
        name: 'John Doe', 
        age: 30, 
        email: 'john@example.com' 
      });
      const hash = obtenerSimpleHashBase64(jsonInput);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should produce base64 encoded output', () => {
      const input = 'test input';
      const hash = obtenerSimpleHashBase64(input);
      
      // Base64 characters: A-Z, a-z, 0-9, +, /, =
      expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe('generarHashFinalBase64', () => {
    it('should generate consistent hash for same inputs', () => {
      const pyResponse = '{"status": "success", "data": "test"}';
      const clientId = 'client123';
      const semilla = 'seed456';
      
      const hash1 = generarHashFinalBase64(pyResponse, clientId, semilla);
      const hash2 = generarHashFinalBase64(pyResponse, clientId, semilla);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
    });

    it('should generate different hashes for different inputs', () => {
      const pyResponse = '{"status": "success"}';
      const clientId1 = 'client123';
      const clientId2 = 'client456';
      const semilla = 'seed789';
      
      const hash1 = generarHashFinalBase64(pyResponse, clientId1, semilla);
      const hash2 = generarHashFinalBase64(pyResponse, clientId2, semilla);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different semillas', () => {
      const pyResponse = '{"status": "success"}';
      const clientId = 'client123';
      const semilla1 = 'seed123';
      const semilla2 = 'seed456';
      
      const hash1 = generarHashFinalBase64(pyResponse, clientId, semilla1);
      const hash2 = generarHashFinalBase64(pyResponse, clientId, semilla2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different pyResponse', () => {
      const pyResponse1 = '{"status": "success"}';
      const pyResponse2 = '{"status": "error"}';
      const clientId = 'client123';
      const semilla = 'seed789';
      
      const hash1 = generarHashFinalBase64(pyResponse1, clientId, semilla);
      const hash2 = generarHashFinalBase64(pyResponse2, clientId, semilla);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty strings', () => {
      const hash = generarHashFinalBase64('', '', '');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters in all parameters', () => {
      const pyResponse = '{"test": "@#$%^&*()"}';
      const clientId = 'client@#$%';
      const semilla = 'seed@#$%';
      
      const hash = generarHashFinalBase64(pyResponse, clientId, semilla);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle unicode characters', () => {
      const pyResponse = '{"message": "测试中文"}';
      const clientId = 'clientñé中文';
      const semilla = 'seedñé中文';
      
      const hash = generarHashFinalBase64(pyResponse, clientId, semilla);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle very long inputs', () => {
      const longPyResponse = JSON.stringify({ data: 'a'.repeat(5000) });
      const longClientId = 'b'.repeat(1000);
      const longSemilla = 'c'.repeat(1000);
      
      const hash = generarHashFinalBase64(longPyResponse, longClientId, longSemilla);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should produce base64 encoded output', () => {
      const pyResponse = '{"status": "success"}';
      const clientId = 'client123';
      const semilla = 'seed456';
      
      const hash = generarHashFinalBase64(pyResponse, clientId, semilla);
      
      // Base64 characters: A-Z, a-z, 0-9, +, /, =
      expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should handle JSON objects as pyResponse', () => {
      const pyResponse = JSON.stringify({
        transactionId: 'txn123',
        amount: 100.50,
        currency: 'USD',
        timestamp: '2023-01-01T00:00:00Z'
      });
      const clientId = 'client123';
      const semilla = 'seed456';
      
      const hash = generarHashFinalBase64(pyResponse, clientId, semilla);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle null and undefined values gracefully', () => {
      const pyResponse = 'null';
      const clientId = 'client123';
      const semilla = 'seed456';
      
      const hash = generarHashFinalBase64(pyResponse, clientId, semilla);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should maintain consistency across multiple calls with same parameters', () => {
      const pyResponse = '{"test": "data"}';
      const clientId = 'client123';
      const semilla = 'seed456';
      
      const hashes = Array.from({ length: 10 }, () => 
        generarHashFinalBase64(pyResponse, clientId, semilla)
      );
      
      // All hashes should be identical
      hashes.forEach(hash => {
        expect(hash).toBe(hashes[0]);
      });
    });
  });
});
