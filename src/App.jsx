import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
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

  // User is logged in - show placeholder dashboard
  return (
    <div className="app">
      <div className="dashboard-placeholder">
        <img src="/icons/icon-192.png" alt="Rotation Tracker" className="dashboard-logo" />
        <h1>Welcome to Rotation Tracker!</h1>
        <p>Logged in as: {user.email}</p>
        <p>Dashboard coming soon...</p>
        <button
          onClick={async () => {
            const { supabase } = await import('./lib/supabase');
            await supabase.auth.signOut();
          }}
          className="logout-btn"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default App;
