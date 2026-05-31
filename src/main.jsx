import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { OverlayProvider } from './overlays/OverlayProvider.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OverlayProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </OverlayProvider>
  </React.StrictMode>,
);
