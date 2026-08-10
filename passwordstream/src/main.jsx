/**
 * main.jsx
 * The main entry point for the PasswordStream React application.
 * This file boots up React, wraps the application in StrictMode for development checks,
 * and renders the root App component into the HTML DOM.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
