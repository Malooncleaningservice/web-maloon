<script lang="ts">
	import { toastState, dismissToast } from '$lib/stores/toast.svelte';

	const icon = { success: '✓', error: '✕', info: 'ℹ' } as const;
</script>

<div class="toast-stack" aria-live="polite">
	{#each toastState.items as t (t.id)}
		<div class="toast toast-{t.kind}" role="status">
			<span class="toast-icon">{icon[t.kind]}</span>
			<span class="toast-message">{t.message}</span>
			<button class="toast-close" onclick={() => dismissToast(t.id)} aria-label="Dismiss">✕</button>
		</div>
	{/each}
</div>

<style>
	.toast-stack {
		position: fixed;
		bottom: 20px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: calc(100vw - 32px);
		max-width: 420px;
	}
	.toast {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-radius: var(--radius);
		box-shadow: var(--shadow-lg);
		font-size: var(--text-sm);
		font-weight: 500;
		animation: toast-in var(--transition) ease-out;
	}
	.toast-icon {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		font-weight: 700;
	}
	.toast-message { flex: 1; }
	.toast-close {
		flex-shrink: 0;
		background: none;
		border: none;
		cursor: pointer;
		font-size: 0.7rem;
		opacity: 0.6;
		padding: 4px;
	}
	.toast-close:hover { opacity: 1; }
	.toast-success { background: var(--success-bg); color: var(--success); }
	.toast-success .toast-icon { background: var(--success); color: #fff; }
	.toast-error { background: var(--danger-bg); color: var(--danger); }
	.toast-error .toast-icon { background: var(--danger); color: #fff; }
	.toast-info { background: var(--info-bg); color: var(--info); }
	.toast-info .toast-icon { background: var(--info); color: #fff; }

	@keyframes toast-in {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@media (min-width: 640px) {
		.toast-stack { left: auto; right: 20px; transform: none; }
	}
</style>
