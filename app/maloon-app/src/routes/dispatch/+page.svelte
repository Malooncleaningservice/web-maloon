<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { confirmAction } from '$lib/stores/confirm.svelte';

	type Worker = { id: string; firstName: string; lastName: string; assignments: any[]; availability: any[] };
	type Job = { id: string; clientName: string; address: string; status: string; total: number; notes: string | null; scheduledDate: string | null; assignments: any[] };
	type Summary = { totalJobs: number; pendingCount: number; inProgressCount: number; completedCount: number; assignedCount: number; unassignedCount: number; estimatedRevenue: number };
	type Day = { date: string; label: string; jobs: Job[] };

	let view = $state<'day' | 'week'>('day');
	let selectedDate = $state(new Date().toISOString().slice(0, 10));
	let weekStart = $state(getMonday(new Date()));
	let jobs = $state<Job[]>([]);
	let workers = $state<Worker[]>([]);
	let summary = $state<Summary | null>(null);
	let days = $state<Day[] | null>(null);
	let allActiveWorkers = $state<Array<{id: string; firstName: string; lastName: string}>>([]);
	let loading = $state(true);
	let error = $state('');
	let statusFilter = $state('all');
	let assignWorker = $state<Record<string, string>>({});
	let assignTime = $state<Record<string, string>>({});
	let assigning = $state<Record<string, boolean>>({});
	let removing = $state<Record<string, boolean>>({});
	let statusChanging = $state<Record<string, boolean>>({});

	function getMonday(d: Date) {
		const m = new Date(d);
		m.setDate(m.getDate() - m.getDay() + 1);
		return m.toISOString().slice(0, 10);
	}

	onMount(async () => {
		await Promise.all([loadWorkers(), loadDispatch()]);
	});

	async function loadWorkers() {
		try {
			const res = await fetch('/api/workers');
			const data = await res.json();
			allActiveWorkers = data.filter((w: any) => w.status === 'active');
		} catch { /* ignore */ }
	}

	async function loadDispatch() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (view === 'week') {
				params.set('weekStart', weekStart);
			} else {
				params.set('date', selectedDate);
			}
			if (statusFilter !== 'all') params.set('status', statusFilter);

			const res = await fetch(`/api/dispatch?${params}`);
			if (res.ok) {
				const data = await res.json();
				jobs = data.jobs;
				workers = data.workers;
				summary = data.summary;
				days = data.days ?? null;
			} else {
				error = 'Failed to load dispatch data';
			}
		} catch {
			error = 'Could not connect to server';
		} finally {
			loading = false;
		}
	}

	function changeDate(daysOffset: number) {
		const d = new Date(selectedDate + 'T00:00:00');
		d.setDate(d.getDate() + daysOffset);
		selectedDate = d.toISOString().slice(0, 10);
		loadDispatch();
	}

	function changeWeek(weeksOffset: number) {
		const d = new Date(weekStart + 'T00:00:00');
		d.setDate(d.getDate() + weeksOffset * 7);
		weekStart = d.toISOString().slice(0, 10);
		loadDispatch();
	}

	function switchView(v: 'day' | 'week') {
		view = v;
		loadDispatch();
	}

	function onFilterChange() {
		loadDispatch();
	}

	function statusBadgeClass(status: string) {
		const m: Record<string, string> = {
			pending: 'badge-pending', in_progress: 'badge-active',
			completed: 'badge-complete', cancelled: 'badge-danger',
		};
		return m[status] || '';
	}

	function formatTime(d: string | null) {
		if (!d) return '';
		return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function formatDateLabel(dateStr: string) {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
		});
	}

	function formatCurrency(n: number) {
		return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}

	function unassignedForJob(job: Job) {
		const assignedIds = new Set(job.assignments?.map((a: any) => a.worker?.id) ?? []);
		return allActiveWorkers.filter(w => !assignedIds.has(w.id));
	}

	async function assignWorkerToJob(jobId: string) {
		const workerId = assignWorker[jobId];
		if (!workerId) return;

		assigning[jobId] = true;
		const worker = allActiveWorkers.find(w => w.id === workerId);

		const optimisticAssignment = {
			id: 'opt-' + Date.now(),
			workerId,
			worker: { id: workerId, firstName: worker?.firstName ?? '', lastName: worker?.lastName ?? '' },
			scheduledDate: assignTime[jobId] || null,
		};

		const prevJobs = [...jobs];
		jobs = jobs.map(j => j.id === jobId ? { ...j, assignments: [...(j.assignments || []), optimisticAssignment] } : j);

		try {
			const body: any = { workerId };
			if (assignTime[jobId]) body.scheduledDate = new Date(assignTime[jobId]).toISOString();

			const res = await fetch(`/api/jobs/${jobId}/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (res.status === 409) {
				const data = await res.json();
				toast.error(data.error || 'Assignment conflict');
				jobs = prevJobs;
				return;
			}
			if (!res.ok) throw new Error('Failed');
			assignWorker[jobId] = '';
			assignTime[jobId] = '';
			await loadDispatch();
		} catch (e) {
			console.error(e);
			jobs = prevJobs;
		} finally {
			assigning[jobId] = false;
		}
	}

	async function removeAssignment(jobId: string, assignmentId: string) {
		removing[assignmentId] = true;
		const prevJobs = [...jobs];
		jobs = jobs.map(j => j.id === jobId ? {
			...j, assignments: (j.assignments || []).filter(a => a.id !== assignmentId)
		} : j);

		try {
			const res = await fetch(`/api/jobs/${jobId}/assign`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assignmentId }),
			});
			if (!res.ok) throw new Error('Failed');
			await loadDispatch();
		} catch (e) {
			console.error(e);
			jobs = prevJobs;
		} finally {
			removing[assignmentId] = false;
		}
	}

	async function changeJobStatus(jobId: string, newStatus: string) {
		if (newStatus === 'cancelled') {
			const ok = await confirmAction({
				title: 'Cancel this job?',
				description: 'The assigned worker(s) will no longer see this job on their schedule.',
				confirmText: 'Cancel Job',
				danger: true
			});
			if (!ok) return;
		}
		if (newStatus === 'completed') {
			const ok = await confirmAction({
				title: 'Mark this job as completed?',
				confirmText: 'Mark Completed'
			});
			if (!ok) return;
		}

		statusChanging[jobId] = true;
		const prevJobs = [...jobs];
		jobs = jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j);

		try {
			const res = await fetch(`/api/jobs/${jobId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});
			if (res.status === 400) {
				const data = await res.json();
				toast.error(data.error || 'Cannot change status');
				jobs = prevJobs;
				return;
			}
			if (!res.ok) throw new Error('Failed');
			await loadDispatch();
		} catch (e) {
			console.error(e);
			jobs = prevJobs;
		} finally {
			statusChanging[jobId] = false;
		}
	}

	function workerAvailabilityForDay(w: Worker) {
		return w.availability.map(a => `${a.startTime}–${a.endTime}`).join(', ') || 'No availability set';
	}
