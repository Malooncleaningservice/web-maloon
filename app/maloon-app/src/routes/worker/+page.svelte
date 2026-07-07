<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';

	let user = $state<{ id: string; displayName: string | null; workerId: string | null; worker?: { firstName: string; lastName: string } | null } | null>(null);
	let jobs = $state<Array<{
		id: string; clientName: string; address: string; status: string; scheduledDate: string | null;
		sections?: Array<{ id: string; name: string; tasks: Array<{ id: string; description: string; completed: boolean }> }>;
		startWithTasks?: Array<{ id: string; description: string; completed: boolean }>;
	}>>([]);
	let loading = $state(true);

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
			// Use the jobs API with assignments filtered by worker
			const res = await fetch('/api/jobs');
			if (res.ok) {
				const allJobs = await res.json();
				// Filter jobs where this worker is assigned
				const workerJobs = allJobs.filter((j: any) =>
					j.assignments?.some((a: any) => a.workerId === user?.workerId)
				);
				// For each job, load details to get sections/tasks
				const detailedJobs = await Promise.all(
					workerJobs.map(async (j: any) => {
						try {
							const dRes = await fetch(`/api/jobs/${j.id}`);
							if (dRes.ok) return await dRes.json();
						} catch { /* ignore */ }
						return j;
					})
				);
				jobs = detailedJobs;
			}
		} catch { /* ignore */ }
	}

	function completedTasks(job: any): { total: number; done: number } {
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
			done += job.startWithTasks.filter((t: any) => t.completed).length;
		}
		return { total, done };
	}

	function statusColor(s: string) {
		if (s === 'pending') return '#e6a817';
		if (s === 'in_progress') return '#1a73e8';
		if (s === 'completed') return '#0d904f';
		return '#5f6368';
	}

	let greeting = $state('');
	onMount(() => {
		const hour = new Date().getHours();
		if (hour < 12) greeting = 'Good morning';
		else if (hour < 17) greeting = 'Good afternoon';
		else greeting = 'Good evening';
	});
</script>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading...</p>
	</div>
{:else}
	<div style="margin-bottom: 24px;">
		<h2 style="font-size: 1.3rem; margin-bottom: 4px;">
			{greeting}, {user?.worker?.firstName || user?.displayName || 'Worker'}!
		</h2>
		<p class="text-secondary">Here are your assigned jobs for today.</p>
	</div>

	{#if jobs.length === 0}
		<div class="card" style="text-align: center; padding: 48px 20px;">
			<div style="font-size: 3rem; margin-bottom: 12px;">📋</div>
			<h3 style="margin-bottom: 8px;">No Jobs Assigned</h3>
			<p class="text-secondary">You don't have any jobs assigned yet. Check back later or contact your supervisor.</p>
		</div>
	{:else}
		{#each jobs as job}
			<a href="/worker/jobs/{job.id}" style="text-decoration: none; color: inherit; display: block;">
				<div class="card" style="cursor: pointer;">
					<div style="display: flex; justify-content: space-between; align-items: flex-start;">
						<div>
							<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
								<h3 style="font-size: 1rem;">{job.clientName}</h3>
								<span class="badge" style="background: {statusColor(job.status)}20; color: {statusColor(job.status)};">
									{job.status.replace('_', ' ').toUpperCase()}
								</span>
							</div>
							<p class="text-secondary">{job.address}</p>
							{#if job.scheduledDate}
								<p class="text-secondary">📅 {job.scheduledDate}</p>
							{/if}
						</div>
					<div style="text-align: right;">
						{#if completedTasks(job).total > 0}
							<div style="font-size: 0.85rem; font-weight: 600;">
								{completedTasks(job).done}/{completedTasks(job).total} tasks
							</div>
							<div style="width: 80px; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-top: 4px;">
								<div style="width: {completedTasks(job).done / completedTasks(job).total * 100}%; height: 100%; background: var(--primary); border-radius: 4px; transition: width 0.3s;"></div>
							</div>
						{/if}
					</div>
					</div>
				</div>
			</a>
		{/each}
	{/if}
{/if}