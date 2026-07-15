<script lang="ts">
	import { page } from '$app/stores';
	import '../app.css';

	let stats = $derived($page.data.stats);
	let user = $derived($page.data.user);

	function statusBadge(status: string) {
		const map: Record<string, string> = {
			pending: 'badge-pending', in_progress: 'badge-active',
			completed: 'badge-complete', cancelled: 'badge-danger',
		};
		return map[status] || '';
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric'
		});
	}
</script>

{#if user?.role === 'admin'}
	<div style="margin-bottom: 24px;">
		<h1 style="font-size: 1.4rem; margin-bottom: 4px;">Dashboard</h1>
		<p class="text-secondary">Cleaning service management</p>
	</div>

	<!-- Stats Cards -->
	<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px;">
		<div class="card" style="text-align: center; padding: 20px 16px;">
			<div style="font-size: 2rem; font-weight: 700; color: var(--primary);">{stats?.activeJobs ?? '—'}</div>
			<div class="text-secondary" style="font-size: 0.85rem;">Active Jobs</div>
		</div>
		<div class="card" style="text-align: center; padding: 20px 16px;">
			<div style="font-size: 2rem; font-weight: 700; color: var(--warning);">{stats?.pendingJobs ?? '—'}</div>
			<div class="text-secondary" style="font-size: 0.85rem;">Pending</div>
		</div>
		<div class="card" style="text-align: center; padding: 20px 16px;">
			<div style="font-size: 2rem; font-weight: 700; color: var(--success);">{stats?.completedToday ?? '—'}</div>
			<div class="text-secondary" style="font-size: 0.85rem;">Completed Today</div>
		</div>
		<div class="card" style="text-align: center; padding: 20px 16px;">
			<div style="font-size: 2rem; font-weight: 700;">{stats?.workersOnJob ?? '—'}/{stats?.totalWorkers ?? '—'}</div>
			<div class="text-secondary" style="font-size: 0.85rem;">Workers Active</div>
		</div>
		<div class="card" style="text-align: center; padding: 20px 16px;">
			<div style="font-size: 2rem; font-weight: 700;">{stats?.completionRate ?? '—'}%</div>
			<div class="text-secondary" style="font-size: 0.85rem;">Task Completion</div>
		</div>
	</div>

	<!-- Quick Links -->
	<div style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
		<a href="/quotes" class="btn btn-primary">+ New Quote</a>
		<a href="/jobs" class="btn btn-primary">View All Jobs</a>
		<a href="/clients" class="btn btn-outline">Clients</a>
		<a href="/personnel" class="btn btn-outline">Personnel</a>
		<a href="/dispatch" class="btn btn-outline">📅 Dispatch</a>
	</div>

	<!-- Today's Jobs -->
	<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
		<div class="card">
			<h3 style="font-size: 1rem; margin-bottom: 12px;">Today's Jobs</h3>
			{#if stats?.todayJobs?.length}
				{#each stats.todayJobs as job}
					<a href="/jobs/{job.id}" style="text-decoration: none; color: inherit; display: block; padding: 8px 0; border-bottom: 1px solid var(--border);">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div>
								<span style="font-weight: 500;">{job.clientName}</span>
								<span class="badge {statusBadge(job.status)}" style="margin-left: 8px;">{job.status.replace('_', ' ')}</span>
							</div>
							<div class="text-secondary" style="font-size: 0.85rem;">
								{#if job.assignments?.length}
									{job.assignments.map((a: any) => `${a.worker.firstName}`).join(', ')}
								{/if}
							</div>
						</div>
					</a>
				{/each}
			{:else}
				<p class="text-secondary" style="text-align: center; padding: 16px;">No jobs scheduled for today.</p>
			{/if}
		</div>

		<div class="card">
			<h3 style="font-size: 1rem; margin-bottom: 12px;">Upcoming Jobs</h3>
			{#if stats?.upcomingJobs?.length}
				{#each stats.upcomingJobs as job}
					<a href="/jobs/{job.id}" style="text-decoration: none; color: inherit; display: block; padding: 8px 0; border-bottom: 1px solid var(--border);">
						<div style="display: flex; justify-content: space-between; align-items: center;">
							<div>
								<span style="font-weight: 500;">{job.clientName}</span>
								<span class="text-secondary" style="margin-left: 8px; font-size: 0.85rem;">
									{#if job.scheduledDate}📅 {formatDate(job.scheduledDate)}{/if}
								</span>
							</div>
							<span class="badge {statusBadge(job.status)}">{job.status.replace('_', ' ')}</span>
						</div>
					</a>
				{/each}
			{:else}
				<p class="text-secondary" style="text-align: center; padding: 16px;">No upcoming jobs.</p>
			{/if}
		</div>
	</div>
{/if}
