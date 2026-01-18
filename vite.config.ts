import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    const geminiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
    const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

    console.log('Build env vars:', {
      hasGeminiKey: !!geminiKey,
      geminiKeyLength: geminiKey?.length || 0,
      geminiKeyPreview: geminiKey ? geminiKey.substring(0, 10) + '...' : 'empty',
    });

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
