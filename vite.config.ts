import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Load from .env files for local development
    // In Vercel, process.env has the variables directly during build
    const env = loadEnv(mode, '.', '');
    
    // Prioritize process.env (Vercel) over .env files (local dev)
    // In Vercel, process.env has the variables directly during build
    const geminiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
    const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
    
    // Debug: log during build (only in Vercel build logs)
    if (process.env.VERCEL) {
      console.log('Build env vars:', {
        hasGeminiKey: !!geminiKey,
        geminiKeyLength: geminiKey?.length || 0,
        geminiKeyPreview: geminiKey ? geminiKey.substring(0, 10) + '...' : 'empty',
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey
      });
    }
    
    // IMPORTANT: Vite replaces these during build
    // If geminiKey is empty, it will be replaced with "" (empty string)
    // If geminiKey has value, it will be replaced with the actual string
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Use JSON.stringify to ensure it's always a string
        // Empty string becomes "" (2 chars), actual key becomes "AIzaSy..." (40+ chars)
        // IMPORTANT: These must match EXACTLY what's in the code (including quotes)
        'process.env.API_KEY': JSON.stringify(geminiKey || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey || ''),
        'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl || ''),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseKey || ''),
        // Also try without quotes for direct access
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
