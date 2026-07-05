<script lang="ts">
	import '../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let workerId = $state('');
	let worker = $state<{
		id: string; firstName: string; lastName: string; role: string; status: string;
		email: string; phone: string; notes?: string;
		w9Uploaded: boolean; w9Reviewed: boolean;
		w9FileName?: string; w9ParsedName?: string; w9ParsedTin?: string; w9ParsedAddress?: string;
		assignments?: Array<{job: {id: string; name: string; scheduledDate?: string; status: string}}>;
	}>({
		id: '', firstName: '', lastName: '', role: 'worker', status: 'active',
		email: '', phone: '', notes: '',
		w9Uploaded: false, w9Reviewed: false,
	});
	let loading = $state(true);
	let editMode = $state(false);
	let editDraft = $state({} as any);
	let saving = $state(false);

	onMount(async () => {
		workerId = $page.params.id;
		await loadWorker();
	});

	async function loadWorker() {
		loading = true;
		try {
			const res = await fetch(`/api/workers/${workerId}`);
			const data = await res.json();
			worker = data;
			editDraft = { ...data };
		} catch (e) {
			console.error('Failed to load worker', e);
		} finally {
			loading = false;
		}
	}

	function startEdit() {
		editDraft = { ...worker };
		editMode = true;
	}

	async function saveWorker() {
		saving = true;
		try {
			const res = await fetch(`/api/workers/${workerId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editDraft),
			});
			const data = await res.json();
			worker = data;
			editMode = false;
		} catch (e) {
			console.error(e);
		} finally {
			saving = false;
		}
	}

	async function markW9Reviewed() {
		await fetch(`/api/workers/${workerId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ w9Reviewed: true }),
		});
		worker = { ...worker, w9Reviewed: true };
	}
</script>

<a href="/personnel" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; margin-bottom: 12px; display: inline-block;">
	← Back to Personnel
</a>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading worker...</p>
	</div>
{:else}
	<h2 style="margin-bottom: 16px;">{worker.firstName} {worker.lastName}</h2>

	<!-- Profile -->
	<div class="card">
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
			<h3 style="font-size: 1rem;">Profile</h3>
			<button class="btn btn-outline btn-sm" onclick={editMode ? saveWorker : startEdit} disabled={saving}>
				{editMode ? (saving ? 'Saving...' : 'Save') : 'Edit'}
			</button>
		</div>

		{#if editMode}
			<div class="row mb-2">
				<div class="col"><label for="efn">First Name</label><input id="efn" bind:value={editDraft.firstName} /></div>
				<div class="col"><label for="eln">Last Name</label><input id="eln" bind:value={editDraft.lastName} /></div>
			</div>
			<div class="row mb-2">
				<div class="col"><label for="eem">Email</label><input id="eem" type="email" bind:value={editDraft.email} /></div>
				<div class="col"><label for="eph">Phone</label><input id="eph" bind:value={editDraft.phone} /></div>
			</div>
			<div class="row mb-2">
				<div class="col">
					<label for="ero">Role</label>
					<select id="ero" bind:value={editDraft.role}>
						<option value="worker">Worker</option>
						<option value="supervisor">Supervisor</option>
						<option value="admin">Admin</option>
					</select>
				</div>
				<div class="col">
					<label for="est">Status</label>
					<select id="est" bind:value={editDraft.status}>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>
			</div>
			<div class="mb-2"><label for="eno">Notes</label><textarea id="eno" bind:value={editDraft.notes} rows="2"></textarea></div>
		{:else}
			<div class="row mb-2">
				<div class="col"><span class="text-secondary">Email</span><br>{worker.email || '—'}</div>
				<div class="col"><span class="text-secondary">Phone</span><br>{worker.phone || '—'}</div>
			</div>
			<div class="row mb-2">
				<div class="col"><span class="text-secondary">Role</span><br><span class="badge badge-active">{worker.role}</span></div>
				<div class="col"><span class="text-secondary">Status</span><br><span class="badge badge-active">{worker.status}</span></div>
			</div>
			<p class="text-secondary">{worker.notes || 'No notes.'}</p>
		{/if}
	</div>

	<!-- W-9 Section -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 12px;">📄 W-9 Tax Information</h3>
		{#if worker.w9Uploaded}
			<div class="row mb-2">
				<div class="col"><span class="text-secondary">Name on Form</span><br>{worker.w9ParsedName || '—'}</div>
				<div class="col"><span class="text-secondary">TIN</span><br>{worker.w9ParsedTin || '—'}</div>
			</div>
			<div class="mb-2"><span class="text-secondary">Address</span><br>{worker.w9ParsedAddress || '—'}</div>
			<div class="row mt-2" style="gap: 6px;">
				<span class="badge {worker.w9Reviewed ? 'badge-complete' : 'badge-pending'}">
					{worker.w9Reviewed ? '✓ Reviewed' : '⏳ Pending Review'}
				</span>
				{#if !worker.w9Reviewed}
					<button class="btn btn-success btn-sm" onclick={markW9Reviewed}>Mark as Reviewed</button>
				{/if}
			</div>
		{:else}
			<div style="text-align: center; padding: 24px;">
				<p class="text-secondary mb-4">No W-9 on file.</p>
				<input type="file" accept=".pdf,.jpg,.jpeg,.png" style="max-width: 300px; margin: 0 auto;" />
				<button class="btn btn-primary btn-sm mt-2">Upload W-9</button>
			</div>
		{/if}
	</div>

	<!-- Assigned Jobs -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 8px;">Assigned Jobs</h3>
		{#if worker.assignments?.length}
			{#each worker.assignments as a}
				<a href="/jobs/{a.job.id}" style="text-decoration: none; color: inherit;">
					<div class="task-row" style="cursor: pointer;">
						<span class="task-desc">{a.job.name || 'Unnamed Job'}</span>
						{#if a.job.scheduledDate}<span class="text-secondary">📅 {a.job.scheduledDate}</span>{/if}
						<span class="badge badge-pending">{a.job.status}</span>
					</div>
				</a>
			{/each}
		{:else}
			<p class="text-secondary">No jobs assigned.</p>
		{/if}
	</div>
{/if}
