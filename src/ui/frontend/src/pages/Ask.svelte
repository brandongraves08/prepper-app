<script>
  import { onMount } from 'svelte';
  let prompt = '';
  let answer = '';
  let loading = false;

  async function handleAsk() {
    if (!prompt.trim()) return;
    loading = true;
    answer = '';
    const res = await window.prepper.ask(prompt);
    loading = false;
    if (res.ok) {
      answer = res.response;
    } else {
      answer = `Error: ${res.error}`;
    }
  }

  onMount(() => {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') handleAsk();
    });
  });
</script>

<style>
  textarea { width: 100%; }
  pre { background: #f4f4f4; padding: 1rem; white-space: pre-wrap; }
</style>

<h2>Ask Local LLM</h2>
<textarea rows="4" bind:value={prompt} placeholder="Enter your question (Ctrl+Enter to send)"></textarea>
<br />
<button on:click={handleAsk} disabled={loading}>Ask</button>
{#if loading}
  <span>Loading...</span>
{/if}
<pre>{answer}</pre>
