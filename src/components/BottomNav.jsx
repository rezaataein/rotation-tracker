import './BottomNav.css';

export default function BottomNav({ active = 'positions' }) {
  const navItems = [
    { id: 'scanner', icon: '🔍', label: 'Scanner' },
    { id: 'positions', icon: '📊', label: 'Positions' },
    { id: 'options', icon: '📞', label: 'Options' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${active === item.id ? 'active' : ''}`}
          onClick={() => console.log(`Navigate to ${item.id}`)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
