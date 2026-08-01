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

	// Edge color for a job status (used for the left-edge bar on dashboard rows).
	function statusEdge(status: string) {
		const map: Record<string, string> = {
			pending: 'var(--warning)',
			in_progress: 'var(--primary)',
			completed: 'var(--success)',
			cancelled: 'var(--danger)',
		};
		return map[status] || 'var(--border)';
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric'
		});
	}

	let firstName = $derived(
		user?.displayName?.split(' ')[0] ||
		user?.worker?.firstName ||
		'Admin'
	);
</script>

{#if user?.role === 'admin'}
	<div style="margin-bottom: 20px;">
		<h1 style="font-size: 1.4rem; margin-bottom: 4px;">Welcome back, {firstName}.</h1>
		<p class="text-secondary">
			{#if (stats?.pendingJobs ?? 0) > 0}
				You have <a href="/jobs?status=pending" style="color: var(--warning); font-weight: 600;">{stats?.pendingJobs} job{stats?.pendingJobs === 1 ? '' : 's'} needing attention</a>.
			{:else}
				Everything is up to date — no pending jobs.
			{/if}
		</p>
	</div>

	<!-- Stats: single grouped panel with dividers -->
	<div class="card stat-panel" style="margin-bottom: 20px; padding: 0; overflow: hidden;">
		<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 0;">
			<a href="/jobs?status=in_progress" class="stat-segment">
				<div class="stat-value" style="color: var(--primary);">{stats?.activeJobs ?? '—'}</div>
				<div class="stat-label">Active Jobs</div>
			</a>
			<a href="/jobs?status=pending" class="stat-segment">
				<div class="stat-value" style="color: var(--warning);">{stats?.pendingJobs ?? '—'}</div>
				<div class="stat-label">Pending</div>
			</a>
			<a href="/jobs?status=completed&date=today" class="stat-segment">
				<div class="stat-value" style="color: var(--success);">{stats?.completedToday ?? '—'}</div>
				<div class="stat-label">Completed Today</div>
			</a>
			<a href="/personnel?status=on_job" class="stat-segment">
				<div class="stat-value">{stats?.workersOnJob ?? '—'}/{stats?.totalWorkers ?? '—'}</div>
				<div class="stat-label">Workers Active</div>
			</a>
			<a href="/dispatch" class="stat-segment">
				<div class="stat-value">{stats?.completionRate ?? '—'}%</div>
				<div class="stat-label">Task Completion</div>
			</a>
		</div>
	</div>

	<!-- Quick Links -->
	<div style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
		<a href="/quotes" class="btn btn-primary">+ New Quote</a>
		<a href="/jobs" class="btn btn-primary">View All Jobs</a>
		<a href="/clients" class="btn btn-outline">Clients</a>
		<a href="/personnel" class="btn btn-outline">Personnel</a>
		<a href="/dispatch" class="btn btn-outline">📅 Dispatch</a>
		<a href="/line-items" class="btn btn-outline">🧾 Catalog</a>
	</div>

	<!-- Today's Jobs / Upcoming Jobs -->
	<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
		<div class="card">
			<h3 style="font-size: 1rem; margin-bottom: 12px;">Today's Jobs</h3>
			{#if stats?.todayJobs?.length}
				{#each stats.todayJobs as job}
					<a href="/jobs/{job.id}" class="dash-row" style="border-left: 3px solid {statusEdge(job.status)};">
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
				<div class="empty-state">
					<p class="text-secondary">Nothing scheduled today.</p>
					<div style="display: flex; gap: 8px; margin-top: 8px;">
						<a href="/jobs" class="btn btn-outline btn-sm" style="text-decoration: none;">View All Jobs</a>
						<a href="/dispatch" class="btn btn-outline btn-sm" style="text-decoration: none;">📅 Open Dispatch</a>
					</div>
				</div>
			{/if}
		</div>

		<div class="card">
			<h3 style="font-size: 1rem; margin-bottom: 12px;">Upcoming Jobs</h3>
			{#if stats?.upcomingJobs?.length}
				{#each stats.upcomingJobs as job}
					<a href="/jobs/{job.id}" class="dash-row" style="border-left: 3px solid {statusEdge(job.status)};">
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
				<div class="empty-state">
					<p class="text-secondary">No upcoming jobs.</p>
					<a href="/quotes" class="btn btn-outline btn-sm" style="text-decoration: none; margin-top: 8px;">+ Create a Quote</a>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.stat-panel { display: block; }
	.stat-segment {
		display: block;
		text-align: center;
		padding: 18px 12px;
		text-decoration: none;
		color: inherit;
		border-left: 1px solid var(--border);
		transition: background var(--transition);
	}
	.stat-segment:first-child { border-left: none; }
	.stat-segment:hover { background: var(--bg); }
	.stat-value { font-size: 1.8rem; font-weight: 700; line-height: 1.1; }
	.stat-label { color: var(--text-secondary); font-size: 0.8rem; margin-top: 2px; }

	.dash-row {
		display: block;
		text-decoration: none;
		color: inherit;
		padding: 8px 10px;
		border-bottom: 1px solid var(--border);
		border-radius: 4px;
		transition: background var(--transition);
	}
	.dash-row:hover { background: var(--bg); }
	.dash-row:last-child { border-bottom: none; }

	.empty-state { text-align: center; padding: 20px; }

	@media (max-width: 640px) {
		.stat-panel > div { grid-template-columns: repeat(2, 1fr) !important; }
		.stat-segment { border-left: none; border-top: 1px solid var(--border); }
		.stat-segment:nth-child(odd) { border-right: 1px solid var(--border); }
		.stat-segment:first-child { border-top: none; }
		.stat-segment:nth-child(2) { border-top: none; }
	}
</style>
