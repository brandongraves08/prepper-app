<script>
  import { onMount } from 'svelte';
  let items = [];
  let loading = false;
  let error = '';
  let daysLeft = null;

  async function load() {
    loading = true;
    const [inv, dur] = await Promise.all([
      window.prepper.listInventory(),
      window.prepper.getSupplyDuration()
    ]);
    loading = false;
    if (inv.ok) {
      items = inv.items;
      daysLeft = dur.days;
      error = '';
    } else {
      error = inv.error;
    }
  }

  let newItem = { name: '', quantity: 1, unit: 'pcs', expiryDate: '' };

  async function add() {
    if (!newItem.name.trim()) return;
    const res = await window.prepper.addInventory(newItem);
    if (res.ok) {
      items = [...items, res.item];
      newItem = { name: '', quantity: 1, unit: 'pcs', expiryDate: '' };
      error = '';
    } else {
      error = res.error;
    }
  }

  async function remove(id) {
    const res = await window.prepper.deleteInventory(id);
    if (res.ok) {
      items = items.filter(i => i.id !== id);
    } else {
      error = res.error;
    }
  }

  onMount(load);
</script>

<style>
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 6px; }
  th { background: #35424a; color: #fff; }
</style>

<h2>Inventory</h2>
{#if daysLeft !== null}
  <p><strong>{daysLeft}</strong> day{daysLeft==1?'':'s'} of food remaining</p>
{/if}

<!-- Add Item Form -->
<div style="margin:1rem 0; border:1px solid #ddd; padding:0.5rem;">
  <input placeholder="Name" bind:value={newItem.name} />
  <input type="number" min="1" style="width:80px" bind:value={newItem.quantity} />
  <input placeholder="Unit" style="width:80px" bind:value={newItem.unit} />
  <input type="date" bind:value={newItem.expiryDate} />
  <button on:click={add} disabled={!newItem.name.trim() || newItem.quantity<1}>Add</button>
</div>
<button on:click={load} disabled={loading}>Refresh</button>
{#if loading}
  <p>Loading...</p>
{:else if error}
  <p style="color:red">Error: {error}</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Qty</th>
        <th>Unit</th>
        <th>Expiry</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each items as item}
        <tr>
          <td>{item.name}</td>
          <td>{item.quantity}</td>
          <td>{item.unit}</td>
          <td>{item.expiryDate?.slice(0,10) || ''}</td>
          <td><button on:click={() => remove(item.id)}>Delete</button></td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
