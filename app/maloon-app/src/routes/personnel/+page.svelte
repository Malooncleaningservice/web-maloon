<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';

	let workers = $state<Array<{id: string; firstName: string; lastName: string; role: string; status: string; email: string; phone: string; w9Reviewed: boolean}>>([]);
	let loading = $state(true);
	let showAdd = $state(false);
	let newWorker = $state({ firstName: '', lastName: '', email: '', phone: '', role: 'worker' });
	let saving = $state(false);

	onMount(async () => {
		await loadWorkers();
	});

	async function loadWorkers() {
		loading = true;
		try {
			const res = await fetch('/api/workers');
			const data = await res.json();
			workers = data;
		} catch (e) {
			console.error('Failed to load workers', e);
		} finally {
			loading = false;
		}
	}

	async function addWorker() {
		if (!newWorker.firstName || !newWorker.lastName) return;
		saving = true;
		try {
			await fetch('/api/workers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newWorker),
			});
			showAdd = false;
			newWorker = { firstName: '', lastName: '', email: '', phone: '', role: 'worker' };
			await loadWorkers();
		} catch (e) {
			console.error('Add worker failed', e);
		} finally {
			saving = false;
		}
	}
</script>

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
	<h2 style="font-size: 1.3rem;">Personnel</h2>
	<button class="btn btn-primary" onclick={() => showAdd = !showAdd}>
		{showAdd ? 'Cancel' : '+ Add Worker'}
	</button>
</div>

<!-- Add Worker Form -->
{#if showAdd}
	<div class="card">
		<h3 style="margin-bottom: 12px;">New Worker</h3>
		<div class="row mb-2">
			<div class="col"><label for="wfName">First Name</label><input id="wfName" bind:value={newWorker.firstName} /></div>
			<div class="col"><label for="wlName">Last Name</label><input id="wlName" bind:value={newWorker.lastName} /></div>
		</div>
		<div class="row mb-2">
			<div class="col"><label for="wEmail">Email</label><input id="wEmail" type="email" bind:value={newWorker.email} /></div>
			<div class="col"><label for="wPhone">Phone</label><input id="wPhone" bind:value={newWorker.phone} /></div>
		</div>
		<div class="mb-4">
			<label for="wRole">Role</label>
			<select id="wRole" bind:value={newWorker.role}>
				<option value="worker">Worker</option>
				<option value="supervisor">Supervisor</option>
				<option value="admin">Admin</option>
			</select>
		</div>
		<button class="btn btn-success" onclick={addWorker} disabled={saving}>
			{saving ? 'Adding...' : 'Add Worker'}
		</button>
	</div>
{/if}

<!-- Worker List -->
{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading workers...</p>
	</div>
{:else}
	{#each workers as worker}
		<div class="card">
			<div style="display: flex; justify-content: space-between; align-items: flex-start;">
				<div>
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
						<h3 style="font-size: 1rem;">{worker.firstName} {worker.lastName}</h3>
						<span class="badge badge-active">{worker.role}</span>
						{#if !worker.w9Reviewed}
							<span class="badge badge-pending">W-9 pending</span>
						{/if}
					</div>
					<p class="text-secondary">{worker.email || 'No email'} • {worker.phone || 'No phone'}</p>
				</div>
				<div>
					<a href="/personnel/{worker.id}" class="btn btn-outline btn-sm" style="text-decoration: none;">View</a>
				</div>
			</div>
		</div>
	{/each}

	{#if workers.length === 0}
		<div class="card" style="text-align: center; padding: 40px;">
			<p class="text-secondary">No workers added yet.</p>
		</div>
	{/if}
{/if}
