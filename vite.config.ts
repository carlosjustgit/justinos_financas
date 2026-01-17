import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load from .env files for local development
    // In Vercel, process.env has the variables directly during build
    const env = loadEnv(mode, '.', '');
    
    // Prioritize process.env (Vercel) over .env files (local dev)
    const geminiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
        'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
