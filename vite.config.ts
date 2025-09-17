import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // This is the dynamic base path configuration.
  base: process.env.VITE_APP_BASE
    // If the VITE_APP_BASE environment variable is set (i.e., we are in GitHub Actions),
    // format it correctly as a path (e.g., "/my-repo-name/").
    ? `/${process.env.VITE_APP_BASE}/`
    // Otherwise (i.e., we are running locally with `npm run dev`),
    // default to the root path '/'.
    : '/',
})