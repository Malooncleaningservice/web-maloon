<script lang="ts">
	import '../../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let jobId = $state('');
	let job = $state<any>(null);
	let loading = $state(true);

	let user = $state<{ id: string; workerId: string | null } | null>(null);

	onMount(async () => {
		jobId = $page.params.id;
		try {
			const meRes = await fetch('/api/auth/me');
			if (meRes.ok) user = await meRes.json();
		} catch { /* ignore */ }
		await loadJob();
	});

	async function loadJob() {
		try {
			const res = await fetch(`/api/worker/jobs/${jobId}`);
			if (res.ok) job = await res.json();
		} catch { /* ignore */ }
		loading = false;
	}

	async function toggleTask(taskId: string, completed: boolean, comment?: string) {
		const section = (job.sections || []).find((s: any) =>
			(s.tasks || []).some((t: any) => t.id === taskId)
		);
		if (!section) return;

		const task = section.tasks.find((t: any) => t.id === taskId);
		const prevCompleted = task.completed;
		const prevComment = task.comment;

		task.completed = completed;
		task.comment = comment || task.comment;

		try {
			const res = await fetch('/api/worker/tasks', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskId, completed, comment: comment || undefined })
			});
			if (!res.ok) throw new Error(await res.text());
		} catch {
			task.completed = prevCompleted;
			task.comment = prevComment;
		}
	}

	async function toggleStartWith(taskId: string, completed: boolean) {
		const task = job.startWithTasks?.find((t: any) => t.id === taskId);
		const prevCompleted = task?.completed;

		if (task) task.completed = completed;

		try {
			const res = await fetch('/api/worker/start-with', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskId, completed })
			});
			if (!res.ok) throw new Error(await res.text());
		} catch {
			if (task) task.completed = prevCompleted;
		}
	}

	function statusColor(s: string) {
		if (s === 'pending') return '#e6a817';
		if (s === 'in_progress') return '#1a73e8';
		if (s === 'completed') return '#0d904f';
		return '#5f6368';
	}
</script>

<a href="/worker" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; margin-bottom: 12px; display: inline-block;">
	← Back to Dashboard
</a>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading job...</p>
	</div>
{:else if job}
	<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
		<div>
			<h2 style="font-size: 1.3rem; margin-bottom: 4px;">{job.clientName}</h2>
			<p class="text-secondary">{job.address}</p>
		</div>
		<span class="badge" style="background: {statusColor(job.status)}20; color: {statusColor(job.status)}; font-size: 0.9rem; padding: 4px 12px;">
			{job.status.replace('_', ' ').toUpperCase()}
		</span>
	</div>

	{#if job.notes}
		<div class="card" style="background: #fef7e0; border-color: var(--warning);">
			<strong>📝 Notes:</strong> {job.notes}
		</div>
	{/if}

	{#if job.scheduledDate}
		<p class="text-secondary mb-4">📅 Scheduled: {job.scheduledDate}</p>
	{/if}

	<!-- Start-With Tasks (prep) -->
	{#if job.startWithTasks?.length}
		<div class="card" style="background: #e8f0fe;">
			<h3 style="font-size: 1rem; margin-bottom: 12px;">🔑 Before You Start</h3>
			{#each job.startWithTasks as swt}
				<div class="task-row">
					<input
						type="checkbox"
						checked={swt.completed}
						onchange={() => toggleStartWith(swt.id, !swt.completed)}
					/>
					<span class="task-desc" style="text-decoration: {swt.completed ? 'line-through' : 'none'}; opacity: {swt.completed ? 0.6 : 1};">
						{swt.description}
					</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Sections & Tasks -->
	{#if job.sections?.length}
		{#each job.sections as section}
			<details class="section-card" open>
				<summary>
					<span>{section.name}</span>
					<span class="text-secondary">
						{section.tasks?.filter((t: any) => t.completed).length || 0}/{section.tasks?.length || 0}
					</span>
				</summary>
				<div class="section-body">
					{#each section.tasks as task}
						<div class="task-row" style="flex-wrap: wrap;">
							<input
								type="checkbox"
								checked={task.completed}
								onchange={() => toggleTask(task.id, !task.completed)}
							/>
							<span class="task-desc" style="text-decoration: {task.completed ? 'line-through' : 'none'}; opacity: {task.completed ? 0.6 : 1};">
								{task.description}
								{#if task.requiredPhoto}
									<span style="color: var(--warning); font-size: 0.75rem;">📸 Photo required</span>
								{/if}
							</span>
							{#if task.comment}
								<span style="font-size: 0.75rem; color: var(--text-secondary); width: 100%; padding-left: 28px;">💬 {task.comment}</span>
							{/if}
						</div>
					{/each}
				</div>
			</details>
		{/each}
	{:else}
		<div class="card" style="text-align: center; padding: 40px;">
			<p class="text-secondary">No tasks defined for this job yet.</p>
		</div>
	{/if}
{:else}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Job not found.</p>
	</div>
{/if}