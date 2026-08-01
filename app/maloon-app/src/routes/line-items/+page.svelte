<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { confirmAction } from '$lib/stores/confirm.svelte';

	type LineItem = {
		id: string;
		name: string;
		description?: string | null;
		basePrice: number;
		hasSizeMod: boolean;
		sizeSmall?: number | null;
		sizeMedium?: number | null;
		sizeLarge?: number | null;
		isActive: boolean;
	};

	let items = $state<LineItem[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingId = $state<string | null>(null);
	let saving = $state(false);

	let form = $state({
		name: '',
		description: '',
		basePrice: 0,
		hasSizeMod: false,
		sizeSmall: 0,
		sizeMedium: 0,
		sizeLarge: 0,
	});

	onMount(async () => {
		await loadItems();
	});

	async function loadItems() {
		loading = true;
		try {
			const res = await fetch('/api/line-items?all=true');
			if (res.ok) items = await res.json();
		} catch (e) {
			console.error('Failed to load line items', e);
			toast.error('Failed to load catalog.');
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		editingId = null;
		form = { name: '', description: '', basePrice: 0, hasSizeMod: false, sizeSmall: 0, sizeMedium: 0, sizeLarge: 0 };
	}

	function startEdit(item: LineItem) {
		editingId = item.id;
		form = {
			name: item.name,
			description: item.description ?? '',
			basePrice: item.basePrice,
			hasSizeMod: item.hasSizeMod,
			sizeSmall: item.sizeSmall ?? 0,
			sizeMedium: item.sizeMedium ?? 0,
			sizeLarge: item.sizeLarge ?? 0,
		};
		showForm = true;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	async function saveItem() {
		if (!form.name.trim()) {
			toast.error('Name is required.');
			return;
		}
		saving = true;
		try {
			const body = {
				name: form.name,
				description: form.description || undefined,
				basePrice: form.basePrice,
				hasSizeMod: form.hasSizeMod,
				sizeSmall: form.hasSizeMod ? form.sizeSmall : undefined,
				sizeMedium: form.hasSizeMod ? form.sizeMedium : undefined,
				sizeLarge: form.hasSizeMod ? form.sizeLarge : undefined,
			};
			const method = editingId ? 'PATCH' : 'POST';
			const url = editingId ? `/api/line-items/${editingId}` : '/api/line-items';
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || 'Save failed');
			}
			toast.success(editingId ? 'Item updated.' : 'Item added to catalog.');
			showForm = false;
			resetForm();
			await loadItems();
		} catch (e) {
			console.error('Save line item failed', e);
			toast.error(e instanceof Error ? e.message : 'Failed to save.');
		} finally {
			saving = false;
		}
	}

	async function toggleActive(item: LineItem) {
		try {
			await fetch(`/api/line-items/${item.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !item.isActive }),
			});
			items = items.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i);
			toast.success(item.isActive ? 'Item deactivated.' : 'Item reactivated.');
		} catch (e) {
			console.error('Toggle failed', e);
			toast.error('Failed to update item.');
		}
	}

	async function deleteItem(item: LineItem) {
		const ok = await confirmAction({
			title: `Remove "${item.name}" from catalog?`,
			description: 'The item will be deactivated (not permanently deleted) so existing quotes keep their references.',
			confirmText: 'Deactivate',
			danger: true,
		});
		if (!ok) return;
		try {
			await fetch(`/api/line-items/${item.id}`, { method: 'DELETE' });
			items = items.map(i => i.id === item.id ? { ...i, isActive: false } : i);
			toast.success('Item removed from catalog.');
		} catch (e) {
			console.error('Delete failed', e);
			toast.error('Failed to remove item.');
		}
	}
</script>

<a href="/" style="color: var(--primary); text-decoration: none; font-size: 0.9rem; margin-bottom: 12px; display: inline-block;">← Dashboard</a>

<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
	<h2 style="font-size: 1.3rem;">Service Catalog</h2>
	<button class="btn btn-primary" onclick={() => { showForm = !showForm; if (!showForm) resetForm(); }}>
		{showForm ? 'Cancel' : '+ New Item'}
	</button>
</div>

<p class="text-secondary" style="margin-bottom: 16px; font-size: 0.85rem;">
	These items appear in the quote builder. Deactivated items stay on existing quotes but won't show for new ones.
</p>

{#if showForm}
	<div class="card">
		<h3 style="margin-bottom: 12px;">{editingId ? 'Edit Item' : 'New Catalog Item'}</h3>
		<div class="mb-2"><label for="liName">Name</label><input id="liName" bind:value={form.name} placeholder="e.g. Bathroom" /></div>
		<div class="mb-2"><label for="liDesc">Description (optional)</label><input id="liDesc" bind:value={form.description} placeholder="e.g. Full sanitize and restock" /></div>
		<div class="row mb-2">
			<div class="col"><label for="liBase">Base Price ($)</label><input id="liBase" type="number" step="0.01" min="0" bind:value={form.basePrice} /></div>
			<div class="col" style="display: flex; align-items: flex-end; gap: 8px;">
				<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 400; margin-bottom: 0;">
					<input type="checkbox" bind:checked={form.hasSizeMod} style="width: auto;" />
					Has size options (S/M/L)
				</label>
			</div>
		</div>
		{#if form.hasSizeMod}
			<div class="row mb-4">
				<div class="col"><label for="liS">Small ($)</label><input id="liS" type="number" step="0.01" min="0" bind:value={form.sizeSmall} /></div>
				<div class="col"><label for="liM">Medium ($)</label><input id="liM" type="number" step="0.01" min="0" bind:value={form.sizeMedium} /></div>
				<div class="col"><label for="liL">Large ($)</label><input id="liL" type="number" step="0.01" min="0" bind:value={form.sizeLarge} /></div>
			</div>
		{:else}
			<div class="mb-4"></div>
		{/if}
		<button class="btn btn-success" onclick={saveItem} disabled={saving}>
			{saving ? 'Saving...' : editingId ? '💾 Update Item' : '💾 Add Item'}
		</button>
	</div>
{/if}

{#if loading}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary">Loading catalog...</p>
	</div>
{:else if items.length === 0}
	<div class="card" style="text-align: center; padding: 40px;">
		<p class="text-secondary" style="margin-bottom: 12px;">No catalog items yet.</p>
		<button class="btn btn-primary btn-sm" onclick={() => showForm = true}>+ Add Your First Item</button>
	</div>
{:else}
	<div class="table-wrapper">
		<table>
			<thead>
				<tr>
					<th>Name</th>
					<th>Base Price</th>
					<th>Sizes</th>
					<th>Status</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each items as item}
					<tr style={!item.isActive ? 'opacity: 0.55;' : ''}>
						<td style="font-weight: 500;">
							{item.name}
							{#if item.description}<br /><span class="text-secondary" style="font-size: 0.75rem; font-weight: 400;">{item.description}</span>{/if}
						</td>
						<td>${item.basePrice.toFixed(2)}</td>
						<td style="font-size: 0.85rem;">
							{#if item.hasSizeMod}
								S ${item.sizeSmall ?? 0} · M ${item.sizeMedium ?? 0} · L ${item.sizeLarge ?? 0}
							{:else}
								—
							{/if}
						</td>
						<td>
							<span class="badge {item.isActive ? 'badge-complete' : 'badge-pending'}">
								{item.isActive ? 'Active' : 'Inactive'}
							</span>
						</td>
						<td style="white-space: nowrap;">
							<button class="btn btn-outline btn-sm" onclick={() => startEdit(item)} style="margin-right: 4px;">Edit</button>
							<button class="btn btn-outline btn-sm" onclick={() => toggleActive(item)} style="margin-right: 4px;">
								{item.isActive ? 'Deactivate' : 'Reactivate'}
							</button>
							{#if item.isActive}
								<button class="btn btn-sm btn-outline" onclick={() => deleteItem(item)} title="Remove from catalog">🗑</button>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
