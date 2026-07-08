import React, { createContext, useContext, useState, useEffect } from 'react';
import { decryptPrivateKey } from '../utils/crypto';

interface User {
  id: string;
  username: string;
  publicKey: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  privateKey: string | null; // Kept only in memory!
  login: (token: string, user: User, privateKeyEncrypted: { encryptedPrivateKey: string, salt: string, iv: string }, password: string) => Promise<boolean>;
  logout: () => void;
  importKeyAndLogin: (token: string, user: User, exportedKeyData: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);

  useEffect(() => {
    // Check if token exists on mount, but we can't auto-login if we need a password to unlock the private key.
    // The user MUST provide the password again, so we just clear everything if the private key isn't in memory.
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser && privateKey) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, [privateKey]);

  const login = async (newToken: string, newUser: User, privateKeyEncrypted: { encryptedPrivateKey: string, salt: string, iv: string }, password: string) => {
    try {
      // Try to decrypt the private key to verify the password is correct
      const decrypted = await decryptPrivateKey(privateKeyEncrypted.encryptedPrivateKey, password, privateKeyEncrypted.salt, privateKeyEncrypted.iv);
      
      setPrivateKey(decrypted);
      setToken(newToken);
      setUser(newUser);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('encryptedPrivateKey', JSON.stringify(privateKeyEncrypted));
      
      return true;
    } catch (err) {
      console.error('Failed to decrypt private key. Incorrect password?');
      return false;
    }
  };

  const importKeyAndLogin = async (newToken: string, newUser: User, exportedKeyData: string, password: string) => {
    try {
      const parsedData = JSON.parse(exportedKeyData);
      if (!parsedData.encryptedPrivateKey || !parsedData.salt || !parsedData.iv) {
        throw new Error('Invalid key data format');
      }

      const decrypted = await decryptPrivateKey(parsedData.encryptedPrivateKey, password, parsedData.salt, parsedData.iv);
      
      setPrivateKey(decrypted);
      setToken(newToken);
      setUser(newUser);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('encryptedPrivateKey', JSON.stringify(parsedData));

      return true;
    } catch (err) {
      console.error('Failed to import private key', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setPrivateKey(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('encryptedPrivateKey');
  };

  return (
    <AuthContext.Provider value={{ user, token, privateKey, login, logout, importKeyAndLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
