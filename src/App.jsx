import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PositionDetail from './pages/PositionDetail';
import BottomNav from './components/BottomNav';
import './App.css';

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

  // User is logged in - show routes
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <>
            <Dashboard user={user} />
            <BottomNav active="positions" />
          </>
        } />
        <Route path="/position/:id" element={
          <>
            <PositionDetail user={user} />
            <BottomNav active="positions" />
          </>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
