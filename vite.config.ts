import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { defineConfig, loadEnv, ConfigEnv } from 'vite';

export default defineConfig(({ mode }: ConfigEnv) => {
    const env = loadEnv(mode, '.', '');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': resolve(__dirname, '.'),
        }
      }
    };
});
