import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Shield, MessageSquare, UserPlus, LogOut, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Chat', path: '/chat', icon: <MessageSquare size={20} /> },
    { name: 'Invites', path: '/invites', icon: <UserPlus size={20} /> },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-20 md:w-64 border-r border-border bg-card flex flex-col justify-between h-full transition-all duration-300">
        <div>
          {/* Logo Area */}
          <div className="p-4 md:p-6 flex items-center justify-center md:justify-start gap-3 border-b border-border">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <Shield size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden md:block">SafeChat</h1>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors group relative",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span className="hidden md:block font-medium">{item.name}</span>
                  
                  {/* Tooltip for mobile */}
                  <div className="md:hidden absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info & Status */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-center md:justify-between mb-4">
            <div className="hidden md:flex items-center gap-2">
              <div className={clsx("w-2 h-2 rounded-full", isConnected ? "bg-green-500" : "bg-red-500")}></div>
              <span className="text-xs text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="md:hidden text-muted-foreground">
              {isConnected ? <Wifi size={18} className="text-green-500" /> : <WifiOff size={18} className="text-red-500" />}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-secondary/50 p-3 rounded-lg">
            <div className="hidden md:block overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.username}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors p-2 md:p-0 rounded-md hover:bg-destructive/10 md:hover:bg-transparent"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
