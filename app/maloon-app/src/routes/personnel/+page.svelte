<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import Modal from '$lib/components/Modal.svelte';

	let workers = $state<Array<{
		id: string;
		firstName: string;
		lastName: string;
		role: string;
		status: string;
		email: string;
		phone: string;
		w9Reviewed: boolean;
		user?: { id: string; email: string | null; identifierToken: string | null } | null;
	}>>([]);
	let loading = $state(true);
	let showAdd = $state(false);
	let newWorker = $state({ firstName: '', lastName: '', email: '', phone: '', role: 'worker', createLogin: false });
	let saving = $state(false);
	let generatedToken = $state('');

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
			const res = await fetch('/api/workers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					firstName: newWorker.firstName,
					lastName: newWorker.lastName,
					email: newWorker.email || undefined,
					phone: newWorker.phone || undefined,
					role: newWorker.role,
					createLogin: newWorker.createLogin,
				}),
			});
			if (!res.ok) throw new Error(await res.text());
			const result = await res.json();
			if (result.identifierToken) {
				generatedToken = result.identifierToken;
			} else {
				toast.success('Worker added.');
			}
			showAdd = false;
			newWorker = { firstName: '', lastName: '', email: '', phone: '', role: 'worker', createLogin: false };
			await loadWorkers();
		} catch (e) {
			console.error('Add worker failed', e);
			toast.error('Failed to add worker.');
		} finally {
			saving = false;
		}
	}

	let tokenCopied = $state(false);
	async function copyToken() {
		try {
			await navigator.clipboard.writeText(generatedToken);
			tokenCopied = true;
			setTimeout(() => (tokenCopied = false), 2000);
		} catch { /* clipboard unavailable */ }
	}
</script>

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
	<h2 style="font-size: 1.3rem;">Personnel</h2>
	<button class="btn btn-primary" onclick={() => { showAdd = !showAdd; generatedToken = ''; }}>
		{showAdd ? 'Cancel' : '+ Add Worker'}
	</button>
</div>

<!-- Generated Token Modal -->
<Modal open={!!generatedToken} title="🎉 Access Code Generated" maxWidth="420px" onClose={() => (generatedToken = '')}>
	<p class="text-secondary" style="margin-bottom: 12px;">
		Give this code to the worker so they can set up their account at the login page.
	</p>
	<div style="font-size: 1.6rem; font-family: monospace; text-align: center; padding: 12px; background: var(--bg); border-radius: var(--radius); letter-spacing: 3px; font-weight: 700; color: var(--text);">
		{generatedToken}
	</div>
	<p class="text-secondary" style="margin-top: 8px; font-size: 0.8rem;">
		This code is only shown once — copy it now.
	</p>
	<div style="display: flex; gap: 8px; margin-top: 12px;">
		<button class="btn btn-primary btn-sm" onclick={copyToken}>{tokenCopied ? '✓ Copied' : '📋 Copy Code'}</button>
		<button class="btn btn-outline btn-sm" onclick={() => generatedToken = ''}>Close</button>
	</div>
</Modal>

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
		<div class="row mb-4">
			<div class="col">
				<label for="wRole">Role</label>
				<select id="wRole" bind:value={newWorker.role}>
					<option value="worker">Worker</option>
					<option value="supervisor">Supervisor</option>
					<option value="admin">Admin</option>
				</select>
			</div>
			<div class="col" style="display: flex; align-items: flex-end; gap: 8px;">
				<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 400; margin-bottom: 0;">
					<input type="checkbox" bind:checked={newWorker.createLogin} style="width: auto;" />
					Create login account
				</label>
			</div>
		</div>
		{#if newWorker.createLogin && !newWorker.email}
			<p class="text-secondary" style="margin-bottom: 12px; font-size: 0.85rem;">
				💡 No email provided — an access code will be generated instead.
			</p>
		{/if}
		{#if newWorker.role === 'admin'}
			<div class="card-tint-warn" style="padding: 8px 12px; border-radius: var(--radius); margin-bottom: 12px; font-size: 0.85rem;">
				⚠️ Admin role grants full access to jobs, quotes, clients, and personnel data.
			</div>
		{/if}
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
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
						<h3 style="font-size: 1rem;">{worker.firstName} {worker.lastName}</h3>
						<span class="badge badge-active">{worker.role}</span>
						{#if worker.user}
							<span class="badge badge-complete">🔑 Login enabled</span>
						{:else}
							<span class="badge badge-pending">No login</span>
						{/if}
						{#if !worker.w9Reviewed}
							<span class="badge badge-pending">W-9 pending</span>
						{/if}
					</div>
					<p class="text-secondary">
						{worker.email || 'No email'} • {worker.phone || 'No phone'}
						{#if worker.user?.identifierToken}
							<br /><span style="font-family: monospace;">Code: {worker.user.identifierToken}</span>
						{/if}
					</p>
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