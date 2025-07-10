<script>
  import { writable } from 'svelte/store';
  import { theme } from './theme.js';
  import Ask from './pages/Ask.svelte';
  import Mesh from './pages/Mesh.svelte';
  import Inventory from './pages/Inventory.svelte';

  const page = writable('ask');
</script>

<style>
  nav {
    background: #35424a;
    color: white;
    display: flex;
    gap: 1rem;
    padding: 0.5rem 1rem;
  }
  nav button {
    background: transparent;
    color: inherit;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.5rem 0.8rem;
  }
  nav button.active {
    border-bottom: 2px solid #fff;
  }
</style>

<nav>
  <button class:active={$page==='ask'} on:click={() => page.set('ask')}>Ask</button>
  <button class:active={$page==='mesh'} on:click={() => page.set('mesh')}>Mesh</button>
  <button class:active={$page==='inventory'} on:click={() => page.set('inventory')}>Inventory</button>
  <span style="flex:1"></span>
  <button on:click={() => theme.update(t => t==='dark'?'light':'dark')}>🌓</button>
</nav>

{#if $page==='ask'}
  <Ask />
{:else if $page==='mesh'}
  <Mesh />
{:else if $page==='inventory'}
  <Inventory />
{/if}
