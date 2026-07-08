import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Plus, Link as LinkIcon, Check, Copy } from 'lucide-react';

const Invites: React.FC = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { token } = useAuth();

  const handleGenerateInvite = async () => {
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    setCopied(false);

    try {
      const response = await fetch('/api/invites/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate invite');
      }

      setGeneratedCode(data.invite.code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/invites/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code: inviteCode.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to use invite code');
      }

      setSuccessMessage('Invite used successfully! A new conversation has been created.');
      setInviteCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <UserPlus className="text-primary" />
          Invites
        </h1>
        <p className="text-muted-foreground">
          SafeChat is invite-only. Generate a code for a friend or enter a code you received.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-green-500/15 border border-green-500/30 text-green-500 text-sm font-medium">
          {successMessage}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Create Invite */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-xl font-semibold">
            <Plus className="text-primary" />
            <h2>Generate Invite</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Create a one-time use code to invite someone to a private conversation. The code will expire once used.
          </p>

          <button
            onClick={handleGenerateInvite}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg font-medium transition-colors border border-border"
          >
            {isLoading ? 'Processing...' : 'Generate New Code'}
          </button>

          {generatedCode && (
            <div className="mt-6 p-4 rounded-lg bg-background border border-border animate-in fade-in slide-in-from-bottom-2">
              <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Your Invite Code</p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-lg font-mono font-bold text-primary tracking-widest">{generatedCode}</code>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="text-green-500" size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Use Invite */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-xl font-semibold">
            <LinkIcon className="text-primary" />
            <h2>Use Invite</h2>
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Received an invite code? Enter it below to establish a secure, end-to-end encrypted connection.
          </p>

          <form onSubmit={handleUseInvite} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="INV-XXXX-XXXX"
                className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono tracking-wider placeholder:tracking-normal"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !inviteCode}
              className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Connect'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Invites;
