<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { children } = $props();

	let user = $state<{
		id: string;
		email: string | null;
		role: string;
		displayName: string | null;
		worker?: { firstName: string; lastName: string } | null;
	} | null>(null);

	let notifications = $state<Array<{ id: string; message: string; link?: string; read: boolean }>>([]);
	let unreadCount = $state(0);
	let showNotifs = $state(false);
	let loadingUser = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/auth/me');
			if (res.ok) {
				user = await res.json();
				if (user && user.role === 'admin') {
					await loadNotifications();
				}
			}
		} catch {
			// not logged in
		} finally {
			loadingUser = false;
		}
	});

	async function loadNotifications() {
		try {
			const res = await fetch('/api/notifications');
			if (res.ok) {
				notifications = await res.json();
				unreadCount = notifications.filter(n => !n.read).length;
			}
		} catch { /* ignore */ }
	}

	async function markRead(id: string) {
		await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
		notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
		unreadCount = notifications.filter(n => !n.read).length;
	}

	async function markAllRead() {
		await fetch('/api/notifications', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ markAllRead: true })
		});
		notifications = notifications.map(n => ({ ...n, read: true }));
		unreadCount = 0;
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		user = null;
		await goto('/login');
	}

	function closeNotifs() {
		showNotifs = false;
	}

	function userDisplayName(): string {
		if (user?.displayName) return user.displayName;
		if (user?.worker) return `${user.worker.firstName} ${user.worker.lastName}`;
		if (user?.email) return user.email;
		return 'User';
	}
</script>

{#if loadingUser}
	<div class="app-shell">
		<main style="text-align: center; padding: 80px 20px;">
			<p class="text-secondary">Loading...</p>
		</main>
	</div>
{:else}
	<div class="app-shell">
		{#if user}
			<header class="top-nav">
				<a href="/" class="logo">Maloon Service</a>
				<nav>
					{#if user.role === 'admin'}
						<a href="/quotes">Quotes</a>
						<a href="/jobs">Jobs</a>
						<a href="/personnel">Personnel</a>
					{:else}
						<a href="/worker">Dashboard</a>
						<a href="/worker/profile">Profile</a>
					{/if}
				</nav>
				<div style="display: flex; align-items: center; gap: 12px; margin-left: auto;">
					<!-- Notification bell (admin only) -->
					{#if user.role === 'admin'}
						<div style="position: relative;">
							<button
								onclick={() => { showNotifs = !showNotifs; if (showNotifs) loadNotifications(); }}
								style="background: none; border: none; cursor: pointer; font-size: 1.2rem; position: relative; padding: 4px;"
								aria-label="Notifications"
							>
								🔔
								{#if unreadCount > 0}
									<span style="position: absolute; top: 0; right: 0; background: var(--danger); color: #fff; font-size: 0.65rem; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">
										{unreadCount > 9 ? '9+' : unreadCount}
									</span>
								{/if}
							</button>
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							{#if showNotifs}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="notif-dropdown card"
									style="position: absolute; top: 100%; right: 0; width: 320px; max-height: 360px; overflow-y: auto; z-index: 100; padding: 12px;"
									onclick={(e: MouseEvent) => e.stopPropagation()}
								>
									<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
										<strong style="font-size: 0.9rem;">Notifications</strong>
										{#if unreadCount > 0}
											<button class="btn btn-outline btn-sm" onclick={markAllRead}>Mark all read</button>
										{/if}
									</div>
									{#if notifications.length === 0}
										<p class="text-secondary" style="text-align: center; padding: 16px;">No notifications</p>
									{:else}
										{#each notifications as n}
											<div
												class="notif-item"
												style="padding: 8px; border-radius: var(--radius); margin-bottom: 4px; cursor: pointer; background: {n.read ? 'transparent' : '#e8f0fe'};"
												onclick={() => { markRead(n.id); if (n.link) goto(n.link); closeNotifs(); }}
												onkeydown={() => {}}
											>
												<p style="font-size: 0.85rem; margin: 0;">{n.message}</p>
											</div>
										{/each}
									{/if}
								</div>
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div style="position: fixed; inset: 0; z-index: 99;" onclick={closeNotifs} onkeydown={() => {}}></div>
							{/if}
						</div>
					{/if}

					<!-- User name + logout -->
					<div style="display: flex; align-items: center; gap: 8px;">
						<span style="font-size: 0.85rem; font-weight: 500; color: var(--text); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
							{userDisplayName()}
						</span>
						<button class="btn btn-outline btn-sm" onclick={logout}>Logout</button>
					</div>
				</div>
			</header>
		{/if}

		<main>
			{@render children()}
		</main>
	</div>
{/if}

<style>
	.notif-item:hover {
		background: var(--bg) !important;
	}
</style>