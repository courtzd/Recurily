import * as React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Subscriptions } from './pages/Subscriptions';
import { Settings } from './pages/Settings';
import { Insights } from './pages/Insights';
import { Auth } from './pages/Auth';
import { AuthProvider } from './contexts/AuthContext';
import { MonitoringTest } from './pages/MonitoringTest';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<Auth mode="signin" />} />
          <Route path="/signup" element={<Auth mode="signup" />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/monitoring-test" element={<MonitoringTest />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;