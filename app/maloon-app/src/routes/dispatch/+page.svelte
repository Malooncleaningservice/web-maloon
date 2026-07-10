<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';

	let selectedDate = $state(new Date().toISOString().slice(0, 10));
	let jobs = $state<Array<any>>([]);
	let loading = $state(true);
	let allWorkers = $state<Array<{id: string; firstName: string; lastName: string; status: string}>>([]);
	let assignWorker = $state<Record<string, string>>({});
	let assigning = $state<Record<string, boolean>>({});

	onMount(async () => {
		await loadWorkers();
		await loadJobs();
	});

	async function loadWorkers() {
		try {
			const res = await fetch('/api/workers');
			const data = await res.json();
			allWorkers = data.filter((w: any) => w.status === 'active');
		} catch { /* ignore */ }
	}

	async function loadJobs() {
		loading = true;
		try {
			const res = await fetch(`/api/jobs?date=${selectedDate}`);
			jobs = await res.json();
		} catch (e) {
			console.error('Failed to load jobs', e);
		} finally {
			loading = false;
		}
	}

	function changeDate(days: number) {
		const d = new Date(selectedDate + 'T00:00:00');
		d.setDate(d.getDate() + days);
		selectedDate = d.toISOString().slice(0, 10);
		loadJobs();
	}

	async function assignWorkerToJob(jobId: string) {
		const workerId = assignWorker[jobId];
		if (!workerId) return;

		assigning = { ...assigning, [jobId]: true };
		try {
			const res = await fetch(`/api/jobs/${jobId}/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ workerId }),
			});
			if (res.status === 409) {
				const data = await res.json();
				alert(`Conflict: ${data.conflict?.clientName}`);
				return;
			}
			if (res.ok) {
				assignWorker = { ...assignWorker, [jobId]: '' };
				await loadJobs();
			}
		} catch (e) {
			console.error(e);
		} finally {
			assigning = { ...assigning, [jobId]: false };
		}
	}

	async function removeAssignment(jobId: string, assignmentId: string) {
		try {
			await fetch(`/api/jobs/${jobId}/assign`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assignmentId }),
			});
			await loadJobs();
		} catch (e) { console.error(e); }
	}

	function statusBadge(status: string) {
		const map: Record<string, string> = {
			pending: 'badge-pending', in_progress: 'badge-active',
			completed: 'badge-complete', cancelled: 'badge-danger',
		};
		return map[status] || '';
	}

	function unassignedForJob(job: any) {
		const assignedIds = new Set(job.assignments?.map((a: any) => a.worker.id) ?? []);
		return allWorkers.filter(w => !assignedIds.has(w.id));
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
		});
	}
</script>

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
	<h2 style="font-size: 1.3rem;">Dispatch</h2>
	<div style="display: flex; gap: 8px; align-items: center;">
		<button class="btn btn-outline btn-sm" onclick={() => changeDate(-1)}>← Prev</button>
		<input type="date" bind:value={selectedDate} onchange={loadJobs} style="max-width: 180px;" />
		<button class="btn btn-outline btn-sm" onclick={() => changeDate(1)}>Next →</button>
		<button class="btn btn-outline btn-sm" onclick={() => { selectedDate = new Date().toISOString().slice(0, 10); loadJobs(); }}>Today</button>
	</div>
</div>

<h3 class="text-secondary" style="font-size: 1rem; margin-bottom: 16px;">
	{formatDate(selectedDate)}
</h3>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading jobs...</p>
	</div>
{:else if jobs.length === 0}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary mb-4">No jobs scheduled for this day.</p>
		<a href="/jobs" class="btn btn-primary">+ Create a Job</a>
	</div>
{:else}
	{#each jobs as job}
		<div class="card">
			<div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
				<div style="flex: 1; min-width: 200px;">
					<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
						<a href="/jobs/{job.id}" style="font-weight: 600; font-size: 1rem; color: var(--primary); text-decoration: none;">
							{job.clientName}
						</a>
						<span class="badge {statusBadge(job.status)}">{job.status.replace('_', ' ')}</span>
					</div>
					<p class="text-secondary">{job.address}</p>
					{#if job.notes}
						<p class="text-secondary" style="font-size: 0.85rem; font-style: italic;">{job.notes}</p>
					{/if}
				</div>

				<div style="min-width: 250px;">
					<!-- Assigned Workers -->
					<div style="margin-bottom: 8px;">
						{#if job.assignments?.length}
							{#each job.assignments as a}
								<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;">
									<span style="font-size: 0.85rem;">👷 {a.worker.firstName} {a.worker.lastName}</span>
									<button class="btn btn-danger btn-sm" style="padding: 1px 5px; font-size: 0.65rem;"
										onclick={() => removeAssignment(job.id, a.id)}>✕</button>
								</div>
							{/each}
						{:else}
							<span class="text-secondary" style="font-size: 0.85rem;">No workers assigned</span>
						{/if}
					</div>

					<!-- Quick Assign -->
					{#if unassignedForJob(job).length > 0}
						<div style="display: flex; gap: 6px;">
							<select
								bind:value={assignWorker[job.id]}
								style="font-size: 0.8rem; padding: 4px 8px;"
							>
								<option value="">+ Assign...</option>
								{#each unassignedForJob(job) as w}
									<option value={w.id}>{w.firstName} {w.lastName}</option>
								{/each}
							</select>
							<button
								class="btn btn-primary btn-sm"
								style="font-size: 0.75rem; padding: 4px 10px;"
								onclick={() => assignWorkerToJob(job.id)}
								disabled={assigning[job.id] || !assignWorker[job.id]}
							>
								{assigning[job.id] ? '...' : 'Go'}
							</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/each}
{/if}
