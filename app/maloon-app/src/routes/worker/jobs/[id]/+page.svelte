<script lang="ts">
	import '../../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let jobId = $state('');
	let job = $state<any>(null);
	let loading = $state(true);
	let uploadingPhotoForTask = $state<string | null>(null);
	let showingPhotoUrl = $state<string | null>(null);

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

	async function uploadTaskPhoto(taskId: string, file: File) {
		uploadingPhotoForTask = taskId;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const uploadRes = await fetch(`/api/upload?type=task-photo&taskId=${taskId}`, {
				method: 'POST',
				body: formData,
			});
			if (!uploadRes.ok) throw new Error(await uploadRes.text());
			await loadJob();
		} catch (e) {
			console.error('Photo upload failed', e);
			alert('Failed to upload photo.');
		} finally {
			uploadingPhotoForTask = null;
		}
	}

	function handlePhotoFile(taskId: string, event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) uploadTaskPhoto(taskId, file);
		input.value = '';
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

	function canComplete(task: any): boolean {
		if (!task.requiredPhoto) return true;
		return task.photos && task.photos.length > 0;
	}
</script>

{#if showingPhotoUrl}
	<div
		style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; display: flex; align-items: center; justify-content: center; cursor: pointer;"
		onclick={() => showingPhotoUrl = null}
		onkeydown={(e) => e.key === 'Escape' && (showingPhotoUrl = null)}
		role="button"
		tabindex="0"
	>
		<!-- svelte-ignore a11y_img_redundant_alt -->
		<img src={showingPhotoUrl} alt="Task photo" style="max-width: 90vw; max-height: 90vh; border-radius: 8px;" />
	</div>
{/if}

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
						<div class="task-row" style="flex-wrap: wrap; align-items: flex-start;">
							<div style="display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 200px;">
								{#if task.requiredPhoto && !canComplete(task)}
									<input
										type="checkbox"
										checked={task.completed}
										disabled
										title="Photo required to complete this task"
									/>
								{:else}
									<input
										type="checkbox"
										checked={task.completed}
										onchange={() => toggleTask(task.id, !task.completed)}
									/>
								{/if}
								<div>
									<span class="task-desc" style="text-decoration: {task.completed ? 'line-through' : 'none'}; opacity: {task.completed ? 0.6 : 1};">
										{task.description}
									</span>
									<div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
										{#if task.requiredPhoto}
											<span style="color: var(--danger); font-size: 0.7rem;">📸 (required)</span>
										{:else}
											<span style="color: var(--text-secondary); font-size: 0.7rem;">📸 (optional)</span>
										{/if}
										{#if task.requiredPhoto && !canComplete(task)}
											<span style="color: var(--danger); font-size: 0.7rem;">— upload a photo to complete</span>
										{/if}
									</div>
								</div>
							</div>
							<div style="display: flex; align-items: center; gap: 6px;">
								<label class="btn btn-outline btn-sm" style="cursor: pointer; font-size: 0.7rem; padding: 3px 7px; display: inline-flex; align-items: center; gap: 3px; white-space: nowrap;">
									📸 {uploadingPhotoForTask === task.id ? 'Uploading...' : 'Add Photo'}
									<input type="file" accept="image/*" capture="environment" style="display: none;" onchange={(e) => handlePhotoFile(task.id, e)} disabled={uploadingPhotoForTask === task.id} />
								</label>
								{#if task.photos && task.photos.length > 0}
									<span style="color: var(--success); font-size: 0.75rem; white-space: nowrap;">{task.photos.length} photo{task.photos.length !== 1 ? 's' : ''}</span>
									{#each task.photos as photo}
										<button
											class="btn btn-sm"
											style="padding: 2px 6px; font-size: 0.65rem; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 4px; cursor: pointer; white-space: nowrap;"
											onclick={() => showingPhotoUrl = photo.url}
										>
											🖼 View
										</button>
									{/each}
								{/if}
							</div>
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