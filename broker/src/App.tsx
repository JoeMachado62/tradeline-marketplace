import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('broker_token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter basename="/broker">
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
           <ProtectedRoute><Layout /></ProtectedRoute>
        }>
           <Route index element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