</script>

<!-- ── Header ─────────────────────────────────────────────────────────────── -->
<div class="dispatch-header">
	<h2 style="font-size: 1.3rem;">Dispatch</h2>
	<div class="dispatch-controls">
		<div class="view-toggle">
			<button class="view-toggle-btn" class:active={view === 'day'} onclick={() => switchView('day')}>Day</button>
			<button class="view-toggle-btn" class:active={view === 'week'} onclick={() => switchView('week')}>Week</button>
		</div>

		{#if view === 'day'}
			<button class="btn btn-outline btn-sm" onclick={() => changeDate(-1)}>← Prev</button>
			<input type="date" bind:value={selectedDate} onchange={loadDispatch} style="max-width: 160px;" />
			<button class="btn btn-outline btn-sm" onclick={() => changeDate(1)}>Next →</button>
		{:else}
			<button class="btn btn-outline btn-sm" onclick={() => changeWeek(-1)}>← Prev Week</button>
			<input type="date" bind:value={weekStart} onchange={loadDispatch} style="max-width: 160px;" />
			<button class="btn btn-outline btn-sm" onclick={() => changeWeek(1)}>Next Week →</button>
		{/if}
		<button class="btn btn-outline btn-sm" onclick={() => { selectedDate = new Date().toISOString().slice(0, 10); weekStart = getMonday(new Date()); loadDispatch(); }}>Today</button>

		<select bind:value={statusFilter} onchange={onFilterChange} style="max-width: 140px;">
			<option value="all">All Status</option>
			<option value="pending">Pending</option>
			<option value="in_progress">In Progress</option>
			<option value="completed">Completed</option>
			<option value="unassigned">Unassigned</option>
		</select>
	</div>
</div>

<!-- ── Status Filter (unassigned) ─────────────────────────────────────────── -->
{#if statusFilter === 'unassigned'}
	{#key statusFilter}{/key}
{/if}

{#if view === 'day'}
	<h3 class="text-secondary" style="font-size: 1rem; margin-bottom: 12px;">
		{formatDateLabel(selectedDate)}
	</h3>
{/if}

<!-- ── Summary Bar ────────────────────────────────────────────────────────── -->
{#if summary}
	<div class="summary-bar">
		<div class="card summary-card">
			<div class="summary-value">{summary.totalJobs}</div>
			<div class="text-secondary summary-label">Total</div>
		</div>
		<div class="card summary-card">
			<div class="summary-value" style="color: var(--warning);">{summary.pendingCount}</div>
			<div class="text-secondary summary-label">Pending</div>
		</div>
		<div class="card summary-card">
			<div class="summary-value" style="color: var(--primary);">{summary.inProgressCount}</div>
			<div class="text-secondary summary-label">Active</div>
		</div>
		<div class="card summary-card">
			<div class="summary-value" style="color: var(--success);">{summary.completedCount}</div>
			<div class="text-secondary summary-label">Done</div>
		</div>
		<div class="card summary-card">
			<div class="summary-value" style="color: var(--primary);">{summary.unassignedCount}</div>
			<div class="text-secondary summary-label">Unassigned</div>
		</div>
		<div class="card summary-card">
			<div class="summary-value" style="color: var(--success);">{formatCurrency(summary.estimatedRevenue)}</div>
			<div class="text-secondary summary-label">Revenue</div>
		</div>
	</div>
{/if}

<!-- ── Error ──────────────────────────────────────────────────────────────── -->
{#if error}
	<div class="card" style="border-left: 3px solid var(--danger); margin-bottom: 16px;">
		<p style="color: var(--danger); font-weight: 600;">{error}</p>
		<button class="btn btn-outline btn-sm" style="margin-top: 4px;" onclick={loadDispatch}>Retry</button>
	</div>
{/if}

<!-- ── Loading ────────────────────────────────────────────────────────────── -->
{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading...</p>
	</div>
{:else if view === 'week' && days}
	<!-- ── Week View ────────────────────────────────────────────────────────── -->
	<div class="week-grid">
		{#each days as day}
			<div class="card week-day-card">
				<div class="week-day-header">
					{day.label}
				</div>
				{#if day.jobs.length === 0}
					<p class="text-secondary" style="font-size: 0.7rem; text-align: center; padding-top: 12px;">—</p>
				{:else}
					{#each day.jobs as job}
						<a
							href="/jobs/{job.id}"
							class="week-job-link"
							style="border-left-color: {job.status === 'completed' ? 'var(--success)' : job.status === 'in_progress' ? 'var(--primary)' : 'var(--warning)'};"
						>
							<div style="font-weight: 600;">{formatTime(job.scheduledDate)} {job.clientName}</div>
							<div style="font-size: 0.65rem; color: var(--text-secondary);">
								{#if job.assignments?.length}
									{job.assignments.map((a: any) => `${a.worker?.firstName} ${a.worker?.lastName?.[0] || ''}`).join(', ')}
								{:else}
									<span style="color: var(--danger);">unassigned</span>
								{/if}
							</div>
						</a>
					{/each}
				{/if}
			</div>
		{/each}
	</div>

	<!-- ── Worker Panel (week view) ──────────────────────────────────────────── -->
	<div style="margin-top: 16px;">
		<h3 style="font-size: 1rem; margin-bottom: 8px;">Worker Assignments This Week</h3>
		<div class="worker-panel-grid">
			{#each workers as w}
				<div class="card" style="padding: 10px;">
					<div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 4px;">{w.firstName} {w.lastName}</div>
					{#if w.assignments.length === 0}
						<p class="text-secondary" style="font-size: 0.7rem;">No jobs this week</p>
					{:else}
						{#each w.assignments.sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()) as a}
							<div style="font-size: 0.72rem; padding: 2px 0; display: flex; justify-content: space-between;">
								<span>{formatTime(a.scheduledDate)}</span>
								<span>{a.clientName}</span>
							</div>
						{/each}
					{/if}
				</div>
			{/each}
		</div>
	</div>
{:else if view === 'day' && jobs.length === 0}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary mb-4">No jobs scheduled for this day.</p>
		<a href="/jobs" class="btn btn-primary">+ Create a Job</a>
	</div>
{:else if view === 'day'}
	<!-- ── Day View Layout ──────────────────────────────────────────────────── -->
	<div class="day-layout">
		<!-- Job list -->
		<div style="flex: 1; min-width: 0;">
			{#each jobs as job}
				<div class="card" style="margin-bottom: 10px; padding: 12px;">
					<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
						<div style="flex: 1; min-width: 200px;">
							<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
								{#if job.scheduledDate}
									<span class="job-time-chip">{formatTime(job.scheduledDate)}</span>
								{/if}
								<a href="/jobs/{job.id}" style="font-weight: 600; font-size: 1rem; color: var(--primary); text-decoration: none;">
									{job.clientName}
								</a>
								<span class="badge {statusBadgeClass(job.status)}">{job.status.replace('_', ' ')}</span>
								<span style="font-weight: 600; font-size: 0.85rem; color: var(--success);">{formatCurrency(job.total)}</span>
							</div>
							<p class="text-secondary" style="font-size: 0.85rem;">{job.address}</p>
							{#if job.notes}
								<p class="text-secondary" style="font-size: 0.8rem; font-style: italic;">{job.notes}</p>
							{/if}
						</div>

						<div class="job-actions-panel">
							<!-- Assigned Workers -->
							<div style="margin-bottom: 8px;">
								{#if job.assignments?.length}
									{#each job.assignments as a}
										<div style="display: flex; align-items: center; gap: 6px; padding: 2px 0;">
											<span style="font-size: 0.82rem;">
												👷 {a.worker?.firstName} {a.worker?.lastName}
												{#if a.scheduledDate}<span class="text-secondary"> ({formatTime(a.scheduledDate)})</span>{/if}
											</span>
											<button class="btn btn-danger btn-sm" style="padding: 1px 5px; font-size: 0.65rem;"
												onclick={() => removeAssignment(job.id, a.id)}
												disabled={removing[a.id]}>✕</button>
										</div>
									{/each}
								{:else}
									<span class="text-secondary" style="font-size: 0.82rem;">No workers assigned</span>
								{/if}
							</div>

							<!-- Quick Assign -->
							{#if unassignedForJob(job).length > 0}
								<div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
									<select
										bind:value={assignWorker[job.id]}
										style="font-size: 0.78rem; padding: 3px 6px; min-width: 120px;"
									>
										<option value="">+ Assign...</option>
										{#each unassignedForJob(job) as w}
											<option value={w.id}>{w.firstName} {w.lastName}</option>
										{/each}
									</select>
									<input type="time" bind:value={assignTime[job.id]} style="font-size: 0.75rem; padding: 3px 6px; width: 100px;" placeholder="Time" />
									<button
										class="btn btn-primary btn-sm"
										style="font-size: 0.72rem; padding: 3px 8px;"
										onclick={() => assignWorkerToJob(job.id)}
										disabled={assigning[job.id] || !assignWorker[job.id]}
									>
										{assigning[job.id] ? '...' : 'Go'}
									</button>
								</div>
							{/if}

							<!-- Quick Status Actions -->
							<div style="margin-top: 8px; display: flex; gap: 4px;">
								{#if job.status === 'pending'}
									<button class="btn btn-primary btn-sm" style="font-size: 0.7rem; padding: 3px 8px;"
										onclick={() => changeJobStatus(job.id, 'in_progress')}
										disabled={statusChanging[job.id]}>▶ Start</button>
									<button class="btn btn-danger btn-sm" style="font-size: 0.7rem; padding: 3px 8px;"
										onclick={() => changeJobStatus(job.id, 'cancelled')}
										disabled={statusChanging[job.id]}>✕ Cancel</button>
								{:else if job.status === 'in_progress'}
									<button class="btn btn-success btn-sm" style="font-size: 0.7rem; padding: 3px 8px;"
										onclick={() => changeJobStatus(job.id, 'completed')}
										disabled={statusChanging[job.id]}>✓ Complete</button>
									<button class="btn btn-danger btn-sm" style="font-size: 0.7rem; padding: 3px 8px;"
										onclick={() => changeJobStatus(job.id, 'cancelled')}
										disabled={statusChanging[job.id]}>✕ Cancel</button>
								{:else if job.status === 'cancelled'}
									<button class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 3px 8px;"
										onclick={() => changeJobStatus(job.id, 'pending')}
										disabled={statusChanging[job.id]}>↩ Reopen</button>
								{/if}
								{#if statusChanging[job.id]}
									<span style="font-size: 0.7rem;">updating...</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Worker Panel Sidebar -->
		<div class="worker-sidebar">
			<div class="card" style="padding: 12px;">
				<h3 style="font-size: 0.9rem; margin-bottom: 8px; font-weight: 600;">Workers</h3>
				{#each workers as w}
					<div class="worker-sidebar-item">
						<div style="font-weight: 600; font-size: 0.8rem; display: flex; justify-content: space-between;">
							<span>{w.firstName} {w.lastName}</span>
							<span style="font-size: 0.65rem; color: var(--text-secondary);">{w.assignments.length} job(s)</span>
						</div>
						<div class="text-secondary" style="font-size: 0.65rem; margin-bottom: 4px;">
							{workerAvailabilityForDay(w)}
						</div>
						{#if w.assignments.length === 0}
							<p style="font-size: 0.68rem; color: var(--text-secondary); margin: 0; font-style: italic;">Available all day</p>
						{:else}
							{#each w.assignments.sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()) as a}
								<div style="font-size: 0.68rem; padding: 2px 0; display: flex; justify-content: space-between;">
									<span>{formatTime(a.scheduledDate)}</span>
									<span style="color: var(--primary);">{a.clientName}</span>
								</div>
							{/each}
						{/if}
					</div>
				{/each}
				{#if workers.length === 0}
					<p class="text-secondary" style="font-size: 0.75rem;">No active workers</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.dispatch-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		flex-wrap: wrap;
		gap: 8px;
	}
	.dispatch-controls {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}
	.view-toggle {
		display: flex;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid var(--border);
	}
	.view-toggle-btn {
		padding: 6px 12px;
		border: none;
		background: transparent;
		color: var(--text);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition), color var(--transition);
	}
	.view-toggle-btn.active { background: var(--primary); color: #fff; }
	.view-toggle-btn:not(.active):hover { background: var(--bg); }

	.summary-bar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 8px;
		margin-bottom: 16px;
	}
	.summary-card { text-align: center; padding: 10px; }
	.summary-value { font-size: 1.4rem; font-weight: 700; }
	.summary-label { font-size: 0.7rem; }

	.job-time-chip {
		font-weight: 700;
		font-size: 0.85rem;
		background: var(--bg);
		padding: 2px 8px;
		border-radius: 4px;
	}

	/* Day view: job list + sticky worker sidebar */
	.day-layout { display: flex; gap: 16px; align-items: flex-start; }
	.job-actions-panel { min-width: 280px; }
	.worker-sidebar { width: 280px; flex-shrink: 0; position: sticky; top: 80px; }
	.worker-sidebar-item { padding: 8px 0; border-bottom: 1px solid var(--border); }
	.worker-sidebar-item:last-child { border-bottom: none; }

	/* Week view */
	.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
	.week-day-card { padding: 8px; min-height: 200px; }
	.week-day-header {
		font-weight: 600;
		font-size: 0.8rem;
		margin-bottom: 6px;
		text-align: center;
		padding-bottom: 4px;
		border-bottom: 2px solid var(--border);
	}
	.week-job-link {
		display: block;
		font-size: 0.72rem;
		padding: 3px 4px;
		margin-bottom: 3px;
		border-radius: 4px;
		background: var(--bg);
		text-decoration: none;
		color: inherit;
		border-left: 3px solid;
	}
	.worker-panel-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 8px;
	}

	/* Mobile: stack sidebar below job list, scroll week grid horizontally */
	@media (max-width: 860px) {
		.day-layout { flex-direction: column; }
		.worker-sidebar { width: 100%; position: static; }
		.job-actions-panel { min-width: 0; width: 100%; }
	}
	@media (max-width: 700px) {
		.week-grid {
			grid-template-columns: unset;
			grid-auto-flow: column;
			grid-auto-columns: minmax(150px, 1fr);
			overflow-x: auto;
			padding-bottom: 4px;
		}
	}
</style>
