<script lang="ts">
	import '../../../app.css';
	import { onMount } from 'svelte';

	let user = $state<{
		id: string; email: string | null; workerId: string | null; displayName: string | null;
		worker?: { id: string; firstName: string; lastName: string } | null;
	} | null>(null);

	let worker = $state<any>(null);
	let loading = $state(true);
	let saving = $state(false);
	let saveMessage = $state('');
	let saveError = $state('');

	// Non-critical fields that can be edited directly
	let editPhone = $state('');
	let editNotes = $state('');
	let editEmail = $state('');

	// Pending profile changes
	let pendingChanges = $state<Array<{ id: string; field: string; newValue: string; oldValue: string | null; status: string; requestedAt: string }>>([]);

	// Critical field edit mode
	let criticalFieldOpen = $state('');
	let criticalNewValue = $state('');
	let submittingChange = $state(false);

	onMount(async () => {
		await loadUser();
		if (user?.workerId) {
			await loadWorker();
			await loadPendingChanges();
		}
		loading = false;
	});

	async function loadUser() {
		try {
			const res = await fetch('/api/auth/me');
			if (res.ok) user = await res.json();
		} catch { /* ignore */ }
	}

	async function loadWorker() {
		try {
			const res = await fetch(`/api/workers/${user?.workerId}`);
			if (res.ok) {
				worker = await res.json();
				editPhone = worker.phone || '';
				editNotes = worker.notes || '';
				editEmail = worker.email || '';
			}
		} catch { /* ignore */ }
	}

	async function loadPendingChanges() {
		try {
			const res = await fetch(`/api/profile-changes?workerId=${user?.workerId}`);
			if (res.ok) pendingChanges = await res.json();
		} catch { /* ignore */ }
	}

	// Save non-critical fields directly
	async function saveProfile() {
		saving = true;
		saveMessage = '';
		saveError = '';
		try {
			const res = await fetch(`/api/workers/${user?.workerId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone: editPhone, notes: editNotes, email: editEmail }),
			});
			if (res.ok) {
				worker = { ...worker, phone: editPhone, notes: editNotes, email: editEmail };
				saveMessage = 'Profile updated.';
			} else {
				saveError = 'Failed to save.';
			}
		} catch {
			saveError = 'Network error.';
		} finally {
			saving = false;
		}
	}

	// Submit a critical field change for approval
	async function requestChange(field: string, currentValue: string) {
		if (!criticalNewValue || criticalNewValue === currentValue) {
			criticalFieldOpen = '';
			return;
		}
		submittingChange = true;
		try {
			const res = await fetch('/api/profile-changes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					field,
					newValue: criticalNewValue,
					oldValue: currentValue || null,
				})
			});
			if (res.ok) {
				await loadPendingChanges();
				criticalFieldOpen = '';
				criticalNewValue = '';
				saveMessage = `Change to "${field}" submitted for approval.`;
			} else {
				saveError = 'Failed to submit change.';
			}
		} catch {
			saveError = 'Network error.';
		} finally {
			submittingChange = false;
		}
	}

	// Determine if a field is critical (goes through approval)
	function isCritical(field: string): boolean {
		return ['firstName', 'lastName', 'w9ParsedName', 'w9ParsedTin', 'w9ParsedAddress'].includes(field);
	}

	function hasPendingChange(field: string): boolean {
		return pendingChanges.some(c => c.field === field && c.status === 'pending');
	}

	function getPendingChange(field: string) {
		return pendingChanges.find(c => c.field === field && c.status === 'pending');
	}

	function formatFieldName(field: string): string {
		const labels: Record<string, string> = {
			firstName: 'First Name',
			lastName: 'Last Name',
			w9ParsedName: 'W-9 Name',
			w9ParsedTin: 'TIN / SSN',
			w9ParsedAddress: 'W-9 Address',
		};
		return labels[field] || field;
	}
</script>

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading profile...</p>
	</div>
{:else if worker}
	<h2 style="margin-bottom: 16px;">My Profile</h2>

	<!-- Messages -->
	{#if saveMessage}
		<div class="msg-success">
			{saveMessage}
		</div>
	{/if}
	{#if saveError}
		<div class="msg-error">
			{saveError}
		</div>
	{/if}

	<!-- Critical fields (name, tax info) — read-only with "request change" -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 12px;">Personal Information</h3>
		<p class="text-secondary" style="margin-bottom: 8px; font-size: 0.8rem;">
			🔒 Fields with a lock need admin approval to change.
		</p>

		{#each ['firstName', 'lastName'] as field}
			<div class="locked-field">
				<div class="locked-row">
					<div>
						<span class="text-secondary" style="font-size: 0.8rem;">🔒 {formatFieldName(field)}</span><br>
						<span style="font-weight: 500;">{worker[field] || '—'}</span>
						{#if hasPendingChange(field)}
							{@const pc = getPendingChange(field)}
							<span class="badge badge-pending" style="margin-left: 8px;">⏳ Pending: "{pc?.newValue}"</span>
						{/if}
					</div>
					{#if !hasPendingChange(field) && criticalFieldOpen !== field}
						<button class="btn btn-outline btn-sm" onclick={() => { criticalFieldOpen = field; criticalNewValue = worker[field] || ''; }}>
							✎ Request Change
						</button>
					{/if}
				</div>
				{#if !hasPendingChange(field) && criticalFieldOpen === field}
					<div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
						<input
							bind:value={criticalNewValue}
							placeholder="New {formatFieldName(field)}"
							style="flex: 1; min-width: 160px;"
						/>
						<button class="btn btn-primary" onclick={() => requestChange(field, worker[field])} disabled={submittingChange}>
							{submittingChange ? '...' : 'Submit'}
						</button>
						<button class="btn btn-outline" onclick={() => criticalFieldOpen = ''}>Cancel</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Tax Info (critical) -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 12px;">📄 Tax Information (W-9)</h3>
		<p class="text-secondary" style="margin-bottom: 8px; font-size: 0.8rem;">
			🔒 Changes to tax info require admin approval.
		</p>

		{#each ['w9ParsedName', 'w9ParsedTin', 'w9ParsedAddress'] as field}
			<div class="locked-field">
				<div class="locked-row">
					<div>
						<span class="text-secondary" style="font-size: 0.8rem;">🔒 {formatFieldName(field)}</span><br>
						<span style="font-weight: 500;">{worker[field] || '—'}</span>
						{#if hasPendingChange(field)}
							{@const pc = getPendingChange(field)}
							<span class="badge badge-pending" style="margin-left: 8px;">⏳ Pending: "{pc?.newValue}"</span>
						{/if}
					</div>
					{#if !hasPendingChange(field) && criticalFieldOpen !== field}
						<button class="btn btn-outline btn-sm" onclick={() => { criticalFieldOpen = field; criticalNewValue = worker[field] || ''; }}>
							✎ Request Change
						</button>
					{/if}
				</div>
				{#if !hasPendingChange(field) && criticalFieldOpen === field}
					<div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
						<input
							bind:value={criticalNewValue}
							placeholder="New {formatFieldName(field)}"
							style="flex: 1; min-width: 160px;"
						/>
						<button class="btn btn-primary" onclick={() => requestChange(field, worker[field] || '')} disabled={submittingChange}>
							{submittingChange ? '...' : 'Submit'}
						</button>
						<button class="btn btn-outline" onclick={() => criticalFieldOpen = ''}>Cancel</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Non-critical fields (editable directly) -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 12px;">Contact & Notes</h3>
		<div class="row mb-2">
			<div class="col"><label for="wPhone">Phone</label><input id="wPhone" bind:value={editPhone} /></div>
			<div class="col"><label for="wEmail">Email</label><input id="wEmail" type="email" bind:value={editEmail} /></div>
		</div>
		<div class="mb-4"><label for="wNotes">Notes</label><textarea id="wNotes" bind:value={editNotes} rows="2"></textarea></div>
		<button class="btn btn-primary btn-block" onclick={saveProfile} disabled={saving}>
			{saving ? 'Saving...' : 'Save'}
		</button>
	</div>

	<!-- Pending changes history -->
	{#if pendingChanges.length > 0}
		<div class="card">
			<h3 style="font-size: 1rem; margin-bottom: 12px;">📋 Change History</h3>
			{#each pendingChanges as c}
				<div style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem;">
					<strong>{formatFieldName(c.field)}</strong> → {c.newValue}
					<span class="badge {c.status === 'approved' ? 'badge-complete' : c.status === 'pending' ? 'badge-pending' : ''}">
						{c.status}
					</span>
					<span class="text-secondary" style="float: right;">{new Date(c.requestedAt).toLocaleDateString()}</span>
				</div>
			{/each}
		</div>
	{/if}
{:else}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">No worker profile linked to your account. Contact an administrator.</p>
	</div>
{/if}