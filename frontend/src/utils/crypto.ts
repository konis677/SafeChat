import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

/**
 * Generate a new Curve25519 keypair for E2E encryption
 */
export const generateKeyPair = () => {
  const keypair = nacl.box.keyPair();
  return {
    publicKey: naclUtil.encodeBase64(keypair.publicKey),
    privateKey: naclUtil.encodeBase64(keypair.secretKey)
  };
};

/**
 * Encrypt a message for a specific recipient
 */
export const encryptMessage = (message: string, recipientPublicKeyBase64: string, senderPrivateKeyBase64: string) => {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = naclUtil.decodeUTF8(message);
  
  const recipientPublicKey = naclUtil.decodeBase64(recipientPublicKeyBase64);
  const senderPrivateKey = naclUtil.decodeBase64(senderPrivateKeyBase64);
  
  const encrypted = nacl.box(messageUint8, nonce, recipientPublicKey, senderPrivateKey);
  
  return {
    ciphertext: naclUtil.encodeBase64(encrypted),
    nonce: naclUtil.encodeBase64(nonce)
  };
};

/**
 * Decrypt a message from a specific sender
 */
export const decryptMessage = (ciphertextBase64: string, nonceBase64: string, senderPublicKeyBase64: string, recipientPrivateKeyBase64: string) => {
  const ciphertext = naclUtil.decodeBase64(ciphertextBase64);
  const nonce = naclUtil.decodeBase64(nonceBase64);
  const senderPublicKey = naclUtil.decodeBase64(senderPublicKeyBase64);
  const recipientPrivateKey = naclUtil.decodeBase64(recipientPrivateKeyBase64);
  
  const decrypted = nacl.box.open(ciphertext, nonce, senderPublicKey, recipientPrivateKey);
  
  if (!decrypted) {
    throw new Error('Failed to decrypt message. Keys or data might be invalid.');
  }
  
  return naclUtil.encodeUTF8(decrypted);
};

// --- Web Crypto API for local storage encryption (AES-GCM) ---

const ITERATIONS = 100000;

export const deriveKeyFromPassword = async (password: string, saltHex: string) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptPrivateKey = async (privateKeyBase64: string, password: string): Promise<{ encryptedPrivateKey: string, salt: string, iv: string }> => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

  const key = await deriveKeyFromPassword(password, saltHex);
  const enc = new TextEncoder();

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    enc.encode(privateKeyBase64)
  );

  const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    encryptedPrivateKey: encryptedHex,
    salt: saltHex,
    iv: ivHex
  };
};

export const decryptPrivateKey = async (encryptedHex: string, password: string, saltHex: string, ivHex: string): Promise<string> => {
  const key = await deriveKeyFromPassword(password, saltHex);
  
  const encryptedBuffer = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encryptedBuffer
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error('Invalid password or corrupted key data');
  }
};
