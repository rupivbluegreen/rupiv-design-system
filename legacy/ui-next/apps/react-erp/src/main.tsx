import * as ReactDOM from 'react-dom/client';
import App from './app/app';

// StrictMode is off: echarts-for-react@3 disposes the real chart on its double-invoke mount/unmount, leaving the canvas blank.

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(<App />);