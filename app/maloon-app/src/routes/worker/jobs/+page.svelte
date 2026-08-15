<script lang="ts">
	import { onMount } from 'svelte';

	type Job = {
		id: string; clientName: string; address: string; status: string; scheduledDate: string | null;
		sections?: Array<{ id: string; name: string; tasks: Array<{ id: string; description: string; completed: boolean }> }>;
		startWithTasks?: Array<{ id: string; description: string; completed: boolean }>;
	};

	let jobs = $state<Job[]>([]);
	let loading = $state(true);
	let view = $state<'active' | 'history'>('active');

	onMount(async () => {
		if (new URLSearchParams(window.location.search).get('view') === 'history') view = 'history';
		try {
			const res = await fetch('/api/worker/jobs');
			if (res.ok) jobs = await res.json();
		} catch { /* ignore */ }
		loading = false;
	});

	function completedTasks(job: Job): { total: number; done: number } {
		let total = 0, done = 0;
		if (job.sections) {
			for (const s of job.sections) {
				for (const t of s.tasks || []) {
					total++;
					if (t.completed) done++;
				}
			}
		}
		if (job.startWithTasks) {
			total += job.startWithTasks.length;
			done += job.startWithTasks.filter((t) => t.completed).length;
		}
		return { total, done };
	}

	function byDateAsc(a: Job, b: Job): number {
		if (!a.scheduledDate && !b.scheduledDate) return 0;
		if (!a.scheduledDate) return 1;
		if (!b.scheduledDate) return -1;
		return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
	}

	function byDateDesc(a: Job, b: Job): number {
		if (!a.scheduledDate && !b.scheduledDate) return 0;
		if (!a.scheduledDate) return 1;
		if (!b.scheduledDate) return -1;
		return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
	}

	function isToday(iso: string | null): boolean {
		if (!iso) return false;
		const d = new Date(iso);
		const now = new Date();
		return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '';
		const d = new Date(iso);
		const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
		const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
		return hasTime ? `${dateStr} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : dateStr;
	}

	let activeJobs = $derived(jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled').sort(byDateAsc));
	let todayJobs = $derived(activeJobs.filter((j) => isToday(j.scheduledDate)));
	let upcomingJobs = $derived(activeJobs.filter((j) => !isToday(j.scheduledDate)));
	let doneJobs = $derived(jobs.filter((j) => j.status === 'completed').sort(byDateDesc));
</script>

{#snippet jobCard(job: Job)}
	<a href="/worker/jobs/{job.id}" class="job-card">
		<div class="card">
			<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
				<h3 style="font-size: 1rem; flex: 1;">{job.clientName}</h3>
				<span class="badge badge-status-{job.status}">
					{job.status.replace('_', ' ').toUpperCase()}
				</span>
			</div>
			<p class="text-secondary">{job.address}</p>
			{#if job.scheduledDate}
				<p class="text-secondary">📅 {formatDate(job.scheduledDate)}</p>
			{/if}
			{#if completedTasks(job).total > 0}
				<div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
					<div class="progress-track" style="flex: 1;">
						<div class="progress-fill" style="width: {completedTasks(job).done / completedTasks(job).total * 100}%"></div>
					</div>
					<span style="font-size: 0.8rem; font-weight: 600; white-space: nowrap;">
						{completedTasks(job).done}/{completedTasks(job).total}
					</span>
				</div>
			{/if}
		</div>
	</a>
{/snippet}

<h2 style="margin-bottom: 16px;">Jobs</h2>

<div class="wh-view-toggle">
	<button class:active={view === 'active'} onclick={() => (view = 'active')}>Active</button>
	<button class:active={view === 'history'} onclick={() => (view = 'history')}>History ({doneJobs.length})</button>
</div>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading...</p>
	</div>
{:else if view === 'active'}
	{#if activeJobs.length === 0}
		<div class="card" style="text-align: center; padding: 40px 20px;">
			<p class="text-secondary">No active jobs. Check back later.</p>
		</div>
	{:else}
		{#if todayJobs.length > 0}
			<div class="job-group-title">Today</div>
			{#each todayJobs as job}
				{@render jobCard(job)}
			{/each}
		{/if}
		{#if upcomingJobs.length > 0}
			<div class="job-group-title">Upcoming</div>
			{#each upcomingJobs as job}
				{@render jobCard(job)}
			{/each}
		{/if}
	{/if}
{:else if doneJobs.length === 0}
	<div class="card" style="text-align: center; padding: 40px 20px;">
		<p class="text-secondary">No completed jobs yet.</p>
	</div>
{:else}
	{#each doneJobs as job}
		{@render jobCard(job)}
	{/each}
{/if}
