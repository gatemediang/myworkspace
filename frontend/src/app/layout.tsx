import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'MyWorkSpace | Tunji Ologun - AI/ML Engineer',
  description: 'Portfolio of Tunji Ologun: AI/ML Engineer, Data Analyst, Full Stack Developer. Explore projects, tutorials, and digital products.',
  keywords: 'AI, ML, Machine Learning, Data Analysis, Full Stack, Portfolio',
};

// Public backend URL injected for the browser (image src, direct API calls).
// BACKEND_PUBLIC_URL must be set in Railway frontend env vars to the backend's
// public Railway URL, e.g. https://myworkspace-production.up.railway.app
const BACKEND_URL = process.env.BACKEND_PUBLIC_URL || process.env.BACKEND_URL || 'http://localhost:8000';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Inject backend URL at runtime — read by getBackendUrl() in api.ts */}
        <script dangerouslySetInnerHTML={{ __html: `window.__BACKEND_URL__=${JSON.stringify(BACKEND_URL)}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#0a1628', color: '#e8f4ff', border: '1px solid rgba(0,168,98,0.3)', fontFamily: 'Rajdhani, sans-serif' },
            success: { iconTheme: { primary: '#00a862', secondary: '#000' } },
          }}
        />
      </body>
    </html>
  );
}
