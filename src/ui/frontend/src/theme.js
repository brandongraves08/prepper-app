import { writable } from 'svelte/store';

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initial = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');

export const theme = writable(initial);

theme.subscribe((val) => {
  document.documentElement.dataset.theme = val;
  localStorage.setItem('theme', val);
});
