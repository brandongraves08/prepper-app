import './global.css';
import './theme.js';
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')
});

export default app;
