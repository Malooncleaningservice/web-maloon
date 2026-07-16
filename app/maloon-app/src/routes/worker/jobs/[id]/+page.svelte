<script lang="ts">
	import '../../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let jobId = $state('');
	let job = $state<any>(null);
	let loading = $state(true);
	let uploadingPhotoForTask = $state<string | null>(null);
	let showingPhotoUrl = $state<string | null>(null);
	let updatingStatus = $state(false);
	let statusError = $state('');
	let openSections = $state<Record<string, boolean>>({});

	let user = $state<{ id: string; workerId: string | null } | null>(null);

	onMount(async () => {
		jobId = $page.params.id ?? '';
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
		if (job && Object.keys(openSections).length === 0) {
			let firstIncompleteFound = false;
			for (const s of job.sections || []) {
				const done = sectionDone(s);
				if (!done && !firstIncompleteFound) {
					openSections[s.id] = true;
					firstIncompleteFound = true;
				} else {
					openSections[s.id] = !done;
				}
			}
		}
		loading = false;
	}

	function sectionDone(section: any): boolean {
		return (section.tasks || []).length > 0 && section.tasks.every((t: any) => t.completed);
	}

	function progress(): { total: number; done: number } {
		let total = 0, done = 0;
		for (const s of job?.sections || []) {
			for (const t of s.tasks || []) {
				total++;
				if (t.completed) done++;
			}
		}
		for (const t of job?.startWithTasks || []) {
			total++;
			if (t.completed) done++;
		}
		return { total, done };
	}

	function missingPhotoCount(): number {
		let n = 0;
		for (const s of job?.sections || []) {
			for (const t of s.tasks || []) {
				if (t.requiredPhoto && (!t.photos || t.photos.length === 0)) n++;
			}
		}
		return n;
	}

	function canFinish(): boolean {
		const p = progress();
		return p.total > 0 && p.done === p.total && missingPhotoCount() === 0;
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
			if (completed && sectionDone(section)) {
				openSections[section.id] = false;
				const next = (job.sections || []).find((s: any) => !sectionDone(s));
				if (next) openSections[next.id] = true;
			}
		} catch {
			task.completed = prevCompleted;
			task.comment = prevComment;
		}
	}

	async function uploadTaskPhoto(taskId: string, file: File) {
		uploadingPhotoForTask = taskId;
		const task = (job.sections || []).flatMap((s: any) => s.tasks || []).find((t: any) => t.id === taskId);
		const shouldAutoComplete = task && task.requiredPhoto && !task.completed;
		try {
			const formData = new FormData();
			formData.append('file', file);
			const uploadRes = await fetch(`/api/upload?type=task-photo&taskId=${taskId}`, {
				method: 'POST',
				body: formData,
			});
			if (!uploadRes.ok) throw new Error(await uploadRes.text());
			await loadJob();
			if (shouldAutoComplete) {
				await toggleTask(taskId, true);
			}
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

	function openCamera(taskId: string) {
		const input = document.getElementById(`photo-input-${taskId}`) as HTMLInputElement | null;
		input?.click();
	}

	function handleTaskTap(task: any) {
		if (uploadingPhotoForTask) return;
		if (!task.completed && task.requiredPhoto && (!task.photos || task.photos.length === 0)) {
			openCamera(task.id);
			return;
		}
		toggleTask(task.id, !task.completed);
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

	async function updateStatus(status: 'in_progress' | 'completed') {
		updatingStatus = true;
		statusError = '';
		try {
			const res = await fetch(`/api/worker/jobs/${jobId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});
			if (res.ok) {
				job = { ...job, status };
			} else {
				const data = await res.json().catch(() => ({}));
				statusError = data.error || 'Failed to update job status.';
			}
		} catch {
			statusError = 'Network error.';
		} finally {
			updatingStatus = false;
		}
	}

	function statusColor(s: string) {
		if (s === 'pending') return '#e6a817';
		if (s === 'in_progress') return '#1a73e8';
		if (s === 'completed') return '#0d904f';
		return '#5f6368';
	}

	function mapsUrl(address: string): string {
		return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
	}

	function blockingSummary(): string {
		const p = progress();
		const remaining = p.total - p.done;
		const photos = missingPhotoCount();
		const parts: string[] = [];
		if (remaining > 0) parts.push(`${remaining} task${remaining !== 1 ? 's' : ''} left`);
		if (photos > 0) parts.push(`${photos} required photo${photos !== 1 ? 's' : ''} missing`);
		return parts.join(' · ');
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

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading job...</p>
	</div>
{:else if job}
	{@const p = progress()}
	<div class="job-sticky-header">
		<div style="display: flex; align-items: center; gap: 10px;">
			<a href="/worker" aria-label="Back to jobs" style="color: var(--primary); text-decoration: none; font-size: 1.3rem; line-height: 1; padding: 4px 8px 4px 0;">←</a>
			<div style="flex: 1; min-width: 0;">
				<h2 style="font-size: 1.05rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{job.clientName}</h2>
			</div>
			<span class="badge" style="background: {statusColor(job.status)}20; color: {statusColor(job.status)};">
				{job.status.replace('_', ' ').toUpperCase()}
			</span>
		</div>
		{#if p.total > 0}
			<div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
				<div class="progress-track" style="flex: 1;">
					<div class="progress-fill" style="width: {p.done / p.total * 100}%"></div>
				</div>
				<span style="font-size: 0.75rem; font-weight: 600; white-space: nowrap;">{p.done}/{p.total}</span>
			</div>
		{/if}
	</div>

	<div style="margin-bottom: 16px;">
		<a href={mapsUrl(job.address)} target="_blank" rel="noopener" class="address-link">📍 {job.address}</a>
		{#if job.scheduledDate}
			<p class="text-secondary" style="margin-top: 2px;">📅 {new Date(job.scheduledDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
		{/if}
	</div>

	{#if job.notes}
		<div class="card" style="background: #fef7e0; border-color: var(--warning);">
			<strong>📝 Notes:</strong> {job.notes}
		</div>
	{/if}

	{#if statusError}
		<div style="background: #fce8e6; color: var(--danger); padding: 10px 14px; border-radius: var(--radius); margin-bottom: 12px; font-size: 0.85rem;">
			{statusError}
		</div>
	{/if}

	{#if job.status === 'pending'}
		<button class="btn btn-primary btn-block" style="margin-bottom: 16px;" onclick={() => updateStatus('in_progress')} disabled={updatingStatus}>
			{updatingStatus ? 'Starting...' : '▶ Start Job'}
		</button>
	{/if}

	<!-- Start-With Tasks (prep) -->
	{#if job.startWithTasks?.length}
		<div class="card" style="background: #e8f0fe;">
			<h3 style="font-size: 1rem; margin-bottom: 4px;">🔑 Before You Start</h3>
			{#each job.startWithTasks as swt}
				<button class="wtask-row" onclick={() => toggleStartWith(swt.id, !swt.completed)}>
					<span class="wcheck" class:done={swt.completed}>{swt.completed ? '✓' : ''}</span>
					<span class="wtask-desc" class:done={swt.completed}>{swt.description}</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Sections & Tasks -->
	{#if job.sections?.length}
		{#each job.sections as section}
			<details class="section-card" open={openSections[section.id]} ontoggle={(e) => openSections[section.id] = (e.target as HTMLDetailsElement).open}>
				<summary>
					<span>
						{#if sectionDone(section)}<span class="section-check">✓ </span>{/if}
						{section.name}
					</span>
					<span class="text-secondary">
						{section.tasks?.filter((t: any) => t.completed).length || 0}/{section.tasks?.length || 0}
					</span>
				</summary>
				<div class="section-body">
					{#each section.tasks as task}
						{@const needsPhoto = task.requiredPhoto && (!task.photos || task.photos.length === 0)}
						<button class="wtask-row" onclick={() => handleTaskTap(task)} disabled={uploadingPhotoForTask === task.id}>
							<span class="wcheck" class:done={task.completed} class:camera={!task.completed && needsPhoto}>
								{task.completed ? '✓' : !task.completed && needsPhoto ? '📸' : ''}
							</span>
							<span style="flex: 1;">
								<span class="wtask-desc" class:done={task.completed} style="display: block;">{task.description}</span>
								{#if uploadingPhotoForTask === task.id}
									<span class="wtask-meta">Uploading photo...</span>
								{:else if needsPhoto}
									<span class="wtask-meta required">📸 Photo required — tap to take one</span>
								{:else if task.requiredPhoto}
									<span class="wtask-meta">📸 Photo added</span>
								{/if}
								{#if task.comment}
									<span class="wtask-meta" style="display: block;">💬 {task.comment}</span>
								{/if}
							</span>
						</button>
						<input id="photo-input-{task.id}" type="file" accept="image/*" capture="environment" style="display: none;" onchange={(e) => handlePhotoFile(task.id, e)} disabled={uploadingPhotoForTask === task.id} />
						<div class="photo-thumbs">
							{#each task.photos || [] as photo}
								<button style="padding: 0; border: none; background: none; cursor: pointer;" onclick={() => showingPhotoUrl = photo.url} aria-label="View task photo">
									<!-- svelte-ignore a11y_img_redundant_alt -->
									<img src={photo.url} alt="Task photo" />
								</button>
							{/each}
							<button class="add-photo-btn" onclick={() => openCamera(task.id)} disabled={uploadingPhotoForTask === task.id}>
								<span class="icon">📸</span>
								<span>{uploadingPhotoForTask === task.id ? '...' : (task.photos?.length ? 'Add' : 'Photo')}</span>
							</button>
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

	{#if job.status === 'in_progress'}
		<div style="margin-top: 20px;">
			{#if !canFinish()}
				<p class="text-secondary" style="text-align: center; margin-bottom: 8px;">{blockingSummary()}</p>
			{/if}
			<button class="btn btn-success btn-block" onclick={() => updateStatus('completed')} disabled={updatingStatus || !canFinish()}>
				{updatingStatus ? 'Finishing...' : '✓ Finish Job'}
			</button>
		</div>
	{:else if job.status === 'completed'}
		<div class="card" style="text-align: center; background: #e6f4ea; margin-top: 20px;">
			<strong style="color: var(--success);">✓ Job completed — nice work!</strong>
		</div>
	{/if}
{:else}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Job not found.</p>
	</div>
{/if}
