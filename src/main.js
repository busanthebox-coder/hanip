import App from './App.svelte';
import './styles/tokens.css';
import { recordPwaVisit } from './lib/prefs.js';
import { registerPwa } from './lib/pwa.js';

if (import.meta.env.PROD) {
  recordPwaVisit();
  registerPwa();
}

const app = new App({ target: document.getElementById('app') });

export default app;
