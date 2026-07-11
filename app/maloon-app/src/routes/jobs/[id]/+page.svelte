<script lang="ts">
	import '../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let jobId = $state('');
	let job = $state<{
		id?: string; quoteId?: string; clientId?: string; client?: {id: string; name: string} | null;
		clientName?: string; address?: string; status?: string; scheduledDate?: string | null;
		total?: number; notes?: string;
		isRecurring?: boolean; recurrencePattern?: string; recurrenceEndDate?: string | null;
		recurringTemplateId?: string | null;
		assignments?: Array<{id: string; worker: {id: string; firstName: string; lastName: string}}>;
	}>({});
	let sections = $state<Array<{id: string; name: string; sortOrder: number; expanded: boolean; tasks: Array<{id: string; description: string; sortOrder: number; completed: boolean; requiredPhoto: boolean; photos?: Array<{id: string; url: string; takenAt: string}>}>}>>([]);
	let startWithTasks = $state<Array<{id: string; description: string; completed: boolean}>>([]);
	let loading = $state(true);
	let uploadingPhotoForTask = $state<string | null>(null);
	let showingPhotoUrl = $state<string | null>(null);
	let statusUpdating = $state(false);

	// Worker assignment state
	let allWorkers = $state<Array<{id: string; firstName: string; lastName: string; status: string}>>([]);
	let assignments = $state<Array<{id: string; worker: {id: string; firstName: string; lastName: string}}>>([]);
	let assigningWorkerId = $state('');
	let assignSaving = $state(false);
	let showAssignPanel = $state(false);

	// Edit job fields
	let showEditPanel = $state(false);
	let editTotal = $state(0);
	let editIsRecurring = $state(false);
	let editRecurrencePattern = $state('');
	let editRecurrenceEndDate = $state('');
	let editSaving = $state(false);

	// Recurring generation
	let generating = $state(false);
	let generateMessage = $state('');

	let newSectionName = $state('');
	let newTaskDesc = $state('');
	let addingTaskToSection = $state<string | null>(null);

	onMount(async () => {
		jobId = $page.params.id;
		await loadJob();
		await loadWorkers();
	});

	async function loadJob() {
		loading = true;
		try {
			const res = await fetch(`/api/jobs/${jobId}`);
			const data = await res.json();
			job = data;
			assignments = data.assignments ?? [];
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

	async function loadWorkers() {
		try {
			const res = await fetch('/api/workers');
			const data = await res.json();
			allWorkers = data.filter((w: any) => w.status === 'active');
		} catch (e) { /* ignore */ }
	}

	// --- Status management ---
	async function updateStatus(newStatus: string) {
		statusUpdating = true;
		try {
			await fetch(`/api/jobs/${jobId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});
			job = { ...job, status: newStatus };
		} catch (e) {
			console.error('Status update failed', e);
			alert('Failed to update status.');
		} finally {
			statusUpdating = false;
		}
	}

	// --- Worker assignment ---
	async function assignWorker() {
		if (!assigningWorkerId) return;
		assignSaving = true;
		try {
			const res = await fetch(`/api/jobs/${jobId}/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ workerId: assigningWorkerId }),
			});
			if (res.status === 409) {
				const data = await res.json();
				alert(`Conflict: Worker is already assigned to "${data.conflict?.clientName}" on this date.`);
				return;
			}
			if (!res.ok) throw new Error(await res.text());
			assigningWorkerId = '';
			await loadJob();
		} catch (e) {
			console.error('Assignment failed', e);
		} finally {
			assignSaving = false;
		}
	}

	async function removeAssignment(assignmentId: string) {
		try {
			await fetch(`/api/jobs/${jobId}/assign`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ assignmentId }),
			});
			await loadJob();
		} catch (e) {
			console.error('Failed to remove assignment', e);
		}
	}

	// --- Job editing ---
	function openEdit() {
		editTotal = job.total ?? 0;
		editIsRecurring = job.isRecurring ?? false;
		editRecurrencePattern = job.recurrencePattern ?? '';
		editRecurrenceEndDate = job.recurrenceEndDate?.slice(0, 10) ?? '';
		showEditPanel = true;
	}

	async function saveEdit() {
		editSaving = true;
		try {
			const res = await fetch(`/api/jobs/${jobId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					total: editTotal,
					isRecurring: editIsRecurring,
					recurrencePattern: editRecurrencePattern || null,
					recurrenceEndDate: editRecurrenceEndDate || null,
				}),
			});
			if (res.ok) {
				showEditPanel = false;
				await loadJob();
			} else {
				const err = await res.json();
				alert(err.error || 'Failed to save');
			}
		} catch (e) {
			console.error(e);
		} finally {
			editSaving = false;
		}
	}

	async function generateRecurring() {
		generating = true;
		generateMessage = '';
		try {
			const res = await fetch(`/api/jobs/${jobId}/generate-recurring`, { method: 'POST' });
			const data = await res.json();
			if (res.ok) {
				generateMessage = `Generated ${data.generated} job instances.`;
				await loadJob();
			} else {
				generateMessage = data.error || 'Generation failed';
			}
		} catch (e) {
			generateMessage = 'Failed to generate recurring jobs';
		}
		generating = false;
	}

	function unassignedWorkers() {
		const assignedIds = new Set(assignments.map(a => a.worker.id));
		return allWorkers.filter(w => !assignedIds.has(w.id));
	}

	// --- Section / task management ---
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
		const prevSections = sections.map(s => ({...s, tasks: s.tasks.map(t => ({...t}))}));
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
		} catch (e) {
			sections = prevSections;
			console.error(e);
		}
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
		const prevTasks = startWithTasks.map(t => ({...t}));
		startWithTasks = startWithTasks.map(t => t.id === taskId ? { ...t, completed } : t);
		try {
			await fetch(`/api/jobs/${jobId}/start-with`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ taskId, completed }),
			});
		} catch (e) {
			startWithTasks = prevTasks;
			console.error(e);
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
		<!-- svelte-ignore a11y_img_redundant_alt -->
		<img src={showingPhotoUrl} alt="Task photo" style="max-width: 90vw; max-height: 90vh; border-radius: 8px;" />
	</div>
{/if}

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading job...</p>
	</div>
{:else}
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
		<div>
			<h2 style="font-size: 1.3rem; margin: 0;">
				{job.clientName ?? 'Job'} — {job.address ?? 'No address'}
				{#if job.clientId && job.client}
					<a href="/clients/{job.clientId}" style="font-size: 0.8rem; color: var(--primary); text-decoration: underline; margin-left: 8px;">view client</a>
				{/if}
			</h2>
		</div>
		<div style="display: flex; align-items: center; gap: 8px;">
			{#if job.quoteId}
				<span class="badge badge-quote">FROM QUOTE</span>
			{/if}
			{#if job.isRecurring}
				<span class="badge" style="background: #e8f0fe; color: var(--primary);">🔁 Recurring {job.recurrencePattern}</span>
			{/if}
			{#if job.recurringTemplateId}
				<span class="badge badge-pending">📋 Generated</span>
			{/if}
			{#if job.status}
				<span class="badge badge-{job.status === 'completed' ? 'complete' : job.status === 'in_progress' ? 'active' : 'pending'}">
					{job.status.replace('_', ' ')}
				</span>
			{/if}
		</div>
	</div>

	<!-- Status & Assignment Row -->
	<div class="row mb-4" style="gap: 12px; flex-wrap: wrap;">
		<!-- Status Buttons -->
		<div style="display: flex; gap: 6px; align-items: center;">
			{#if job.status === 'pending'}
				<button class="btn btn-primary btn-sm" onclick={() => updateStatus('in_progress')} disabled={statusUpdating}>
					▶ Start Job
				</button>
			{/if}
			{#if job.status === 'in_progress'}
				<button class="btn btn-success btn-sm" onclick={() => updateStatus('completed')} disabled={statusUpdating}>
					✅ Mark Complete
				</button>
			{/if}
			{#if job.status !== 'completed' && job.status !== 'cancelled'}
				<button class="btn btn-outline btn-sm" onclick={() => updateStatus('cancelled')} disabled={statusUpdating}>
					✕ Cancel
				</button>
			{/if}
			{#if job.status === 'cancelled'}
				<button class="btn btn-outline btn-sm" onclick={() => updateStatus('pending')} disabled={statusUpdating}>
					↩ Reopen
				</button>
			{/if}
		</div>

		<!-- Worker Assignments -->
		<div style="display: flex; gap: 8px; align-items: center; margin-left: auto;">
			{#if assignments.length > 0}
				<span class="text-secondary" style="font-size: 0.85rem;">
					👷 {assignments.map(a => `${a.worker.firstName} ${a.worker.lastName}`).join(', ')}
				</span>
			{/if}
			<button class="btn btn-outline btn-sm" onclick={() => showAssignPanel = !showAssignPanel}>
				{showAssignPanel ? 'Close' : 'Manage Workers'}
			</button>
		</div>
	</div>

	<!-- Worker Assignment Panel -->
	{#if showAssignPanel}
		<div class="card" style="background: #f8f9fa; margin-bottom: 16px;">
			<h3 style="font-size: 0.95rem; margin-bottom: 8px;">Worker Assignment</h3>

			<!-- Assigned Workers -->
			{#if assignments.length > 0}
				<div style="margin-bottom: 12px;">
					<span class="text-secondary" style="font-size: 0.8rem;">Assigned</span>
					{#each assignments as a}
						<div style="display: flex; align-items: center; gap: 8px; padding: 6px 0;">
							<span style="font-weight: 500;">{a.worker.firstName} {a.worker.lastName}</span>
							<button class="btn btn-danger btn-sm" style="padding: 2px 8px; font-size: 0.7rem;"
								onclick={() => removeAssignment(a.id)}>✕ Remove</button>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Assign New Worker -->
			{#if unassignedWorkers().length > 0}
				<div class="row" style="gap: 8px;">
					<div class="col">
						<select bind:value={assigningWorkerId}>
							<option value="">— Select worker —</option>
							{#each unassignedWorkers() as w}
								<option value={w.id}>{w.firstName} {w.lastName}</option>
							{/each}
						</select>
					</div>
					<button class="btn btn-primary btn-sm" onclick={assignWorker} disabled={assignSaving || !assigningWorkerId}>
						{assignSaving ? 'Assigning...' : 'Assign'}
					</button>
				</div>
			{:else}
				<p class="text-secondary" style="font-size: 0.85rem;">All active workers are assigned to this job.</p>
			{/if}
		</div>
	{/if}

	<!-- Job Edit & Recurrence Panel -->
	<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
		{#if job.total != null && job.total > 0}
			<span class="fw-bold" style="font-size: 1rem;">${job.total.toFixed(2)}</span>
		{/if}
		<button class="btn btn-outline btn-sm" onclick={openEdit}>✎ Edit Details</button>
		{#if job.isRecurring}
			<button class="btn btn-primary btn-sm" onclick={generateRecurring} disabled={generating}>
				{generating ? 'Generating...' : '🔄 Generate Instances'}
			</button>
		{/if}
	</div>
	{#if generateMessage}
		<div class="card" style="background: {generateMessage.startsWith('Generated') ? '#e8f5e9' : '#fef7e0'}; border-left: 3px solid {generateMessage.startsWith('Generated') ? 'var(--success)' : 'var(--warning)'}; margin-bottom: 12px; padding: 8px 12px;">
			<p style="font-size: 0.85rem;">{generateMessage}</p>
		</div>
	{/if}

	{#if showEditPanel}
		<div class="card" style="background: #f8f9fa; margin-bottom: 16px;">
			<h3 style="font-size: 0.95rem; margin-bottom: 8px;">Edit Job Details</h3>
			<div class="row mb-2">
				<div class="col"><label for="ejTotal">Total ($)</label><input id="ejTotal" type="number" step="0.01" min="0" bind:value={editTotal} /></div>
				<div class="col" style="display: flex; align-items: flex-end; gap: 8px;">
					<label style="display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 0.85rem;">
						<input type="checkbox" bind:checked={editIsRecurring} />
						Recurring
					</label>
				</div>
			</div>
			{#if editIsRecurring}
				<div class="row mb-2">
					<div class="col">
						<label for="ejPattern">Frequency</label>
						<select id="ejPattern" bind:value={editRecurrencePattern}>
							<option value="">— Select —</option>
							<option value="weekly">Weekly</option>
							<option value="biweekly">Biweekly</option>
							<option value="fourWeekly">Every 4 Weeks</option>
							<option value="monthly">Monthly</option>
						</select>
					</div>
					<div class="col"><label for="ejEndDate">End Date</label><input id="ejEndDate" type="date" bind:value={editRecurrenceEndDate} /></div>
				</div>
			{/if}
			<div style="display: flex; gap: 8px;">
				<button class="btn btn-primary btn-sm" onclick={saveEdit} disabled={editSaving}>
					{editSaving ? 'Saving...' : 'Save'}
				</button>
				<button class="btn btn-outline btn-sm" onclick={() => showEditPanel = false}>Cancel</button>
			</div>
		</div>
	{/if}

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

	<!-- Notes (if present) -->
	{#if job.notes}
		<div class="card" style="background: #fffbe6; border-left: 3px solid var(--warning);">
			<span class="text-secondary" style="font-size: 0.8rem;">Job Notes</span>
			<p style="white-space: pre-wrap; margin-top: 4px;">{job.notes}</p>
		</div>
	{/if}

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
							<label class="btn btn-outline btn-sm" style="cursor: pointer; font-size: 0.75rem; padding: 4px 8px; display: inline-flex; align-items: center; gap: 4px;">
								📎 {uploadingPhotoForTask === task.id ? 'Uploading...' : 'Photo'}
								<input type="file" accept="image/*" style="display: none;" onchange={(e) => handlePhotoFile(section.id, task.id, e)} disabled={uploadingPhotoForTask === task.id} />
							</label>
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
{/if}
