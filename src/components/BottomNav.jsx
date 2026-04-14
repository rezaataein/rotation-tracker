import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNav.css';

export default function BottomNav({ active }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'scanner', path: '/scanner', icon: '🔍', label: 'Scanner' },
    { id: 'positions', path: '/', icon: '📊', label: 'Positions' },
    { id: 'settings', path: '/settings', icon: '⚙️', label: 'Settings' }
  ];

  // Determine active tab from route if not explicitly passed
  const activeTab = active || navItems.find(item => item.path === location.pathname)?.id || 'positions';

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
