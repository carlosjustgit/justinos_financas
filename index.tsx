import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// #region agent log
fetch('http://127.0.0.1:7243/ingest/57137d69-ca68-46ec-b371-85d59159105e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:7',message:'index.tsx executing',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const rootElement = document.getElementById('root');
if (!rootElement) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/57137d69-ca68-46ec-b371-85d59159105e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:11',message:'root element not found',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  throw new Error("Could not find root element to mount to");
}

// #region agent log
fetch('http://127.0.0.1:7243/ingest/57137d69-ca68-46ec-b371-85d59159105e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:18',message:'creating root and rendering App',data:{rootElementExists:!!rootElement},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);