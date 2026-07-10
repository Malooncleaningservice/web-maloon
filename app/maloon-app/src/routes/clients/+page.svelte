<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';

	let clients = $state<Array<{id: string; name: string; phone: string | null; email: string | null; address: string | null; notes: string | null; _count: {quotes: number; jobs: number}}>>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state({ name: '', phone: '', email: '', address: '', notes: '' });
	let saving = $state(false);

	onMount(async () => {
		await loadClients();
	});

	async function loadClients() {
		loading = true;
		try {
			const res = await fetch('/api/clients');
			clients = await res.json();
		} catch (e) {
			console.error('Failed to load clients', e);
		} finally {
			loading = false;
		}
	}

	function startCreate() {
		editingId = null;
		form = { name: '', phone: '', email: '', address: '', notes: '' };
		showForm = true;
	}

	function startEdit(client: typeof form & { id: string; _count?: any }) {
		editingId = client.id;
		form = {
			name: client.name,
			phone: client.phone || '',
			email: client.email || '',
			address: client.address || '',
			notes: client.notes || ''
		};
		showForm = true;
	}

	async function saveClient() {
		saving = true;
		try {
			const body = {
				name: form.name,
				phone: form.phone || null,
				email: form.email || null,
				address: form.address || null,
				notes: form.notes || null,
			};

			if (editingId) {
				await fetch(`/api/clients/${editingId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});
			} else {
				await fetch('/api/clients', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});
			}

			showForm = false;
			await loadClients();
		} catch (e) {
			console.error('Failed to save client', e);
		} finally {
			saving = false;
		}
	}

	async function deleteClient(id: string, name: string) {
		if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
		try {
			await fetch(`/api/clients/${id}`, { method: 'DELETE' });
			await loadClients();
		} catch (e) {
			console.error('Failed to delete client', e);
			alert('Failed to delete client.');
		}
	}
</script>

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
	<h2 style="font-size: 1.3rem;">Clients</h2>
	<button class="btn btn-primary" onclick={startCreate}>+ New Client</button>
</div>

{#if showForm}
	<div class="card">
		<h3 style="margin-bottom: 12px;">{editingId ? 'Edit Client' : 'New Client'}</h3>
		<div class="row mb-2">
			<div class="col"><label for="cName">Name</label><input id="cName" bind:value={form.name} /></div>
			<div class="col"><label for="cPhone">Phone</label><input id="cPhone" bind:value={form.phone} /></div>
		</div>
		<div class="row mb-2">
			<div class="col"><label for="cEmail">Email</label><input id="cEmail" type="email" bind:value={form.email} /></div>
		</div>
		<div class="mb-2"><label for="cAddr">Address</label><input id="cAddr" bind:value={form.address} /></div>
		<div class="mb-4"><label for="cNotes">Notes</label><textarea id="cNotes" bind:value={form.notes} rows="2"></textarea></div>
		<div style="display: flex; gap: 8px;">
			<button class="btn btn-success" onclick={saveClient} disabled={saving || !form.name}>
				{saving ? 'Saving...' : editingId ? 'Update Client' : 'Create Client'}
			</button>
			<button class="btn btn-outline" onclick={() => showForm = false}>Cancel</button>
		</div>
	</div>
{/if}

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading clients...</p>
	</div>
{:else if clients.length === 0}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">No clients yet. Add your first client to start tracking quotes and jobs.</p>
	</div>
{:else}
	{#each clients as client}
		<div class="card" style="cursor: default;">
			<div style="display: flex; justify-content: space-between; align-items: flex-start;">
				<div style="flex: 1;">
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
						<a href="/clients/{client.id}" style="font-size: 1rem; font-weight: 600; color: var(--primary); text-decoration: none;">
							{client.name}
						</a>
						{#if client._count?.quotes > 0}
							<span class="badge badge-quote">{client._count.quotes} quote{client._count.quotes !== 1 ? 's' : ''}</span>
						{/if}
						{#if client._count?.jobs > 0}
							<span class="badge badge-active">{client._count.jobs} job{client._count.jobs !== 1 ? 's' : ''}</span>
						{/if}
					</div>
					<div style="display: flex; gap: 16px; flex-wrap: wrap;">
						{#if client.phone}<span class="text-secondary">{client.phone}</span>{/if}
						{#if client.email}<span class="text-secondary">{client.email}</span>{/if}
						{#if client.address}<span class="text-secondary">{client.address}</span>{/if}
					</div>
				</div>
				<div style="display: flex; gap: 8px;">
					<button class="btn btn-outline btn-sm" onclick={() => startEdit(client)}>Edit</button>
					<button class="btn btn-danger btn-sm" onclick={() => deleteClient(client.id, client.name)}>Delete</button>
				</div>
			</div>
		</div>
	{/each}
{/if}
