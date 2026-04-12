import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
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

  // User is logged in - show dashboard
  return (
    <>
      <Dashboard user={user} />
      <BottomNav active="positions" />
    </>
  );
}

export default App;
