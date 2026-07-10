<script lang="ts">
	import '../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let clientId = $state('');
	let client = $state<{
		id: string; name: string; phone: string | null; email: string | null;
		address: string | null; notes: string | null;
		quotes: Array<{id: string; total: number; status: string; createdAt: string}>;
		jobs: Array<{id: string; clientName: string; status: string; scheduledDate: string | null; assignments: Array<{worker: {firstName: string; lastName: string}}>}>;
	} | null>(null);
	let loading = $state(true);
	let editing = $state(false);
	let form = $state({ name: '', phone: '', email: '', address: '', notes: '' });
	let saving = $state(false);

	onMount(async () => {
		clientId = $page.params.id;
		await loadClient();
	});

	async function loadClient() {
		loading = true;
		try {
			const res = await fetch(`/api/clients/${clientId}`);
			if (!res.ok) throw new Error('Not found');
			client = await res.json();
			form = {
				name: client!.name,
				phone: client!.phone || '',
				email: client!.email || '',
				address: client!.address || '',
				notes: client!.notes || '',
			};
		} catch (e) {
			console.error('Failed to load client', e);
		} finally {
			loading = false;
		}
	}

	async function saveClient() {
		saving = true;
		try {
			await fetch(`/api/clients/${clientId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: form.name,
					phone: form.phone || null,
					email: form.email || null,
					address: form.address || null,
					notes: form.notes || null,
				}),
			});
			editing = false;
			await loadClient();
		} catch (e) {
			console.error('Failed to save client', e);
		} finally {
			saving = false;
		}
	}

	function statusBadge(status: string) {
		const map: Record<string, string> = {
			draft: 'badge-quote', sent: 'badge-active', accepted: 'badge-complete',
			rejected: 'badge-danger', pending: 'badge-pending', in_progress: 'badge-active',
			completed: 'badge-complete', cancelled: 'badge-danger',
		};
		return map[status] || '';
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric'
		});
	}
</script>

<a href="/clients" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; margin-bottom: 12px; display: inline-block;">
	← Back to Clients
</a>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading client...</p>
	</div>
{:else if !client}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Client not found.</p>
	</div>
{:else}
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
		<h2 style="font-size: 1.3rem;">{client.name}</h2>
		<button class="btn btn-outline btn-sm" onclick={() => editing = !editing}>
			{editing ? 'Cancel' : 'Edit'}
		</button>
	</div>

	{#if editing}
		<div class="card">
			<h3 style="margin-bottom: 12px;">Edit Client</h3>
			<div class="row mb-2">
				<div class="col"><label for="eName">Name</label><input id="eName" bind:value={form.name} /></div>
				<div class="col"><label for="ePhone">Phone</label><input id="ePhone" bind:value={form.phone} /></div>
			</div>
			<div class="row mb-2">
				<div class="col"><label for="eEmail">Email</label><input id="eEmail" type="email" bind:value={form.email} /></div>
			</div>
			<div class="mb-2"><label for="eAddr">Address</label><input id="eAddr" bind:value={form.address} /></div>
			<div class="mb-4"><label for="eNotes">Notes</label><textarea id="eNotes" bind:value={form.notes} rows="2"></textarea></div>
			<button class="btn btn-success" onclick={saveClient} disabled={saving || !form.name}>
				{saving ? 'Saving...' : 'Save Changes'}
			</button>
		</div>
	{:else}
		<div class="card">
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
				<div>
					<label class="text-secondary" style="font-size: 0.8rem;">Phone</label>
					<p>{client.phone || '—'}</p>
				</div>
				<div>
					<label class="text-secondary" style="font-size: 0.8rem;">Email</label>
					<p>{client.email || '—'}</p>
				</div>
				<div style="grid-column: 1 / -1;">
					<label class="text-secondary" style="font-size: 0.8rem;">Default Address</label>
					<p>{client.address || '—'}</p>
				</div>
				{#if client.notes}
					<div style="grid-column: 1 / -1;">
						<label class="text-secondary" style="font-size: 0.8rem;">Notes</label>
						<p style="white-space: pre-wrap;">{client.notes}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Jobs -->
	<div style="margin-top: 24px;">
		<h3 style="font-size: 1.1rem; margin-bottom: 8px;">Jobs</h3>
		{#if client.jobs.length === 0}
			<div class="card" style="text-align: center; padding: 24px;">
				<p class="text-secondary">No jobs yet for this client.</p>
			</div>
		{:else}
			{#each client.jobs as job}
				<a href="/jobs/{job.id}" style="text-decoration: none; color: inherit; display: block;">
					<div class="card" style="cursor: pointer;">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div>
								<span class="badge {statusBadge(job.status)}">{job.status.replace('_', ' ')}</span>
								{#if job.scheduledDate}
									<span class="text-secondary" style="margin-left: 8px;">📅 {formatDate(job.scheduledDate)}</span>
								{/if}
							</div>
							<div class="text-secondary">
								{#if job.assignments?.length}
									{job.assignments.map(a => `${a.worker.firstName} ${a.worker.lastName}`).join(', ')}
								{:else}
									No workers assigned
								{/if}
							</div>
						</div>
					</div>
				</a>
			{/each}
		{/if}
	</div>

	<!-- Quotes -->
	<div style="margin-top: 24px;">
		<h3 style="font-size: 1.1rem; margin-bottom: 8px;">Quotes</h3>
		{#if client.quotes.length === 0}
			<div class="card" style="text-align: center; padding: 24px;">
				<p class="text-secondary">No quotes yet for this client.</p>
			</div>
		{:else}
			<div style="overflow-x: auto;">
				<table style="width: 100%; border-collapse: collapse;">
					<thead>
						<tr style="border-bottom: 2px solid var(--border); text-align: left;">
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Date</th>
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Total</th>
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each client.quotes as quote}
							<tr style="border-bottom: 1px solid var(--border);">
								<td style="padding: 10px 12px; font-size: 0.85rem;">{formatDate(quote.createdAt)}</td>
								<td style="padding: 10px 12px; font-size: 0.85rem; font-weight: 600;">${quote.total.toFixed(2)}</td>
								<td style="padding: 10px 12px;">
									<span class="badge {statusBadge(quote.status)}">{quote.status.toUpperCase()}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{/if}
