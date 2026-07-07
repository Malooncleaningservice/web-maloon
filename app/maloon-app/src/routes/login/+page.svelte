<script lang="ts">
	import '../../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let mode = $state<'login' | 'token'>('login');
	let email = $state('');
	let password = $state('');
	let tokenInput = $state('');
	let error = $state('');
	let loading = $state(false);

	// Setup mode (first-time password/email)
	let setupMode = $state(false);
	let setupEmail = $state('');
	let setupPassword = $state('');
	let setupConfirm = $state('');
	let setupError = $state('');

	onMount(() => {
		const search = $page.url.searchParams;
		if (search.get('setup') === '1') {
			setupMode = true;
		}
	});

	async function handleLogin(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Login failed';
				return;
			}
			if (data.mustResetPassword) {
				setupMode = true;
			} else {
				await goto('/');
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function handleTokenLogin(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifierToken: tokenInput }),
			});
			const data = await res.json();
			if (!res.ok) {
				error = data.error || 'Invalid token';
				return;
			}
			setupMode = true;
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function handleSetup(e: Event) {
		e.preventDefault();
		setupError = '';
		if (setupPassword.length < 8) {
			setupError = 'Password must be at least 8 characters';
			return;
		}
		if (setupPassword !== setupConfirm) {
			setupError = 'Passwords do not match';
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/auth/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: setupEmail || undefined, password: setupPassword }),
			});
			const data = await res.json();
			if (!res.ok) {
				setupError = data.error || 'Setup failed';
				return;
			}
			await goto('/');
		} catch {
			setupError = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="login-page" style="min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: var(--bg);">
	<div style="width: 100%; max-width: 400px; padding: 0 16px;">

		<!-- Logo -->
		<div style="text-align: center; margin-bottom: 32px;">
			<h1 style="font-size: 1.5rem; color: var(--primary); margin-bottom: 4px;">Maloon Service</h1>
			<p class="text-secondary">Staff Portal</p>
		</div>

		<!-- Setup Mode (first-time account setup) -->
		{#if setupMode}
			<div class="card">
				<h2 style="margin-bottom: 8px;">🔐 Complete Your Account</h2>
				<p class="text-secondary" style="margin-bottom: 20px;">
					Set your email and create a password to finish setting up your account.
				</p>
				<form onsubmit={handleSetup}>
					{#if setupError}
						<div style="background: #fce8e6; color: var(--danger); padding: 10px 14px; border-radius: var(--radius); margin-bottom: 12px; font-size: 0.85rem;">
							{setupError}
						</div>
					{/if}
					<div class="mb-2">
						<label for="sEmail">Email</label>
						<input id="sEmail" type="email" bind:value={setupEmail} placeholder="your@email.com" />
					</div>
					<div class="mb-2">
						<label for="sPass">New Password</label>
						<input id="sPass" type="password" bind:value={setupPassword} placeholder="8+ characters" />
					</div>
					<div class="mb-4">
						<label for="sConfirm">Confirm Password</label>
						<input id="sConfirm" type="password" bind:value={setupConfirm} placeholder="Re-enter password" />
					</div>
					<button type="submit" class="btn btn-primary" style="width: 100%;" disabled={loading}>
						{loading ? 'Setting up...' : 'Complete Setup →'}
					</button>
				</form>
			</div>
		{:else}
			<!-- Login Form -->
			<div class="card">
				<!-- Tab toggle -->
				<div style="display: flex; border-bottom: 2px solid var(--border); margin-bottom: 20px;">
					<button
						onclick={() => { mode = 'login'; error = ''; }}
						style="flex: 1; padding: 10px; border: none; background: none; font-weight: 600; cursor: pointer; color: {mode === 'login' ? 'var(--primary)' : 'var(--text-secondary)'}; border-bottom: {mode === 'login' ? '2px solid var(--primary)' : '2px solid transparent'}; margin-bottom: -2px;"
					>
						Email Login
					</button>
					<button
						onclick={() => { mode = 'token'; error = ''; }}
						style="flex: 1; padding: 10px; border: none; background: none; font-weight: 600; cursor: pointer; color: {mode === 'token' ? 'var(--primary)' : 'var(--text-secondary)'}; border-bottom: {mode === 'token' ? '2px solid var(--primary)' : '2px solid transparent'}; margin-bottom: -2px;"
					>
						Access Code
					</button>
				</div>

				{#if error}
					<div style="background: #fce8e6; color: var(--danger); padding: 10px 14px; border-radius: var(--radius); margin-bottom: 12px; font-size: 0.85rem;">
						{error}
					</div>
				{/if}

				{#if mode === 'login'}
					<form onsubmit={handleLogin}>
						<div class="mb-2">
							<label for="lemail">Email</label>
							<input id="lemail" type="email" bind:value={email} placeholder="your@email.com" required />
						</div>
						<div class="mb-4">
							<label for="lpass">Password</label>
							<input id="lpass" type="password" bind:value={password} placeholder="Enter password" required />
						</div>
						<button type="submit" class="btn btn-primary" style="width: 100%;" disabled={loading}>
							{loading ? 'Signing in...' : 'Sign In'}
						</button>
					</form>
				{:else}
					<form onsubmit={handleTokenLogin}>
						<p class="text-secondary" style="margin-bottom: 12px;">
							Enter the access code provided by your administrator.
						</p>
						<div class="mb-4">
							<label for="tokenInput">Access Code</label>
							<input
								id="tokenInput"
								bind:value={tokenInput}
								placeholder="e.g. MLN-A3X9KM"
								style="font-family: monospace; font-size: 1.2rem; text-align: center; letter-spacing: 2px;"
								required
							/>
						</div>
						<button type="submit" class="btn btn-primary" style="width: 100%;" disabled={loading}>
							{loading ? 'Verifying...' : 'Continue'}
						</button>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.login-page {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
	.login-page :global(body) {
		background: var(--bg);
	}
</style>