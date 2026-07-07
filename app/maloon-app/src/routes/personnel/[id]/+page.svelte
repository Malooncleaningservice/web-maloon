<script lang="ts">
	import '../../../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let workerId = $state('');
	let worker = $state<{
		id: string; firstName: string; lastName: string; role: string; status: string;
		email: string; phone: string; notes?: string;
		w9Uploaded: boolean; w9Reviewed: boolean;
		w9FileName?: string; w9FileUrl?: string; w9ParsedName?: string; w9ParsedTin?: string; w9ParsedAddress?: string;
		user?: { id: string; email: string | null; identifierToken: string | null } | null;
		assignments?: Array<{job: {id: string; name: string; scheduledDate?: string; status: string}}>;
	}>({
		id: '', firstName: '', lastName: '', role: 'worker', status: 'active',
		email: '', phone: '', notes: '',
		w9Uploaded: false, w9Reviewed: false,
	});
	let loading = $state(true);
	let editMode = $state(false);
	let editDraft = $state({} as any);
	let saving = $state(false);

	let w9File = $state<File | null>(null);
	let uploadingW9 = $state(false);
	let showingPdfViewer = $state(false);

	// Password reset
	let resettingPassword = $state(false);
	let resetMessage = $state('');
	let resetError = $state('');

	// Pending profile changes
	let profileChanges = $state<Array<{id: string; field: string; oldValue: string | null; newValue: string; status: string; requestedAt: string}>>([]);
	let approvingId = $state('');

	onMount(async () => {
		workerId = $page.params.id;
		await loadWorker();
		await loadProfileChanges();
	});

	async function loadWorker() {
		loading = true;
		try {
			const res = await fetch(`/api/workers/${workerId}`);
			const data = await res.json();
			worker = data;
			editDraft = { ...data };
		} catch (e) {
			console.error('Failed to load worker', e);
		} finally {
			loading = false;
		}
	}

	async function loadProfileChanges() {
		try {
			const res = await fetch(`/api/profile-changes?workerId=${workerId}`);
			if (res.ok) profileChanges = await res.json();
		} catch { /* ignore */ }
	}

	function startEdit() {
		editDraft = { ...worker };
		editMode = true;
	}

	async function saveWorker() {
		saving = true;
		try {
			const res = await fetch(`/api/workers/${workerId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editDraft),
			});
			const data = await res.json();
			worker = data;
			editMode = false;
		} catch (e) {
			console.error(e);
		} finally {
			saving = false;
		}
	}

	async function markW9Reviewed() {
		await fetch(`/api/workers/${workerId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ w9Reviewed: true }),
		});
		worker = { ...worker, w9Reviewed: true };
	}

	function handleW9FileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			w9File = file;
		}
	}

	async function uploadW9() {
		if (!w9File) return;
		uploadingW9 = true;
		try {
			const formData = new FormData();
			formData.append('file', w9File);
			const uploadRes = await fetch(`/api/upload?type=w9&workerId=${workerId}`, {
				method: 'POST',
				body: formData,
			});
			if (!uploadRes.ok) throw new Error(await uploadRes.text());
			const result = await uploadRes.json();
			worker = {
				...worker,
				w9Uploaded: true,
				w9FileName: result.fileName,
				w9FileUrl: result.url,
			};
			w9File = null;
		} catch (e) {
			console.error('W-9 upload failed', e);
			alert('Failed to upload W-9.');
		} finally {
			uploadingW9 = false;
		}
	}

	// --- Password reset ---
	async function resetPassword() {
		resettingPassword = true;
		resetMessage = '';
		resetError = '';
		try {
			const res = await fetch(`/api/workers/${workerId}/reset-password`, { method: 'POST' });
			const data = await res.json();
			if (res.ok) {
				worker = { ...worker, user: { ...worker.user, identifierToken: data.identifierToken, id: worker.user?.id ?? '', email: worker.user?.email ?? null } };
				resetMessage = data.message || 'A new access code has been generated.';
			} else {
				resetError = data.error || 'Failed to reset password';
			}
		} catch {
			resetError = 'Network error';
		} finally {
			resettingPassword = false;
		}
	}

	// --- Approve / reject profile change ---
	async function handleChangeReview(changeId: string, status: 'approved' | 'rejected') {
		approvingId = changeId;
		try {
			await fetch(`/api/profile-changes/${changeId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});
			profileChanges = profileChanges.map(c => c.id === changeId ? { ...c, status } : c);
			if (status === 'approved') await loadWorker();
		} catch { /* ignore */ } finally {
			approvingId = '';
		}
	}

	function isPdf(url: string): boolean {
		return url.startsWith('data:application/pdf') || url.toLowerCase().endsWith('.pdf');
	}

	function isImage(url: string): boolean {
		return url.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
	}
</script>

<a href="/personnel" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; margin-bottom: 12px; display: inline-block;">
	← Back to Personnel
</a>

{#if showingPdfViewer && worker.w9FileUrl}
	<div
		style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center;"
	>
		<div style="width: 90vw; height: 90vh; background: #fff; border-radius: 8px; overflow: hidden; position: relative;">
			{#if isPdf(worker.w9FileUrl)}
				<iframe src={worker.w9FileUrl} style="width: 100%; height: 100%; border: none;" title="W-9 PDF"></iframe>
			{:else if isImage(worker.w9FileUrl)}
				<img src={worker.w9FileUrl} alt="W-9" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
			{/if}
			<button
				class="btn btn-outline"
				style="position: absolute; top: 8px; right: 8px;"
				onclick={() => showingPdfViewer = false}
			>✕ Close</button>
		</div>
	</div>
{/if}

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading worker...</p>
	</div>
{:else}
	<h2 style="margin-bottom: 16px;">{worker.firstName} {worker.lastName}</h2>

	<!-- Profile -->
	<div class="card">
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
			<h3 style="font-size: 1rem;">Profile</h3>
			<button class="btn btn-outline btn-sm" onclick={editMode ? saveWorker : startEdit} disabled={saving}>
				{editMode ? (saving ? 'Saving...' : 'Save') : 'Edit'}
			</button>
		</div>

		{#if editMode}
			<div class="row mb-2">
				<div class="col"><label for="efn">First Name</label><input id="efn" bind:value={editDraft.firstName} /></div>
				<div class="col"><label for="eln">Last Name</label><input id="eln" bind:value={editDraft.lastName} /></div>
			</div>
			<div class="row mb-2">
				<div class="col"><label for="eem">Email</label><input id="eem" type="email" bind:value={editDraft.email} /></div>
				<div class="col"><label for="eph">Phone</label><input id="eph" bind:value={editDraft.phone} /></div>
			</div>
			<div class="row mb-2">
				<div class="col">
					<label for="ero">Role</label>
					<select id="ero" bind:value={editDraft.role}>
						<option value="worker">Worker</option>
						<option value="supervisor">Supervisor</option>
						<option value="admin">Admin</option>
					</select>
				</div>
				<div class="col">
					<label for="est">Status</label>
					<select id="est" bind:value={editDraft.status}>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
					</select>
				</div>
			</div>
			<div class="mb-2"><label for="eno">Notes</label><textarea id="eno" bind:value={editDraft.notes} rows="2"></textarea></div>
		{:else}
			<div class="row mb-2">
				<div class="col"><span class="text-secondary">Email</span><br>{worker.email || '—'}</div>
				<div class="col"><span class="text-secondary">Phone</span><br>{worker.phone || '—'}</div>
			</div>
			<div class="row mb-2">
				<div class="col"><span class="text-secondary">Role</span><br><span class="badge badge-active">{worker.role}</span></div>
				<div class="col"><span class="text-secondary">Status</span><br><span class="badge badge-active">{worker.status}</span></div>
			</div>
			<p class="text-secondary">{worker.notes || 'No notes.'}</p>
		{/if}
	</div>

	<!-- Account / Login Section -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 12px;">🔑 Account & Login</h3>
		{#if worker.user}
			<div class="row mb-2">
				<div class="col">
					<span class="text-secondary">Login Email</span><br>
					{#if worker.user?.email}
					{worker.user.email}
				{:else}
					<em>Not set yet — uses access code</em>
				{/if}
				</div>
				<div class="col">
					<span class="text-secondary">Access Code</span><br>
					{#if worker.user.identifierToken}
						<span style="font-family: monospace; font-weight: 600;">{worker.user.identifierToken}</span>
					{:else}
						<span class="text-secondary">—</span>
					{/if}
				</div>
			</div>
			{#if resetMessage}
				<div style="background: #e6f4ea; color: var(--success); padding: 10px 14px; border-radius: var(--radius); margin-bottom: 12px; font-size: 0.85rem;">
					{resetMessage}
				</div>
			{/if}
			{#if resetError}
				<div style="background: #fce8e6; color: var(--danger); padding: 10px 14px; border-radius: var(--radius); margin-bottom: 12px; font-size: 0.85rem;">
					{resetError}
				</div>
			{/if}
			<button class="btn btn-outline btn-sm" onclick={resetPassword} disabled={resettingPassword}>
				{resettingPassword ? 'Generating...' : '🔄 Reset Password / Generate New Code'}
			</button>
		{:else}
			<p class="text-secondary">No login account linked to this worker.</p>
		{/if}
	</div>

	<!-- Pending Profile Changes -->
	{#if profileChanges.length > 0}
		<div class="card">
			<h3 style="font-size: 1rem; margin-bottom: 12px;">⏳ Pending Changes</h3>
			{#each profileChanges.filter(c => c.status === 'pending') as change, i}
				<div style="padding: 10px; border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
					<div>
						<strong>{change.field}</strong>
						<span class="text-secondary"> → {change.newValue}</span>
						{#if change.oldValue}<br /><span class="text-secondary">was: {change.oldValue}</span>{/if}
					</div>
					<div style="display: flex; gap: 6px;">
						<button
							class="btn btn-success btn-sm"
							disabled={approvingId === change.id}
							onclick={() => handleChangeReview(change.id, 'approved')}
						>
							{approvingId === change.id ? '...' : '✓ Approve'}
						</button>
						<button
							class="btn btn-danger btn-sm"
							disabled={approvingId === change.id}
							onclick={() => handleChangeReview(change.id, 'rejected')}
						>
							✕ Reject
						</button>
					</div>
				</div>
			{/each}
			<!-- Show recent resolved changes -->
			{#each profileChanges.filter(c => c.status !== 'pending').slice(0, 5) as change}
				<div style="padding: 6px 10px; font-size: 0.8rem; color: var(--text-secondary);">
					{change.field} → {change.newValue}
					<span class="badge {change.status === 'approved' ? 'badge-complete' : ''}">{change.status}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- W-9 Section -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 12px;">📄 W-9 Tax Information</h3>
		{#if worker.w9Uploaded}
			<div class="row mb-2">
				<div class="col"><span class="text-secondary">Name on Form</span><br>{worker.w9ParsedName || '—'}</div>
				<div class="col"><span class="text-secondary">TIN</span><br>{worker.w9ParsedTin || '—'}</div>
			</div>
			<div class="mb-2"><span class="text-secondary">Address</span><br>{worker.w9ParsedAddress || '—'}</div>
			<div class="mb-2" style="display: flex; align-items: center; gap: 12px;">
				<span class="text-secondary">File:</span>
				<span style="font-size: 0.85rem;">{worker.w9FileName || 'W-9 Document'}</span>
				<button class="btn btn-outline btn-sm" onclick={() => showingPdfViewer = true}>
					🔍 View W-9
				</button>
			</div>
			<div class="row mt-2" style="gap: 6px;">
				<span class="badge {worker.w9Reviewed ? 'badge-complete' : 'badge-pending'}">
					{worker.w9Reviewed ? '✓ Reviewed' : '⏳ Pending Review'}
				</span>
				{#if !worker.w9Reviewed}
					<button class="btn btn-success btn-sm" onclick={markW9Reviewed}>Mark as Reviewed</button>
				{/if}
			</div>
		{:else}
			<div style="text-align: center; padding: 24px;">
				<p class="text-secondary mb-4">No W-9 on file.</p>
				<div style="display: flex; flex-direction: column; align-items: center; gap: 12px;">
					<input
						type="file"
						accept=".pdf,.jpg,.jpeg,.png"
						style="max-width: 300px;"
						onchange={handleW9FileSelect}
					/>
					{#if w9File}
						<span style="font-size: 0.85rem; color: var(--primary);">Selected: {w9File.name}</span>
						<button class="btn btn-primary" onclick={uploadW9} disabled={uploadingW9}>
							{uploadingW9 ? 'Uploading...' : '📤 Upload W-9'}
						</button>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Assigned Jobs -->
	<div class="card">
		<h3 style="font-size: 1rem; margin-bottom: 8px;">Assigned Jobs</h3>
		{#if worker.assignments?.length}
			{#each worker.assignments as a}
				<a href="/jobs/{a.job.id}" style="text-decoration: none; color: inherit;">
					<div class="task-row" style="cursor: pointer;">
						<span class="task-desc">{a.job.clientName || 'Unnamed Job'}</span>
						{#if a.job.scheduledDate}<span class="text-secondary">📅 {a.job.scheduledDate}</span>{/if}
						<span class="badge badge-pending">{a.job.status}</span>
					</div>
				</a>
			{/each}
		{:else}
			<p class="text-secondary">No jobs assigned.</p>
		{/if}
	</div>
{/if}