<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';

	let jobs = $state<Array<{id: string; clientName: string; address: string; status: string; scheduledDate: string | null; total: number; isQuote: boolean; quotes?: Array<{id: string}>}>>([]);
	let loading = $state(true);
	let showNewJob = $state(false);
	let newJob = $state({ clientName: '', phone: '', email: '', address: '', scheduledDate: '', notes: '' });
	let saving = $state(false);

	onMount(async () => {
		await loadJobs();
	});

	async function loadJobs() {
		loading = true;
		try {
			const res = await fetch('/api/jobs');
			const data = await res.json();
			jobs = data.map((j: any) => ({
				...j,
				isQuote: !!j.quoteId,
				clientName: j.clientName ?? 'Unknown',
				address: j.address ?? '',
				total: j.total ?? j.quote?.total ?? 0,
			}));
		} catch {
			console.log('API not available, using placeholder data');
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
					clientName: newJob.clientName,
					address: newJob.address,
					scheduledDate: newJob.scheduledDate || undefined,
					notes: newJob.notes || undefined,
					total: 0,
				}),
			});
			showNewJob = false;
			newJob = { clientName: '', phone: '', email: '', address: '', scheduledDate: '', notes: '' };
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
		return 'var(--text-secondary)';
	}
</script>

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
	<h2 style="font-size: 1.3rem;">Jobs</h2>
	<button class="btn btn-primary" onclick={() => showNewJob = !showNewJob}>
		{showNewJob ? 'Cancel' : '+ New Job'}
	</button>
</div>

<!-- New Job Form -->
{#if showNewJob}
	<div class="card">
		<h3 style="margin-bottom: 12px;">Create Job</h3>
		<div class="row mb-2">
			<div class="col"><label for="cjName">Client / Business</label><input id="cjName" bind:value={newJob.clientName} /></div>
			<div class="col"><label for="cjPhone">Phone</label><input id="cjPhone" bind:value={newJob.phone} /></div>
		</div>
		<div class="mb-2"><label for="cjAddr">Address</label><input id="cjAddr" bind:value={newJob.address} /></div>
		<div class="row mb-4">
			<div class="col"><label for="cjEmail">Email</label><input id="cjEmail" type="email" bind:value={newJob.email} /></div>
			<div class="col"><label for="cjDate">Scheduled</label><input id="cjDate" type="date" bind:value={newJob.scheduledDate} /></div>
		</div>
		<div class="mb-4"><label for="cjNotes">Notes</label><textarea id="cjNotes" bind:value={newJob.notes} rows="2"></textarea></div>
		<button class="btn btn-success" onclick={createJob} disabled={saving}>
			{saving ? 'Creating...' : 'Create Job'}
		</button>
	</div>
{/if}

<!-- Job List -->
{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading jobs...</p>
	</div>
{:else}
	{#each jobs as job}
		<a href="/jobs/{job.id}" style="text-decoration: none; color: inherit; display: block;">
			<div class="card" style="cursor: pointer;">
				<div style="display: flex; justify-content: space-between; align-items: flex-start;">
					<div>
						<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
							<h3 style="font-size: 1rem;">{job.clientName}</h3>
							{#if job.isQuote}
								<span class="badge badge-quote">QUOTE</span>
							{/if}
							<span class="badge" style="background: {statusColor(job.status)}20; color: {statusColor(job.status)};">
								{job.status.replace('_', ' ')}
							</span>
						</div>
						<p class="text-secondary">{job.address}</p>
					</div>
					<div style="text-align: right;">
						<div class="fw-bold" style="font-size: 1.1rem;">${job.total.toFixed(2)}</div>
						{#if job.scheduledDate}
							<span class="text-secondary">📅 {job.scheduledDate}</span>
						{/if}
					</div>
				</div>
			</div>
		</a>
	{/each}

	{#if jobs.length === 0}
		<div class="card" style="text-align: center; padding: 40px;">
			<p class="text-secondary">No jobs yet. Create one or save a quote from the Quotes tab.</p>
		</div>
	{/if}
{/if}
