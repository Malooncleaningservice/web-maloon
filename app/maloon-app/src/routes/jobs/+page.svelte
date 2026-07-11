<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';

	let jobs = $state<Array<{id: string; clientName: string; clientId: string | null; client?: {id: string; name: string} | null; address: string; status: string; scheduledDate: string | null; total: number; isQuote: boolean; assignments?: Array<{worker: {firstName: string; lastName: string}}>}>>([]);
	let loading = $state(true);
	let totalJobs = $state(0);
	let hasMore = $state(false);
	let pageSize = $state(50);
	let showNewJob = $state(false);
	let newJob = $state({ clientId: '', clientName: '', phone: '', email: '', address: '', scheduledDate: '', notes: '', total: '', isRecurring: false, recurrencePattern: '', recurrenceEndDate: '' });
	let saving = $state(false);
	let filterDate = $state('');
	let filterStatus = $state('');
	let error = $state('');

	// Clients for the new job form picker
	let clients = $state<Array<{id: string; name: string; phone: string | null; email: string | null; address: string | null}>>([]);

	onMount(async () => {
		await Promise.all([loadJobs(), loadClients()]);
	});

	async function loadClients() {
		try {
			const res = await fetch('/api/clients');
			if (res.ok) clients = await res.json();
		} catch { /* ignore */ }
	}

	function onClientSelect(event: Event) {
		const select = event.target as HTMLSelectElement;
		const id = select.value;
		newJob.clientId = id;
		if (id) {
			const client = clients.find(c => c.id === id);
			if (client) {
				newJob.clientName = client.name;
				newJob.phone = client.phone || '';
				newJob.email = client.email || '';
				newJob.address = client.address || '';
			}
		}
	}

	async function loadJobs(reset = true) {
		if (reset) {
			jobs = [];
			loading = true;
		}
		error = '';
		try {
			let url = '/api/jobs';
			const params = new URLSearchParams();
			if (filterDate) params.set('date', filterDate);
			if (filterStatus) params.set('status', filterStatus);
			params.set('take', String(pageSize));
			if (!reset) params.set('skip', String(jobs.length));
			const qs = params.toString();
			if (qs) url += '?' + qs;

			const res = await fetch(url);
			if (res.ok) {
				const data = await res.json();
				const mapped = data.jobs.map((j: any) => ({
					...j,
					isQuote: !!j.quoteId,
					clientName: j.clientName ?? 'Unknown',
					address: j.address ?? '',
					total: j.total ?? j.quote?.total ?? undefined,
					assignments: j.assignments ?? [],
				}));
				jobs = reset ? mapped : [...jobs, ...mapped];
				totalJobs = data.total;
				hasMore = jobs.length < totalJobs;
			} else {
				error = 'Failed to load jobs';
			}
		} catch {
			error = 'Could not connect to server';
		} finally {
			loading = false;
		}
	}

	async function createJob() {
		saving = true;
		try {
			await fetch('/api/jobs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clientId: newJob.clientId || undefined,
					clientName: newJob.clientName,
					clientPhone: newJob.phone || undefined,
					clientEmail: newJob.email || undefined,
					address: newJob.address,
					scheduledDate: newJob.scheduledDate || undefined,
					notes: newJob.notes || undefined,
					total: newJob.total ? parseFloat(newJob.total) : undefined,
					isRecurring: newJob.isRecurring,
					recurrencePattern: newJob.recurrencePattern || undefined,
					recurrenceEndDate: newJob.recurrenceEndDate || undefined,
				}),
			});
			showNewJob = false;
			newJob = { clientId: '', clientName: '', phone: '', email: '', address: '', scheduledDate: '', notes: '', total: '', isRecurring: false, recurrencePattern: '', recurrenceEndDate: '' };
			await loadJobs();
		} catch (e) {
			console.error('Create job failed', e);
		} finally {
			saving = false;
		}
	}

	function statusColor(s: string) {
		if (s === 'quote') return '#6c757d';
		if (s === 'pending') return 'var(--warning)';
		if (s === 'in_progress') return 'var(--primary)';
		if (s === 'completed') return 'var(--success)';
		if (s === 'cancelled') return 'var(--danger)';
		return 'var(--text-secondary)';
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric'
		});
	}
</script>

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
	<h2 style="font-size: 1.3rem;">Jobs</h2>
	<button class="btn btn-primary" onclick={() => showNewJob = !showNewJob}>
		{showNewJob ? 'Cancel' : '+ New Job'}
	</button>
</div>

