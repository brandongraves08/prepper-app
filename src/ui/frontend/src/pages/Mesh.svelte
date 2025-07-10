<script>
  import { onMount } from 'svelte';
  let status = '';
  let loading = false;

  async function fetchStatus() {
    loading = true;
    const res = await window.prepper.getMeshStatus();
    loading = false;
    if (res.running) {
      status = `${res.peerCount} peer(s) connected`;
    } else {
      status = 'Mesh not running';
    }
  }

  async function meshCmd(cmd) {
    loading = true;
    status = '';
    await window.prepper[cmd]();
    await fetchStatus();
    loading = false;
  }

  onMount(fetchStatus);
</script>

<h2>Mesh Network</h2>
<button on:click={() => meshCmd('startMesh')} disabled={loading}>Start</button>
<button on:click={() => meshCmd('stopMesh')} disabled={loading}>Stop</button>
<button on:click={() => meshCmd('syncMesh')} disabled={loading}>Sync</button>
<button on:click={fetchStatus} disabled={loading}>Refresh</button>
<p>{loading ? 'Working...' : status}</p>
