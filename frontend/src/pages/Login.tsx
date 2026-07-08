import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Loader2, KeyRound } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [importKey, setImportKey] = useState(false);
  const [keyData, setKeyData] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, importKeyAndLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      let success = false;

      if (importKey) {
        if (!keyData) throw new Error('Key data is required when importing');
        success = await importKeyAndLogin(data.token, data.user, keyData, password);
      } else {
        // Assume key is already in local storage
        const storedKey = localStorage.getItem('encryptedPrivateKey');
        if (!storedKey) {
          throw new Error('No private key found on this device. Please use the "Import Key" option.');
        }
        success = await login(data.token, data.user, JSON.parse(storedKey), password);
      }

      if (success) {
        navigate('/chat');
      } else {
        throw new Error('Failed to decrypt private key. Incorrect password or invalid key data.');
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-border shadow-2xl relative z-10 backdrop-blur-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/20 p-3 rounded-xl text-primary mb-4 ring-1 ring-primary/30">
            <Shield size={32} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="text-muted-foreground mt-2 text-center">Enter your credentials to access your secure chats</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2 pb-1">
            <input 
              type="checkbox" 
              id="importKey" 
              checked={importKey} 
              onChange={(e) => setImportKey(e.target.checked)}
              className="rounded border-border bg-input text-primary focus:ring-primary h-4 w-4 accent-primary"
            />
            <label htmlFor="importKey" className="text-sm text-muted-foreground flex items-center gap-1.5 cursor-pointer">
              <KeyRound size={14} />
              I need to import my Private Key (New Device)
            </label>
          </div>

          {importKey && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-medium text-foreground">Encrypted Key Data (JSON)</label>
              <textarea
                value={keyData}
                onChange={(e) => setKeyData(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-xs h-24 resize-none"
                placeholder='{"hex":"...","salt":"...","iv":"..."}'
                required={importKey}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Secure Login'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
