import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Layout.css';

const navItems = [
  { path: '/dashboard',     icon: '⬡',  label: 'Dashboard' },
  { path: '/loans',         icon: '🏦', label: 'Loans' },
  { path: '/expenses',      icon: '💸', label: 'Expenses' },
  { path: '/reports',       icon: '📊', label: 'Reports' },
  { path: '/ai-chat',       icon: '🤖', label: 'AI Advisor', isAI: true },
  { path: '/notifications', icon: '🔔', label: 'Alerts' },
  { path: '/profile',       icon: '👤', label: 'Profile' },
];

export default function Layout() {
  const { user, logout, toggleDarkMode, darkMode } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications');
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">L</div>
          <div>
            <div className="logo-text">LoanTrack</div>
            <div className="logo-sub">Utilization Tracker</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${item.isAI ? 'nav-ai' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.isAI && <span className="nav-ai-badge">NEW</span>}
              {item.path === '/notifications' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? '🌙' : '☀️'}
            <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <span>↩</span> Sign Out
          </button>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          <div className="topbar-title" />
          <div className="topbar-right">
            <div className="user-chip">
              <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className="user-email">{user?.email}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
