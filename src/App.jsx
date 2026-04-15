import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import PositionDetail from './pages/PositionDetail';
import StrategyDetail from './pages/StrategyDetail';
import Settings from './pages/Settings';
import BottomNav from './components/BottomNav';
import AddPosition from './components/AddPosition';
import AddStrategy from './components/AddStrategy';
import './App.css';

function AppContent({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [positionsRefreshKey, setPositionsRefreshKey] = useState(0);
  const [strategiesRefreshKey, setStrategiesRefreshKey] = useState(0);

  // Handle 404 redirect from GitHub Pages
  useEffect(() => {
    const redirect = sessionStorage.getItem('redirect');
    if (redirect) {
      sessionStorage.removeItem('redirect');
      // Extract the path after /rotation-tracker/
      const path = redirect.replace('/rotation-tracker', '');
      if (path && path !== '/') {
        navigate(path, { replace: true });
      }
    }
  }, [navigate]);

  const handleSavePosition = (newPosition) => {
    setPositionsRefreshKey(prev => prev + 1); // Trigger Dashboard to refetch
    setShowAddPosition(false);
  };

  const handleSaveStrategy = (newStrategy) => {
    setStrategiesRefreshKey(prev => prev + 1); // Trigger Scanner to refetch
    setShowAddStrategy(false);
  };

  const handleFABClick = () => {
    if (location.pathname === '/scanner') {
      setShowAddStrategy(true);
    } else {
      // Default to add position for / and /position/:id
      setShowAddPosition(true);
    }
  };

  // Don't show FAB on detail pages or settings
  const showFAB = !location.pathname.startsWith('/position/') &&
                  !location.pathname.startsWith('/strategy/') &&
                  location.pathname !== '/settings';

  return (
    <>
      <Routes>
        <Route path="/" element={
          <>
            <Dashboard user={user} refreshKey={positionsRefreshKey} />
            <BottomNav />
          </>
        } />
        <Route path="/scanner" element={
          <>
            <Scanner user={user} refreshKey={strategiesRefreshKey} />
            <BottomNav />
          </>
        } />
        <Route path="/position/:id" element={
          <>
            <PositionDetail user={user} />
            <BottomNav />
          </>
        } />
        <Route path="/strategy/:id" element={
          <>
            <StrategyDetail user={user} />
            <BottomNav />
          </>
        } />
        <Route path="/settings" element={
          <>
            <Settings user={user} />
            <BottomNav />
          </>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Centralized FAB - changes behavior based on route */}
      {showFAB && (
        <button
          className="fab"
          title={location.pathname === '/scanner' ? 'Add Strategy' : 'Add Position'}
          onClick={handleFABClick}
        >
          +
        </button>
      )}

      {/* Modals */}
      {showAddPosition && (
        <AddPosition
          user={user}
          onClose={() => setShowAddPosition(false)}
          onSave={handleSavePosition}
        />
      )}

      {showAddStrategy && (
        <AddStrategy
          user={user}
          onClose={() => setShowAddStrategy(false)}
          onSave={handleSaveStrategy}
        />
      )}
    </>
  );
}

function App() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // If not logged in, show login page
  if (!user) {
    return <Login />;
  }

  // User is logged in - show routes with FAB
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppContent user={user} />
    </BrowserRouter>
  );
}

export default App;