<!-- Date & Status Filters -->
<div class="row mb-4" style="gap: 12px;">
	<div class="col" style="max-width: 200px;">
		<label for="filterDate" style="font-size: 0.85rem;">Filter by Date</label>
		<input id="filterDate" type="date" bind:value={filterDate} onchange={loadJobs} />
	</div>
	<div class="col" style="max-width: 200px;">
		<label for="filterStatus" style="font-size: 0.85rem;">Filter by Status</label>
		<select id="filterStatus" bind:value={filterStatus} onchange={loadJobs}>
			<option value="">All</option>
			<option value="pending">Pending</option>
			<option value="in_progress">In Progress</option>
			<option value="completed">Completed</option>
			<option value="cancelled">Cancelled</option>
		</select>
	</div>
	{#if filterDate || filterStatus}
		<div style="display: flex; align-items: flex-end;">
			<button class="btn btn-outline btn-sm" onclick={() => { filterDate = ''; filterStatus = ''; loadJobs(); }}>
				Clear Filters
			</button>
		</div>
	{/if}
</div>

<!-- New Job Form -->
{#if showNewJob}
	<div class="card">
		<h3 style="margin-bottom: 12px;">Create Job</h3>

		{#if clients.length > 0}
			<div class="mb-2">
				<label for="cjClient">Select Client (optional)</label>
				<select id="cjClient" value={newJob.clientId} onchange={onClientSelect}>
					<option value="">— Type manually below —</option>
					{#each clients as c}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div class="row mb-2">
			<div class="col"><label for="cjName">Client / Business</label><input id="cjName" bind:value={newJob.clientName} /></div>
			<div class="col"><label for="cjPhone">Phone</label><input id="cjPhone" bind:value={newJob.phone} /></div>
		</div>
		<div class="mb-2"><label for="cjAddr">Address</label><input id="cjAddr" bind:value={newJob.address} /></div>
		<div class="row mb-2">
			<div class="col"><label for="cjEmail">Email</label><input id="cjEmail" type="email" bind:value={newJob.email} /></div>
			<div class="col"><label for="cjDate">Scheduled</label><input id="cjDate" type="datetime-local" bind:value={newJob.scheduledDate} /></div>
		</div>
		<div class="row mb-2">
			<div class="col"><label for="cjTotal">Total ($)</label><input id="cjTotal" type="number" step="0.01" min="0" placeholder="0.00" bind:value={newJob.total} /></div>
			<div class="col" style="display: flex; align-items: flex-end; gap: 8px;">
				<label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.85rem;">
					<input type="checkbox" bind:checked={newJob.isRecurring} />
					Recurring
				</label>
			</div>
		</div>
		{#if newJob.isRecurring}
			<div class="row mb-2">
				<div class="col">
					<label for="cjPattern">Frequency</label>
					<select id="cjPattern" bind:value={newJob.recurrencePattern}>
						<option value="">— Select —</option>
						<option value="weekly">Weekly</option>
						<option value="biweekly">Biweekly</option>
						<option value="fourWeekly">Every 4 Weeks</option>
						<option value="monthly">Monthly</option>
					</select>
				</div>
				<div class="col"><label for="cjEndDate">End Date</label><input id="cjEndDate" type="date" bind:value={newJob.recurrenceEndDate} /></div>
			</div>
		{/if}
		<div class="mb-4"><label for="cjNotes">Notes</label><textarea id="cjNotes" bind:value={newJob.notes} rows="2"></textarea></div>
		<button class="btn btn-success" onclick={createJob} disabled={saving}>
			{saving ? 'Creating...' : 'Create Job'}
		</button>
	</div>
{/if}

<!-- Job List -->
{#if error}
	<div class="card" style="border-left: 3px solid var(--danger); margin-bottom: 16px;">
		<p style="color: var(--danger); font-weight: 600;">{error}</p>
		<button class="btn btn-outline btn-sm" style="margin-top: 4px;" onclick={loadJobs}>Retry</button>
	</div>
{/if}
{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading jobs...</p>
	</div>
{:else}
	{#each jobs as job}
		<a href="/jobs/{job.id}" style="text-decoration: none; color: inherit; display: block;">
			<div class="card" style="cursor: pointer;">
				<div style="display: flex; justify-content: space-between; align-items: flex-start;">
					<div style="flex: 1; min-width: 0;">
						<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
							<h3 style="font-size: 1rem; margin: 0;">{job.clientName}</h3>
							{#if job.clientId && job.client}
								<a href="/clients/{job.clientId}" class="text-secondary" style="font-size: 0.75rem; text-decoration: underline;" onclick={(e) => e.stopPropagation()}>
									(client)
								</a>
							{/if}
							{#if job.isQuote}
								<span class="badge badge-quote">QUOTE</span>
							{/if}
							<span class="badge" style="background: {statusColor(job.status)}20; color: {statusColor(job.status)};">
								{job.status.replace('_', ' ')}
							</span>
						</div>
						<p class="text-secondary">{job.address}</p>
						{#if job.assignments?.length}
							<p class="text-secondary" style="font-size: 0.8rem;">
								👷 {job.assignments.map(a => `${a.worker.firstName} ${a.worker.lastName}`).join(', ')}
							</p>
						{/if}
					</div>
					<div style="text-align: right;">
						{#if job.total != null}
							<div class="fw-bold" style="font-size: 1.1rem;">${job.total.toFixed(2)}</div>
						{:else}
							<div class="fw-bold text-secondary" style="font-size: 1.1rem;">—</div>
						{/if}
						{#if job.scheduledDate}
							<span class="text-secondary">📅 {formatDate(job.scheduledDate)}</span>
						{/if}
					</div>
				</div>
			</div>
		</a>
	{/each}

	{#if jobs.length === 0}
		<div class="card" style="text-align: center; padding: 40px;">
			<p class="text-secondary">No jobs found. Create one or adjust filters.</p>
		</div>
	{/if}

	{#if hasMore}
		<div style="text-align: center; padding: 16px;">
			<button class="btn btn-outline" onclick={() => loadJobs(false)}>
				Load More ({totalJobs - jobs.length} remaining)
			</button>
		</div>
	{:else if jobs.length > 0}
		<div style="text-align: center; padding: 16px;">
			<span class="text-secondary">Showing {jobs.length} of {totalJobs} jobs</span>
		</div>
	{/if}
{/if}
