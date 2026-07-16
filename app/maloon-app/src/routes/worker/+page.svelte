<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	type Job = {
		id: string; clientName: string; address: string; status: string; scheduledDate: string | null;
		sections?: Array<{ id: string; name: string; tasks: Array<{ id: string; description: string; completed: boolean }> }>;
		startWithTasks?: Array<{ id: string; description: string; completed: boolean }>;
	};

	let user = $state<{ id: string; displayName: string | null; workerId: string | null; worker?: { firstName: string; lastName: string } | null } | null>(null);
	let jobs = $state<Job[]>([]);
	let loading = $state(true);
	let startingJob = $state(false);

	onMount(async () => {
		try {
			const meRes = await fetch('/api/auth/me');
			if (meRes.ok) user = await meRes.json();

			if (user?.workerId) {
				await loadAssignedJobs();
			}
		} catch { /* ignore */ }
		loading = false;
	});

	async function loadAssignedJobs() {
		try {
			const res = await fetch('/api/worker/jobs');
			if (res.ok) {
				jobs = await res.json();
			}
		} catch { /* ignore */ }
	}

	function completedTasks(job: Job): { total: number; done: number } {
		let total = 0, done = 0;
		if (job.sections) {
			for (const s of job.sections) {
				if (s.tasks) {
					for (const t of s.tasks) {
						total++;
						if (t.completed) done++;
					}
				}
			}
		}
		if (job.startWithTasks) {
			total += job.startWithTasks.length;
			done += job.startWithTasks.filter((t) => t.completed).length;
		}
		return { total, done };
	}

	function statusColor(s: string) {
		if (s === 'pending') return '#e6a817';
		if (s === 'in_progress') return '#1a73e8';
		if (s === 'completed') return '#0d904f';
		return '#5f6368';
	}

	function byDate(a: Job, b: Job): number {
		if (!a.scheduledDate && !b.scheduledDate) return 0;
		if (!a.scheduledDate) return 1;
		if (!b.scheduledDate) return -1;
		return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
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

	function mapsUrl(address: string): string {
		return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
	}

	let activeJobs = $derived(jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled').sort(byDate));
	let nextJob = $derived(activeJobs.find((j) => j.status === 'in_progress') ?? activeJobs[0] ?? null);
	let todayJobs = $derived(activeJobs.filter((j) => j !== nextJob && isToday(j.scheduledDate)));
	let upcomingJobs = $derived(activeJobs.filter((j) => j !== nextJob && !isToday(j.scheduledDate)));
	let doneJobs = $derived(jobs.filter((j) => j.status === 'completed').sort(byDate));

	async function heroAction(job: Job) {
		if (job.status === 'pending') {
			startingJob = true;
			try {
				await fetch(`/api/worker/jobs/${job.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: 'in_progress' })
				});
			} catch { /* ignore */ }
			startingJob = false;
		}
		goto(`/worker/jobs/${job.id}`);
	}

	let greeting = $state('');
	onMount(() => {
		const hour = new Date().getHours();
		if (hour < 12) greeting = 'Good morning';
		else if (hour < 17) greeting = 'Good afternoon';
		else greeting = 'Good evening';
	});
</script>

{#snippet jobCard(job: Job)}
	<a href="/worker/jobs/{job.id}" class="job-card">
		<div class="card">
			<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
				<h3 style="font-size: 1rem; flex: 1;">{job.clientName}</h3>
				<span class="badge" style="background: {statusColor(job.status)}20; color: {statusColor(job.status)};">
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

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading...</p>
	</div>
{:else}
	<div style="margin-bottom: 20px;">
		<h2 style="font-size: 1.3rem; margin-bottom: 4px;">
			{greeting}, {user?.worker?.firstName || user?.displayName || 'Worker'}!
		</h2>
		<p class="text-secondary">Here's what's on your plate.</p>
	</div>

	{#if jobs.length === 0}
		<div class="card" style="text-align: center; padding: 48px 20px;">
			<div style="font-size: 3rem; margin-bottom: 12px;">📋</div>
			<h3 style="margin-bottom: 8px;">No Jobs Assigned</h3>
			<p class="text-secondary">You don't have any jobs assigned yet. Check back later or contact your supervisor.</p>
		</div>
	{:else}
		{#if nextJob}
			<div class="hero-card">
				<div class="hero-label">
					{nextJob.status === 'in_progress' ? '● In progress' : 'Up next'}
				</div>
				<h3>{nextJob.clientName}</h3>
				<a href={mapsUrl(nextJob.address)} target="_blank" rel="noopener" class="hero-address" style="color: inherit; display: inline-block; margin-bottom: 4px;">
					📍 {nextJob.address}
				</a>
				{#if nextJob.scheduledDate}
					<div class="hero-address">📅 {formatDate(nextJob.scheduledDate)}</div>
				{/if}
				{#if completedTasks(nextJob).total > 0}
					<div style="display: flex; align-items: center; gap: 10px; margin-top: 14px;">
						<div class="progress-track" style="flex: 1;">
							<div class="progress-fill" style="width: {completedTasks(nextJob).done / completedTasks(nextJob).total * 100}%"></div>
						</div>
						<span style="font-size: 0.8rem; font-weight: 600; white-space: nowrap;">
							{completedTasks(nextJob).done}/{completedTasks(nextJob).total} tasks
						</span>
					</div>
				{/if}
				<button class="hero-cta" onclick={() => heroAction(nextJob!)} disabled={startingJob}>
					{startingJob ? 'Starting...' : nextJob.status === 'in_progress' ? 'Continue →' : '▶ Start Job'}
				</button>
			</div>
		{/if}

		{#if todayJobs.length > 0}
			<div class="job-group-title">Also today</div>
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

		{#if doneJobs.length > 0}
			<details style="margin-top: 20px;">
				<summary class="job-group-title" style="cursor: pointer; list-style: none;">
					✓ Done ({doneJobs.length}) — tap to show
				</summary>
				{#each doneJobs as job}
					{@render jobCard(job)}
				{/each}
			</details>
		{/if}
	{/if}
{/if}
