<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// --- Tabs ---
	let activeTab = $state<'new' | 'saved'>('new');

	// --- Clients ---
	let clients = $state<Array<{id: string; name: string; phone: string | null; email: string | null; address: string | null}>>([]);

	// --- Saved quotes ---
	let quotes = $state<Array<{id: string; clientName: string; clientPhone?: string; address?: string; squareFootage: number; total: number; status: string; quoteLineItems: Array<any>; quoteAddons: Array<any>; createdAt: string}>>([]);
	let loadingQuotes = $state(true);
	let convertingId = $state<string | null>(null);

	// --- Query string param: ?edit=quoteId ---
	let editingId = $state<string | null>(null);

	// --- New quote form state ---
	let selectedClientId = $state('');
	let clientName = $state('');
	let clientPhone = $state('');
	let address = $state('');
	let squareFootage = $state(0);
	let ratePerSqFt = $state(0.15);
	let workerCount = $state(1);
	let saving = $state(false);

	// Line item catalog from DB
	let lineItemCatalog = $state<Array<{id: string; name: string; basePrice: number; hasSizeMod: boolean; sizeSmall?: number; sizeMedium?: number; sizeLarge?: number}>>([]);

	onMount(async () => {
		await Promise.all([loadQuotes(), loadClients()]);
		try {
			const res = await fetch('/api/line-items');
			const items = await res.json();
			lineItemCatalog = items.map((li: any) => ({
				id: li.id,
				name: li.name,
				basePrice: li.basePrice,
				hasSizeMod: li.hasSizeMod ?? false,
				sizeSmall: li.sizeSmall ?? undefined,
				sizeMedium: li.sizeMedium ?? undefined,
				sizeLarge: li.sizeLarge ?? undefined,
			}));
		} catch {
			// Fallback catalog
			lineItemCatalog = [
				{ id: '1', name: 'Bathroom', basePrice: 35, hasSizeMod: true, sizeSmall: 25, sizeMedium: 35, sizeLarge: 50 },
				{ id: '2', name: 'Kitchen', basePrice: 40, hasSizeMod: true, sizeSmall: 30, sizeMedium: 40, sizeLarge: 60 },
				{ id: '3', name: 'Break Room', basePrice: 35, hasSizeMod: false },
				{ id: '4', name: 'Office Area', basePrice: 30, hasSizeMod: false },
				{ id: '5', name: 'Hallway / Corridor', basePrice: 20, hasSizeMod: false },
				{ id: '6', name: 'Lobby / Reception', basePrice: 35, hasSizeMod: false },
				{ id: '7', name: 'Window Cleaning', basePrice: 50, hasSizeMod: true, sizeSmall: 40, sizeMedium: 50, sizeLarge: 80 },
				{ id: '8', name: 'Floor Waxing', basePrice: 75, hasSizeMod: true, sizeSmall: 50, sizeMedium: 75, sizeLarge: 120 },
				{ id: '9', name: 'Carpet Cleaning', basePrice: 60, hasSizeMod: true, sizeSmall: 40, sizeMedium: 60, sizeLarge: 100 },
			];
		}
	});

	async function loadClients() {
		try {
			const res = await fetch('/api/clients');
			if (res.ok) clients = await res.json();
		} catch (e) {
			console.error('Failed to load clients', e);
		}
	}

	async function loadQuotes() {
		loadingQuotes = true;
		try {
			const res = await fetch('/api/quotes');
			quotes = await res.json();
		} catch (e) {
			console.error('Failed to load quotes', e);
		} finally {
			loadingQuotes = false;
		}
	}

	function onClientSelect(event: Event) {
		const select = event.target as HTMLSelectElement;
		const id = select.value;
		selectedClientId = id;
		if (id) {
			const client = clients.find(c => c.id === id);
			if (client) {
				clientName = client.name;
				clientPhone = client.phone || '';
				address = client.address || '';
			}
		}
	}

	async function editQuote(quoteId: string) {
		try {
			const res = await fetch(`/api/quotes/${quoteId}`);
			if (!res.ok) throw new Error('Not found');
			const q = await res.json();
			editingId = q.id;
			clientName = q.clientName || '';
			clientPhone = q.clientPhone || '';
			address = q.address || '';
			squareFootage = q.squareFootage || 0;
			ratePerSqFt = q.ratePerSqFt || 0.15;
			workerCount = q.workerCount || 1;
			selectedItems = (q.quoteLineItems || []).map((li: any) => ({
				id: li.id,
				name: li.name,
				price: li.price,
				size: li.size || null,
				quantity: li.quantity || 1,
			}));
			customItems = (q.quoteAddons || []).map((a: any) => ({
				name: a.name,
				price: a.price,
			}));
			activeTab = 'new';
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (e) {
			console.error('Failed to load quote for editing', e);
			alert('Failed to load quote.');
		}
	}

	async function convertToJob(quoteId: string) {
		convertingId = quoteId;
		try {
			const res = await fetch(`/api/quotes/${quoteId}/convert`, { method: 'POST' });
			if (!res.ok) throw new Error(await res.text());
			const job = await res.json();
			goto(`/jobs/${job.id}`);
		} catch (e) {
			console.error('Conversion failed', e);
			alert('Failed to create job from quote.');
		} finally {
			convertingId = null;
		}
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short', day: 'numeric', year: 'numeric'
		});
	}

	function statusBadgeClass(status: string) {
		switch (status) {
			case 'draft': return 'badge-quote';
			case 'sent': return 'badge-active';
			case 'accepted': return 'badge-complete';
			case 'rejected': return 'badge-danger';
			default: return '';
		}
	}

	// Selected line items on this quote
	let selectedItems: Array<{id: string; name: string; price: number; size: string | null; quantity: number}> = $state([]);
	let showSizePicker: string | null = $state(null);

	// Custom add-on items
	let customItems: Array<{name: string; price: number}> = $state([]);
	let customName = $state('');
	let customPrice = $state(0);

	// --- Derived total ---
	let baseTotal = $derived(squareFootage * ratePerSqFt);
	let lineItemsTotal = $derived(selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
	let addonsTotal = $derived(customItems.reduce((sum, item) => sum + item.price, 0));
	let grandTotal = $derived(baseTotal + lineItemsTotal + addonsTotal);

	// --- Actions ---
	function toggleItem(item: {id: string; name: string; basePrice: number; hasSizeMod: boolean; sizeSmall?: number; sizeMedium?: number; sizeLarge?: number}) {
		let existing = selectedItems.find(i => i.id === item.id);
		if (existing) {
			selectedItems = selectedItems.filter(i => i.id !== item.id);
		} else if (item.hasSizeMod) {
			showSizePicker = item.id;
		} else {
			selectedItems = [...selectedItems, { id: item.id, name: item.name, price: item.basePrice, size: null, quantity: 1 }];
		}
	}

	function selectSize(item: {id: string; name: string; sizeSmall?: number; sizeMedium?: number; sizeLarge?: number}, size: string) {
		let price = size === 'Small' ? (item.sizeSmall ?? 0) : size === 'Medium' ? (item.sizeMedium ?? 0) : (item.sizeLarge ?? 0);
		selectedItems = [...selectedItems, { id: item.id, name: `${item.name} (${size})`, price, size, quantity: 1 }];
		showSizePicker = null;
	}

	function addCustomItem() {
		if (!customName || customPrice <= 0) return;
		customItems = [...customItems, { name: customName, price: customPrice }];
		customName = '';
		customPrice = 0;
	}

	function removeCustomItem(index: number) {
		customItems = customItems.filter((_, i) => i !== index);
	}

	function changeQty(itemId: string, delta: number) {
		selectedItems = selectedItems.map(i => {
			if (i.id === itemId) {
				let newQty = Math.max(1, i.quantity + delta);
				return { ...i, quantity: newQty, price: (i.price / i.quantity) * newQty };
			}
			return i;
		});
	}

	async function saveQuote() {
		saving = true;
		try {
			const body = {
				clientId: selectedClientId || undefined,
				clientName: clientName || 'New Client',
				clientPhone,
				address: address || 'TBD',
				squareFootage,
				ratePerSqFt,
				workerCount,
				status: 'draft',
				total: grandTotal,
				lineItems: selectedItems.map(i => ({
					name: i.name,
					price: i.price,
					size: i.size,
					quantity: i.quantity,
				})),
				addons: customItems.map(a => ({
					name: a.name,
					price: a.price,
				})),
			};

			const method = editingId ? 'PATCH' : 'POST';
			const url = editingId ? `/api/quotes/${editingId}` : '/api/quotes';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!res.ok) throw new Error(await res.text());
			const quote = await res.json();
			alert(`Quote ${editingId ? 'updated' : 'saved'}! #${quote.id.slice(0, 8)} — $${grandTotal.toFixed(2)}`);
			resetForm();
			await loadQuotes();
		} catch (e) {
			console.error('Save failed', e);
			alert('Failed to save. Check the console.');
		} finally {
			saving = false;
		}
	}

	function resetForm() {
		editingId = null;
		selectedClientId = '';
		clientName = ''; clientPhone = ''; address = '';
		squareFootage = 0; ratePerSqFt = 0.15; workerCount = 1;
		selectedItems = []; customItems = [];
	}
