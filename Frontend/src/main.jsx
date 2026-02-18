window.global = window;
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('Root element "#root" was not found. React app cannot mount.')
  throw new Error('Missing #root element in index.html')
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <App />
          <ToastContainer position="top-right" autoClose={2500} newestOnTop />
        </BrowserRouter>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
