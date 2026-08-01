<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	type Job = {
		id: string; clientName: string; address: string; status: string; scheduledDate: string | null;
		assignments?: Array<{ workerId: string }>;
	};

	let user = $state<{ id: string; displayName: string | null; workerId: string | null; worker?: { firstName: string; lastName: string } | null } | null>(null);
	let jobs = $state<Job[]>([]);
	let loading = $state(true);
	let now = $state(Date.now());
	let timer: ReturnType<typeof setInterval> | undefined;

	onMount(async () => {
		try {
			const meRes = await fetch('/api/auth/me');
			if (meRes.ok) user = await meRes.json();
			if (user?.workerId) {
				const res = await fetch('/api/worker/jobs');
				if (res.ok) jobs = await res.json();
			}
		} catch { /* ignore */ }
		loading = false;
		timer = setInterval(() => (now = Date.now()), 30000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	function isToday(iso: string | null): boolean {
		if (!iso) return false;
		const d = new Date(iso);
		const n = new Date();
		return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
	}

	function byDate(a: Job, b: Job): number {
		if (!a.scheduledDate && !b.scheduledDate) return 0;
		if (!a.scheduledDate) return 1;
		if (!b.scheduledDate) return -1;
		return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
	}

	function mapsUrl(address: string): string {
		return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	}

	function crewLabel(job: Job): string {
		const n = job.assignments?.length ?? 0;
		return n <= 1 ? 'Solo job' : `${n} crew`;
	}

	let activeJobs = $derived(jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled').sort(byDate));
	let nextJob = $derived(activeJobs.find((j) => j.status === 'in_progress') ?? activeJobs[0] ?? null);
	let laterToday = $derived(activeJobs.filter((j) => j !== nextJob && isToday(j.scheduledDate)));

	let jobsTodayCount = $derived(jobs.filter((j) => j.status !== 'cancelled' && isToday(j.scheduledDate)).length);
	let completedTodayCount = $derived(jobs.filter((j) => j.status === 'completed' && isToday(j.scheduledDate)).length);

	let nextJobIn = $derived.by(() => {
		if (!nextJob) return '—';
		if (nextJob.status === 'in_progress') return 'Now';
		if (!nextJob.scheduledDate) return '—';
		const diffMs = new Date(nextJob.scheduledDate).getTime() - now;
		if (diffMs <= 0) return 'Now';
		const mins = Math.round(diffMs / 60000);
		if (mins < 60) return `${mins}m`;
		const hrs = Math.floor(mins / 60);
		const remMins = mins % 60;
		return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
	});

	let greeting = $derived.by(() => {
		const hour = new Date(now).getHours();
		if (hour < 12) return 'Good morning';
		if (hour < 17) return 'Good afternoon';
		return 'Good evening';
	});

	let firstName = $derived(user?.worker?.firstName || user?.displayName || 'there');
	let todayLabel = $derived(new Date(now).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));

	async function heroAction(job: Job) {
		if (job.status === 'pending') {
			try {
				await fetch(`/api/worker/jobs/${job.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: 'in_progress' })
				});
			} catch { /* ignore */ }
		}
		goto(`/worker/jobs/${job.id}`);
	}
</script>

<div class="wh-topband">
	<div class="wh-topband-row">
		<span class="wh-logo">Indigo</span>
	</div>
	<div class="wh-date">{todayLabel}</div>
	<div class="wh-greeting">{greeting}, {firstName}</div>
</div>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading...</p>
	</div>
{:else if jobs.length === 0}
	<div class="wh-glass wh-empty">
		<div class="wh-icon">
			<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h8l6 6v14H6z" /><path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h6" /></svg>
		</div>
		<h3 style="margin-bottom: 6px;">No jobs assigned</h3>
		<p class="text-secondary">You don't have any jobs assigned yet. Check back later or contact your supervisor.</p>
	</div>
{:else}
	<div class="wh-stat-row">
		<div class="wh-glass wh-stat-tile">
			<div class="wh-stat-value">{jobsTodayCount}</div>
			<div class="wh-stat-label">Jobs today</div>
		</div>
		<div class="wh-glass wh-stat-tile">
			<div class="wh-stat-value">{completedTodayCount}</div>
			<div class="wh-stat-label">Completed</div>
		</div>
		<div class="wh-glass wh-stat-tile">
			<div class="wh-stat-value">{nextJobIn}</div>
			<div class="wh-stat-label">Next job in</div>
		</div>
	</div>

	{#if nextJob}
		<h6 class="wh-section-title">Up next</h6>
		<div class="wh-glass wh-next-card">
			<div class="wh-next-top">
				<div>
					<div class="wh-next-name">{nextJob.clientName}</div>
					<a href={mapsUrl(nextJob.address)} target="_blank" rel="noopener" class="wh-next-meta wh-next-address">
						<svg class="wh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
						{nextJob.address}
					</a>
				</div>
				{#if nextJob.status === 'in_progress'}
					<span class="wh-tag wh-tag-next">In progress</span>
				{:else if nextJob.scheduledDate}
					<span class="wh-tag wh-tag-next">{formatTime(nextJob.scheduledDate)}</span>
				{/if}
			</div>
			<div class="wh-next-meta">
				<svg class="wh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.5 2.5-6 6-6s6 2.5 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M15 14c2.8.3 5 2.6 5 6" /></svg>
				{crewLabel(nextJob)}
			</div>
			<div class="wh-next-actions">
				<button class="btn btn-primary" onclick={() => heroAction(nextJob!)}>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 20-8-4-8 4z" /></svg>
					{nextJob.status === 'in_progress' ? 'Continue' : 'Start job'}
				</button>
				<a class="btn btn-outline" href="/worker/jobs/{nextJob.id}">Details</a>
			</div>
		</div>
	{/if}

	{#if laterToday.length > 0}
		<h6 class="wh-section-title">Later today</h6>
		{#each laterToday as job}
			<a class="wh-glass wh-later-card" href="/worker/jobs/{job.id}">
				<div class="wh-next-top">
					<div>
						<div class="wh-later-name">{job.clientName}</div>
						<div class="wh-next-meta">
							<svg class="wh-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>
							{job.address}
						</div>
					</div>
					{#if job.scheduledDate}
						<span class="wh-tag wh-tag-neutral">{formatTime(job.scheduledDate)}</span>
					{/if}
				</div>
			</a>
		{/each}
	{/if}

	<h6 class="wh-section-title">Quick access</h6>
	<div class="wh-qa-grid">
		<a class="wh-glass wh-qa-tile" href="/worker/jobs">
			<svg class="wh-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l1.5 1.5L8 5" /><path d="M4 12l1.5 1.5L8 11" /><path d="M4 18l1.5 1.5L8 17" /><path d="M11 6h9" /><path d="M11 12h9" /><path d="M11 18h9" /></svg>
			<span>Jobs</span>
		</a>
		<a class="wh-glass wh-qa-tile" class:disabled={!nextJob} href={nextJob ? mapsUrl(nextJob.address) : undefined} target={nextJob ? '_blank' : undefined} rel={nextJob ? 'noopener' : undefined}>
			<svg class="wh-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8 20-8-4-8 4z" /></svg>
			<span>Directions</span>
		</a>
		<a class="wh-glass wh-qa-tile" href="/worker/jobs?view=history">
			<svg class="wh-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
			<span>History</span>
		</a>
		<a class="wh-glass wh-qa-tile" href="/worker/profile">
			<svg class="wh-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 19a6 6 0 0 1 11 0" /></svg>
			<span>Profile</span>
		</a>
	</div>
{/if}
