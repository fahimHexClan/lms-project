import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1f2937',
          color: '#f3f4f6',
          border: '1px solid #374151',
          borderRadius: '12px',
          fontFamily: 'DM Sans, sans-serif',
        },
        success: { iconTheme: { primary: '#818cf8', secondary: '#1f2937' } },
        error:   { iconTheme: { primary: '#f87171', secondary: '#1f2937' } },
      }}
    />
  </React.StrictMode>
)
