/**
 * Crypto utilities for secure chat
 * Uses Web Crypto API for RSA and AES encryption
 */

// RSA key pair generation
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export public key to base64
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(exported);
}

// Import public key from base64
export async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    "spki",
    keyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

// Export private key to base64
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(exported);
}

// Import private key from base64
export async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

// Generate AES key
export async function generateAESKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Export AES key to base64
export async function exportAESKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64(exported);
}

// Import AES key from base64
export async function importAESKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt AES key with RSA public key
export async function encryptAESKeyWithRSA(
  aesKey: CryptoKey,
  rsaPublicKey: CryptoKey
): Promise<string> {
  const exportedAESKey = await crypto.subtle.exportKey("raw", aesKey);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    rsaPublicKey,
    exportedAESKey
  );
  return arrayBufferToBase64(encrypted);
}

// Decrypt AES key with RSA private key
export async function decryptAESKeyWithRSA(
  encryptedAESKey: string,
  rsaPrivateKey: CryptoKey
): Promise<CryptoKey> {
  const encryptedData = base64ToArrayBuffer(encryptedAESKey);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    rsaPrivateKey,
    encryptedData
  );
  return await importAESKey(arrayBufferToBase64(decrypted));
}

// Encrypt message with AES key
export async function encryptMessage(
  message: string,
  aesKey: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    data
  );
  
  return {
    encrypted: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

// Decrypt message with AES key
export async function decryptMessage(
  encrypted: string,
  iv: string,
  aesKey: CryptoKey
): Promise<string> {
  try {
    const encryptedData = base64ToArrayBuffer(encrypted);
    const ivData = base64ToArrayBuffer(iv);
    
    // Validate inputs
    if (!encryptedData || encryptedData.byteLength === 0) {
      throw new Error("Invalid encrypted data");
    }
    if (!ivData || ivData.byteLength !== 12) {
      throw new Error("Invalid IV (must be 12 bytes for AES-GCM)");
    }
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivData,
      },
      aesKey,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails: any = {
      error: errorMessage,
      encryptedLength: encrypted?.length,
      ivLength: iv?.length,
      keyType: aesKey?.algorithm?.name,
      keyExtractable: aesKey?.extractable,
      keyUsages: aesKey?.usages,
    };
    
    // Try to get more details from the error object
    if (error instanceof Error) {
      errorDetails.errorName = error.name;
      errorDetails.errorStack = error.stack;
    }
    
    console.error("Decryption error details:", errorDetails);
    
    // Provide more specific error messages
    if (errorMessage.includes("OperationError") || errorMessage.includes("decrypt") || errorMessage.includes("operation-specific")) {
      throw new Error("Decryption failed - the message may have been encrypted with a different key, corrupted, or sent before the secure connection was established");
    }
    
    throw new Error(`Failed to decrypt message: ${errorMessage}`);
  }
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

