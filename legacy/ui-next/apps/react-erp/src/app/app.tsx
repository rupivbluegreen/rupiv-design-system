import { Dashboard } from './dashboard/dashboard.js';
import { RTLPreview } from './rtl-preview/rtl-preview.js';

// No router in this showcase app — /rtl-preview is a plain path check for the RTL proof page, not a general routing mechanism.
export function App() {
  return window.location.pathname === '/rtl-preview' ? <RTLPreview /> : <Dashboard />;
}

export default App;
