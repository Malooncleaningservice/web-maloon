<script lang="ts">
	import Modal from './Modal.svelte';
	import { confirmState, resolveConfirm } from '$lib/stores/confirm.svelte';
</script>

<Modal
	open={confirmState.open}
	title={confirmState.title}
	maxWidth="400px"
	onClose={() => resolveConfirm(false)}
>
	{#if confirmState.description}
		<p class="confirm-desc">{confirmState.description}</p>
	{/if}
	<div class="confirm-actions">
		<button class="btn btn-outline" onclick={() => resolveConfirm(false)}>
			{confirmState.cancelText}
		</button>
		<button
			class={confirmState.danger ? 'btn btn-danger' : 'btn btn-primary'}
			onclick={() => resolveConfirm(true)}
		>
			{confirmState.confirmText}
		</button>
	</div>
</Modal>

<style>
	.confirm-desc {
		color: var(--text-secondary);
		font-size: var(--text-sm);
		margin-bottom: 16px;
		line-height: 1.5;
	}
	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
</style>
