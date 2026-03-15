window.global = window;
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import App from './App.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import ThemedToastContainer from './components/ThemedToastContainer.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('Root element "#root" was not found. React app cannot mount.')
  throw new Error('Missing #root element in index.html')
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
            <ThemedToastContainer position="top-right" autoClose={2500} newestOnTop />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