</script>

<!-- Tab Navigation -->
<div style="display: flex; gap: 4px; margin-bottom: 16px;">
	<button
		class="btn {activeTab === 'new' ? 'btn-primary' : 'btn-outline'}"
		onclick={() => activeTab = 'new'}
	>✚ {editingId ? 'Edit Quote' : 'New Quote'}</button>
	<button
		class="btn {activeTab === 'saved' ? 'btn-primary' : 'btn-outline'}"
		onclick={() => activeTab = 'saved'}
	>📋 Saved Quotes ({quotes.length})</button>
</div>

<!-- SAVED QUOTES TAB -->
{#if activeTab === 'saved'}
	<div class="card">
		<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
			<h2 style="font-size: 1.2rem;">Saved Quotes</h2>
			<button class="btn btn-outline btn-sm" onclick={loadQuotes}>🔄 Refresh</button>
		</div>

		{#if loadingQuotes}
			<p class="text-secondary" style="text-align: center; padding: 24px;">Loading...</p>
		{:else if quotes.length === 0}
			<div style="text-align: center; padding: 32px;">
				<p class="text-secondary mb-4">No quotes yet.</p>
				<button class="btn btn-primary" onclick={() => activeTab = 'new'}>
					✚ Create Your First Quote
				</button>
			</div>
		{:else}
			<div class="table-wrapper">
				<table style="width: 100%; border-collapse: collapse;">
					<thead>
						<tr style="border-bottom: 2px solid var(--border, #e0e0e0); text-align: left;">
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Date</th>
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Client</th>
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Address</th>
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Total</th>
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Status</th>
							<th style="padding: 8px 12px; font-size: 0.8rem; color: var(--text-secondary);">Action</th>
						</tr>
					</thead>
					<tbody>
						{#each quotes as quote}
							<tr style="border-bottom: 1px solid var(--border, #eee);">
								<td style="padding: 10px 12px; font-size: 0.85rem;">{formatDate(quote.createdAt)}</td>
								<td style="padding: 10px 12px; font-size: 0.85rem; font-weight: 500;">{quote.clientName || '—'}</td>
								<td style="padding: 10px 12px; font-size: 0.85rem; color: var(--text-secondary);">{quote.address || '—'}</td>
								<td style="padding: 10px 12px; font-size: 0.85rem; font-weight: 600;">${quote.total.toFixed(2)}</td>
								<td style="padding: 10px 12px;">
									<span class="badge {statusBadgeClass(quote.status)}" style="font-size: 0.75rem;">
										{quote.status.toUpperCase()}
									</span>
								</td>
								<td style="padding: 10px 12px; white-space: nowrap;">
									{#if quote.status === 'accepted' || quote.status === 'rejected'}
										<span class="text-secondary" style="font-size: 0.8rem;">✓ Done</span>
									{:else}
										<button class="btn btn-outline btn-sm" onclick={() => editQuote(quote.id)} style="margin-right: 4px;">Edit</button>
										<button
											class="btn btn-success btn-sm"
											onclick={() => convertToJob(quote.id)}
											disabled={convertingId === quote.id}
										>
											{convertingId === quote.id ? '⏳' : '🔨 Create Job'}
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

<!-- NEW QUOTE TAB -->
{:else}
	<div class="card">
		<h2 style="margin-bottom: 12px;">{editingId ? 'Edit Quote' : 'New Quote'}</h2>

		<!-- Client Select -->
		{#if clients.length > 0}
			<div class="mb-4">
				<label for="clientSelect">Select Client (optional)</label>
				<select id="clientSelect" value={selectedClientId} onchange={onClientSelect}>
					<option value="">— Type manually below —</option>
					{#each clients as c}
						<option value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>
					{/each}
				</select>
			</div>
		{/if}

		<!-- Client Info -->
		<div class="row mb-4">
			<div class="col">
				<label for="clientName">Client / Business Name</label>
				<input id="clientName" bind:value={clientName} placeholder="Acme Corp" />
			</div>
			<div class="col">
				<label for="clientPhone">Phone</label>
				<input id="clientPhone" bind:value={clientPhone} placeholder="(555) 123-4567" />
			</div>
		</div>
		<div class="mb-4">
			<label for="address">Site Address</label>
			<input id="address" bind:value={address} placeholder="123 Main St, Columbus, OH" />
		</div>

		<!-- Square Footage + Rate -->
		<div class="row mb-4">
			<div class="col">
				<label for="sqft">Square Footage</label>
				<input id="sqft" type="number" bind:value={squareFootage} min="0" placeholder="2500" />
			</div>
			<div class="col">
				<label for="rate">Rate per Sq Ft ($)</label>
				<input id="rate" type="number" bind:value={ratePerSqFt} step="0.01" min="0" />
			</div>
			<div class="col">
				<label for="workers">Est. Workers</label>
				<input id="workers" type="number" bind:value={workerCount} min="1" />
			</div>
		</div>
		<div class="text-secondary mb-4">
			Base: {squareFootage.toLocaleString()} sq ft × ${ratePerSqFt.toFixed(2)} = <strong>${baseTotal.toFixed(2)}</strong>
		</div>

		<!-- Line Items -->
		<h3 style="margin-bottom: 8px; font-size: 1rem;">Areas / Services</h3>
		<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; position: relative;">
			{#each lineItemCatalog as item}
				{@const selected = selectedItems.find(i => i.id === item.id)}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<label class="checkbox-tile" class:checked={!!selected} onclick={() => toggleItem(item)} onkeydown={(e) => e.key === 'Enter' && toggleItem(item)}>
					<input type="checkbox" checked={!!selected} tabindex="-1" />
					{item.name}
					<span class="text-secondary" style="font-weight: 400;">— ${item.basePrice}</span>
				</label>
			{/each}
		</div>

		<!-- Size Picker (popup) -->
		{#if showSizePicker}
			{@const sizingItem = lineItemCatalog.find(i => i.id === showSizePicker)}
			{#if sizingItem}
				<div class="size-popup">
					<button onclick={() => selectSize(sizingItem, 'Small')}>Small (${sizingItem.sizeSmall})</button>
					<button onclick={() => selectSize(sizingItem, 'Medium')}>Medium (${sizingItem.sizeMedium})</button>
					<button onclick={() => selectSize(sizingItem, 'Large')}>Large (${sizingItem.sizeLarge})</button>
					<button onclick={() => showSizePicker = null} class="btn-outline btn-sm">Cancel</button>
				</div>
			{/if}
		{/if}

		<!-- Selected Items Breakdown -->
		{#if selectedItems.length > 0}
			<div class="card" style="background: #f8f9fa; margin-bottom: 12px;">
				<h4 style="font-size: 0.9rem; margin-bottom: 8px;">Selected Items</h4>
				{#each selectedItems as item}
					<div class="task-row">
						<span class="task-desc">{item.name}</span>
						<div class="row" style="gap: 6px;">
							<button class="btn btn-outline btn-sm" onclick={() => changeQty(item.id, -1)}>−</button>
							<span style="min-width: 20px; text-align: center;">{item.quantity}</span>
							<button class="btn btn-outline btn-sm" onclick={() => changeQty(item.id, 1)}>+</button>
						</div>
						<span style="min-width: 60px; text-align: right; font-weight: 600;">${item.price.toFixed(2)}</span>
						<button class="btn btn-sm btn-danger" style="padding: 2px 8px;"
							onclick={() => selectedItems = selectedItems.filter(i => i.id !== item.id)}>×</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Custom Add-Ons -->
		<h3 style="margin-bottom: 8px; font-size: 1rem;">Custom Add-Ons</h3>
		<div class="row mb-2">
			<div class="col">
				<input placeholder="Item name (e.g. Inside Fridge)" bind:value={customName} />
			</div>
			<div class="col" style="max-width: 120px;">
				<input type="number" placeholder="Price" bind:value={customPrice} min="0" step="0.01" />
			</div>
			<button class="btn btn-primary btn-sm" onclick={addCustomItem}>+ Add</button>
		</div>

		{#if customItems.length > 0}
			<div class="card" style="background: #f8f9fa; margin-bottom: 12px;">
				{#each customItems as item, i}
					<div class="task-row">
						<span class="task-desc">{item.name}</span>
						<span style="font-weight: 600;">${item.price.toFixed(2)}</span>
						<button class="btn btn-sm btn-danger" style="padding: 2px 8px;" onclick={() => removeCustomItem(i)}>×</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Running Total -->
		<div class="total-box mt-4">
			<div class="total-label">Running Total</div>
			<div class="total-amount">${grandTotal.toFixed(2)}</div>
			<div class="total-label" style="margin-top: 4px;">
				Base: ${baseTotal.toFixed(2)} + Areas: ${lineItemsTotal.toFixed(2)} + Add-ons: ${addonsTotal.toFixed(2)}
			</div>
		</div>

		<div class="row mt-4" style="justify-content: flex-end; gap: 8px;">
			<button class="btn btn-outline" onclick={resetForm}>Reset</button>
			<button class="btn btn-success" onclick={saveQuote} disabled={saving}>
				{saving ? 'Saving...' : editingId ? '💾 Update Quote' : '💾 Save Quote'}
			</button>
		</div>
	</div>
{/if}
