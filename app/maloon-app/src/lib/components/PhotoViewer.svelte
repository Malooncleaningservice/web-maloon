<script lang="ts">
	import Modal from './Modal.svelte';

	export interface PhotoView {
		id: string;
		url: string;
		takenAt?: string | null;
		photoTakenAt?: string | null;
		takenBy?: string | null;
		takenByName?: string | null;
		latitude?: number | null;
		longitude?: number | null;
		locationAccuracy?: number | null;
		addressLine?: string | null;
		comment?: string | null;
	}

	let {
		photo = null,
		canEditComment = false,
		onClose,
		onSaved,
	}: {
		photo?: PhotoView | null;
		canEditComment?: boolean;
		onClose?: () => void;
		onSaved?: (photo: PhotoView) => void;
	} = $props();

	let open = $state(false);
	let comment = $state('');
	let editing = $state(false);
	let saving = $state(false);
	let error = $state('');

	// Open the dialog whenever a photo is supplied; sync the comment buffer.
	$effect(() => {
		open = !!photo;
		comment = photo?.comment ?? '';
		editing = false;
		error = '';
	});

	function takenTime(): Date | null {
		if (!photo) return null;
		const raw = photo.photoTakenAt || photo.takenAt;
		return raw ? new Date(raw) : null;
	}

	function hasLocation(): boolean {
		return !!photo && (photo.latitude != null || photo.longitude != null || !!photo.addressLine);
	}

	function mapsUrl(): string | null {
		if (!photo) return null;
		if (photo.latitude != null && photo.longitude != null) {
			return `https://maps.google.com/?q=${photo.latitude},${photo.longitude}`;
		}
		if (photo.addressLine) {
			return `https://maps.google.com/?q=${encodeURIComponent(photo.addressLine)}`;
		}
		return null;
	}

	function formatCoords(): string | null {
		if (!photo) return null;
		if (photo.latitude == null || photo.longitude == null) return null;
		return `${photo.latitude.toFixed(6)}, ${photo.longitude.toFixed(6)}`;
	}

	function startEdit() {
		if (!photo) return;
		comment = photo.comment ?? '';
		editing = true;
		error = '';
	}

	function cancelEdit() {
		comment = photo?.comment ?? '';
		editing = false;
		error = '';
	}

	async function save() {
		if (!photo) return;
		saving = true;
		error = '';
		try {
			const res = await fetch(`/api/photos/${photo.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ comment }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || 'Failed to save comment.');
			}
			const updated = (await res.json()) as PhotoView;
			comment = updated.comment ?? '';
			editing = false;
			onSaved?.(updated);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save comment.';
		} finally {
			saving = false;
		}
	}
</script>

<Modal bind:open title="Photo" maxWidth="560px" onClose={onClose}>
	{#if photo}
		<!-- svelte-ignore a11y_img_redundant_alt -->
		<img class="pv-img" src={photo.url} alt="Task photo" />

		<div class="pv-details">
			{#if takenTime()}
				<div class="pv-row">
					<span class="pv-icon">🕒</span>
					<div>
						<span class="pv-label">Taken</span>
						<span class="pv-value">{takenTime()!.toLocaleString(undefined, {
							weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
							hour: 'numeric', minute: '2-digit'
						})}</span>
					</div>
				</div>
			{/if}

			{#if photo.takenByName}
				<div class="pv-row">
					<span class="pv-icon">👷</span>
					<div>
						<span class="pv-label">Taken by</span>
						<span class="pv-value">{photo.takenByName}</span>
					</div>
				</div>
			{/if}

			{#if hasLocation()}
				<div class="pv-row">
					<span class="pv-icon">📍</span>
					<div style="min-width: 0;">
						<span class="pv-label">Location</span>
						{#if photo.addressLine}
							<span class="pv-value">{photo.addressLine}</span>
						{/if}
						{#if formatCoords()}
							<span class="pv-meta">GPS {formatCoords()}</span>
						{/if}
						{#if photo.locationAccuracy != null}
							<span class="pv-meta">Accuracy ±{Math.round(photo.locationAccuracy)} m</span>
						{/if}
						{#if mapsUrl()}
							<a class="pv-map" href={mapsUrl()!} target="_blank" rel="noopener">Open in Maps ↗</a>
						{/if}
					</div>
				</div>
			{/if}

			<div class="pv-comment">
				<div class="pv-comment-head">
					<span class="pv-label">Comment</span>
					{#if canEditComment && !editing}
						<button class="pv-edit-btn" onclick={startEdit} disabled={saving}>✎ {photo.comment ? 'Edit' : 'Add'}</button>
					{/if}
				</div>
				{#if editing}
					<!-- svelte-ignore a11y_autofocus -->
					<textarea class="pv-textarea" bind:value={comment} placeholder="Add a note about this photo…" autofocus></textarea>
					{#if error}
						<p class="pv-error">{error}</p>
					{/if}
					<div class="pv-comment-actions">
						<button class="btn btn-primary btn-sm" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
						<button class="btn btn-outline btn-sm" onclick={cancelEdit} disabled={saving}>Cancel</button>
					</div>
				{:else if photo.comment}
					<p class="pv-comment-text">{photo.comment}</p>
				{:else}
					<p class="pv-comment-text pv-comment-empty">{canEditComment ? 'No comment added.' : 'No comment.'}</p>
				{/if}
			</div>
		</div>
	{/if}
</Modal>

<style>
	.pv-img {
		display: block;
		width: 100%;
		max-height: 52vh;
		object-fit: contain;
		background: #10142a;
		border-radius: var(--radius-sm);
		margin-bottom: 14px;
	}
	.pv-details {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.pv-row {
		display: flex;
		gap: 10px;
		align-items: flex-start;
	}
	.pv-icon {
		flex-shrink: 0;
		width: 24px;
		text-align: center;
	}
	.pv-label {
		display: block;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin-bottom: 1px;
	}
	.pv-value {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
		word-break: break-word;
	}
	.pv-meta {
		display: block;
		font-size: 0.78rem;
		color: var(--text-secondary);
		margin-top: 1px;
	}
	.pv-map {
		display: inline-block;
		margin-top: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--info);
		text-decoration: none;
	}
	.pv-map:hover { text-decoration: underline; }

	.pv-comment {
		border-top: 1px solid var(--border);
		padding-top: 12px;
	}
	.pv-comment-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
	}
	.pv-edit-btn {
		border: none;
		background: none;
		color: var(--primary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		padding: 2px 4px;
	}
	.pv-edit-btn:disabled { opacity: 0.5; cursor: default; }
	.pv-textarea {
		width: 100%;
		min-height: 76px;
		resize: vertical;
	}
	.pv-comment-actions {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}
	.pv-error {
		color: var(--danger);
		font-size: 0.8rem;
		margin-top: 6px;
	}
	.pv-comment-text {
		font-size: 0.9rem;
		white-space: pre-wrap;
		word-break: break-word;
		color: var(--text);
	}
	.pv-comment-empty {
		color: var(--text-muted);
		font-style: italic;
	}
</style>
