import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { TelegramProvider } from './context/TelegramContext';
import { AuthProvider } from './context/AuthContext';
import { ConfigProvider } from './context/ConfigContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <TelegramProvider>
        <ConfigProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConfigProvider>
      </TelegramProvider>
    </BrowserRouter>
  </React.StrictMode>
);