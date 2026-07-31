import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' keeps the build relocatable (works on any static host or subpath).
export default defineConfig({
  base: './',
  plugins: [svelte()],
});
