import { createRoot } from 'react-dom/client';

import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.tsx';
import { ModalProvider } from './contexts/ModalContext.tsx';

createRoot(document.getElementById('root')!).render(
  <ModalProvider>
    <App />
  </ModalProvider>,
);
