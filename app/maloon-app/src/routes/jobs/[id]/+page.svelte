<script lang="ts">
	import '../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	let jobId = $state('');
	let job = $state<{id?: string; quoteId?: string; clientName?: string; address?: string; status?: string; scheduledDate?: string | null; total?: number}>({});
	let sections = $state<Array<{id: string; name: string; sortOrder: number; expanded: boolean; tasks: Array<{id: string; description: string; sortOrder: number; completed: boolean; requiredPhoto: boolean; photos?: Array<{id: string; url: string; takenAt: string}>}>}>>([]);
	let startWithTasks = $state<Array<{id: string; description: string; completed: boolean}>>([]);
	let loading = $state(true);
	let converting = $state(false);
	let uploadingPhotoForTask = $state<string | null>(null);
	let showingPhotoUrl = $state<string | null>(null);

	let newSectionName = $state('');
	let newTaskDesc = $state('');
	let addingTaskToSection = $state<string | null>(null);

	onMount(async () => {
		jobId = $page.params.id;
		await loadJob();
	});

	async function loadJob() {
		loading = true;
		try {
			const res = await fetch(`/api/jobs/${jobId}`);
			const data = await res.json();
			job = data;
			sections = (data.sections ?? []).map((s: any) => ({
				...s,
				expanded: false,
				tasks: (s.tasks ?? []).map((t: any) => ({ ...t, completed: t.completed ?? false, photos: t.photos ?? [] })),
			}));
			startWithTasks = (data.startWithTasks ?? []).map((sw: any) => ({ ...sw, completed: sw.completed ?? false }));
		} catch (e) {
			console.error('Failed to load job', e);
		} finally {
			loading = false;
		}
	}

	async function addSection() {
		if (!newSectionName.trim()) return;
		try {
			const res = await fetch(`/api/jobs/${jobId}/sections`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newSectionName }),
			});
			const sec = await res.json();
			sections = [...sections, { ...sec, expanded: true, tasks: [] }];
			newSectionName = '';
		} catch (e) { console.error(e); }
	}

	async function addTask(sectionId: string) {
		if (!newTaskDesc.trim()) return;
		try {
			const res = await fetch(`/api/sections/${sectionId}/tasks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description: newTaskDesc, requiredPhoto: false }),
			});
			const task = await res.json();
			sections = sections.map(s => {
				if (s.id === sectionId) return { ...s, tasks: [...s.tasks, { ...task, completed: false, photos: [] }] };
				return s;
			});
			newTaskDesc = '';
			addingTaskToSection = null;
		} catch (e) { console.error(e); }
	}

	async function toggleTask(sectionId: string, taskId: string, completed: boolean) {
		sections = sections.map(s => {
			if (s.id === sectionId) return { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, completed } : t) };
			return s;
		});
		try {
			await fetch(`/api/sections/${sectionId}/tasks`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskId, completed }),
			});
		} catch (e) { console.error(e); }
	}

	async function addStartWithTask() {
		if (!newTaskDesc.trim()) return;
		try {
			const res = await fetch(`/api/jobs/${jobId}/start-with`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ description: newTaskDesc }),
			});
			const task = await res.json();
			startWithTasks = [...startWithTasks, { ...task, completed: false }];
			newTaskDesc = '';
		} catch (e) { console.error(e); }
	}

	async function toggleStartWith(taskId: string, completed: boolean) {
		startWithTasks = startWithTasks.map(t => t.id === taskId ? { ...t, completed } : t);
		try {
			await fetch(`/api/jobs/${jobId}/start-with`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskId, completed }),
			});
		} catch (e) { console.error(e); }
	}

	async function convertQuoteToJob() {
		if (!job.quoteId) return;
		converting = true;
		try {
			const res = await fetch(`/api/quotes/${job.quoteId}/convert`, { method: 'POST' });
			if (!res.ok) throw new Error(await res.text());
			alert('Job created from quote!');
			await loadJob();
		} catch (e) {
			console.error('Conversion failed', e);
			alert('Failed to convert quote to job.');
		} finally {
			converting = false;
		}
	}

	async function uploadTaskPhoto(sectionId: string, taskId: string, file: File) {
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

	function handlePhotoFile(sectionId: string, taskId: string, event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			uploadTaskPhoto(sectionId, taskId, file);
		}
		// Reset input so same file can be re-uploaded
		input.value = '';
	}

	function completedCount(section: { tasks: Array<{completed: boolean}> }) {
		return section.tasks.filter((t) => t.completed).length;
	}
</script>

<a href="/jobs" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; margin-bottom: 12px; display: inline-block;">
	← Back to Jobs
</a>

{#if showingPhotoUrl}
	<div
		style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; display: flex; align-items: center; justify-content: center; cursor: pointer;"
		onclick={() => showingPhotoUrl = null}
		onkeydown={(e) => e.key === 'Escape' && (showingPhotoUrl = null)}
		role="button"
		tabindex="0"
	>
		<img src={showingPhotoUrl} alt="Task photo" style="max-width: 90vw; max-height: 90vh; border-radius: 8px;" />
	</div>
{/if}

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading job...</p>
	</div>
{:else}
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
		<h2 style="font-size: 1.3rem;">{job.clientName ?? 'Job'} — {job.address ?? 'No address'}</h2>
		<div style="display: flex; align-items: center; gap: 8px;">
			{#if job.quoteId && job.status === 'quote'}
				<span class="badge badge-quote">FROM QUOTE</span>
				<button class="btn btn-success" onclick={convertQuoteToJob} disabled={converting}>
					{converting ? 'Converting...' : '🔨 Convert to Job'}
				</button>
			{:else if job.status}
				<span class="badge badge-{job.status === 'completed' ? 'complete' : job.status === 'in_progress' ? 'active' : 'pending'}">{job.status.replace('_', ' ')}</span>
			{/if}
		</div>
	</div>

	<!-- Start With Tasks -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 8px;">⚡ Start With (Prep Tasks)</h3>
		{#each startWithTasks as task}
			<div class="task-row">
				<input id="sw-{task.id}" type="checkbox" checked={task.completed} onchange={(e) => toggleStartWith(task.id, e.currentTarget.checked)} />
				<label for="sw-{task.id}" class="task-desc" style="text-decoration: {task.completed ? 'line-through' : 'none'}; color: {task.completed ? 'var(--text-secondary)' : 'var(--text)'}; cursor: pointer;">
					{task.description}
				</label>
			</div>
		{/each}
		<div class="row mt-2">
			<div class="col"><input placeholder="Add prep task..." bind:value={newTaskDesc} onkeydown={(e) => e.key === 'Enter' && addStartWithTask()} /></div>
			<button class="btn btn-primary btn-sm" onclick={addStartWithTask}>+ Add</button>
		</div>
	</div>

	<!-- Sections -->
	{#each sections as section}
		<details class="section-card" open={section.expanded}>
			<summary>
				<span>{section.name}</span>
				<span class="text-secondary">{completedCount(section)}/{section.tasks.length} done</span>
			</summary>
			<div class="section-body">
				{#each section.tasks as task}
					<div class="task-row" style="flex-wrap: wrap;">
						<div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px;">
							<input id="t-{task.id}" type="checkbox" checked={task.completed} onchange={(e) => toggleTask(section.id, task.id, e.currentTarget.checked)} />
							<label for="t-{task.id}" class="task-desc" style="text-decoration: {task.completed ? 'line-through' : 'none'}; cursor: pointer;">
								{task.description}
							</label>
							{#if task.requiredPhoto}<span class="badge badge-pending" style="font-size: 0.7rem;">📷 required</span>{/if}
						</div>
						<div style="display: flex; align-items: center; gap: 8px;">
							<!-- Upload photo button -->
							<label class="btn btn-outline btn-sm" style="cursor: pointer; font-size: 0.75rem; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;">
								📎 {uploadingPhotoForTask === task.id ? 'Uploading...' : 'Photo'}
								<input type="file" accept="image/*" style="display: none;" onchange={(e) => handlePhotoFile(section.id, task.id, e)} disabled={uploadingPhotoForTask === task.id} />
							</label>
							<!-- Existing photos -->
							{#if task.photos && task.photos.length > 0}
								{#each task.photos as photo}
									<button
										class="btn btn-sm"
										style="padding: 2px 6px; font-size: 0.7rem; background: #e8f5e9; border: 1px solid #4caf50; border-radius: 4px; cursor: pointer;"
										onclick={() => showingPhotoUrl = photo.url}
									>
										🖼 View
									</button>
								{/each}
							{/if}
						</div>
					</div>
				{/each}

				{#if addingTaskToSection === section.id}
					<div class="row mt-2">
						<div class="col"><input placeholder="Task description..." bind:value={newTaskDesc} onkeydown={(e) => e.key === 'Enter' && addTask(section.id)} /></div>
						<button class="btn btn-primary btn-sm" onclick={() => addTask(section.id)}>Add</button>
						<button class="btn btn-outline btn-sm" onclick={() => addingTaskToSection = null}>Cancel</button>
					</div>
				{:else}
					<button class="btn btn-outline btn-sm mt-2" onclick={() => addingTaskToSection = section.id}>
						+ Add Task
					</button>
				{/if}
			</div>
		</details>
	{/each}

	<!-- Add Section -->
	<div class="row mt-4">
		<div class="col"><input placeholder="New section name (e.g. Break Room)..." bind:value={newSectionName} onkeydown={(e) => e.key === 'Enter' && addSection()} /></div>
		<button class="btn btn-primary" onclick={addSection}>+ Add Section</button>
	</div>

	<div class="row mt-4" style="justify-content: flex-end; gap: 8px;">
		<button class="btn btn-outline">Save Draft</button>
		<button class="btn btn-success">✅ Submit Job</button>
	</div>
{/if}