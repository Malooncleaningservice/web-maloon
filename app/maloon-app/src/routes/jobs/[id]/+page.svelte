<script lang="ts">
	import '../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let jobId = $state('');
	let job = $state<{clientName?: string; address?: string; status?: string; scheduledDate?: string | null; total?: number}>({});
	let sections = $state<Array<{id: string; name: string; sortOrder: number; expanded: boolean; tasks: Array<{id: string; description: string; sortOrder: number; completed: boolean; requiredPhoto: boolean}>}>>([]);
	let startWithTasks = $state<Array<{id: string; description: string; completed: boolean}>>([]);
	let loading = $state(true);
	let converting = $state(false);

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
				tasks: (s.tasks ?? []).map((t: any) => ({ ...t, completed: t.completed ?? false })),
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
				if (s.id === sectionId) return { ...s, tasks: [...s.tasks, { ...task, completed: false }] };
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
		converting = true;
		try {
			await fetch(`/api/jobs/${jobId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'pending' }),
			});
			job = { ...job, status: 'pending' };
		} catch (e) {
			console.error(e);
		} finally {
			converting = false;
		}
	}

	function completedCount(section: any) {
		return section.tasks.filter((t: any) => t.completed).length;
	}
</script>

<a href="/jobs" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; margin-bottom: 12px; display: inline-block;">
	← Back to Jobs
</a>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading job...</p>
	</div>
{:else}
	<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
		<h2 style="font-size: 1.3rem;">{job.clientName ?? 'Job'} — {job.address ?? 'No address'}</h2>
		<div style="display: flex; align-items: center; gap: 8px;">
			{#if job.quoteId}
				<span class="badge badge-quote">QUOTE</span>
				<button class="btn btn-success" onclick={convertQuoteToJob} disabled={converting}>
					{converting ? 'Converting...' : '✓ Convert to Job'}
				</button>
			{:else}
				<span class="badge badge-pending">{job.status}</span>
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
					<div class="task-row">
						<input id="t-{task.id}" type="checkbox" checked={task.completed} onchange={(e) => toggleTask(section.id, task.id, e.currentTarget.checked)} />
						<label for="t-{task.id}" class="task-desc" style="text-decoration: {task.completed ? 'line-through' : 'none'}; cursor: pointer;">
							{task.description}
						</label>
						{#if task.requiredPhoto}<span class="badge badge-pending">📷 required</span>{/if}
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
