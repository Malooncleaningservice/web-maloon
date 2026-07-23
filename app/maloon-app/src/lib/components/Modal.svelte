<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		bare = false,
		maxWidth = '480px',
		onClose,
		children,
	}: {
		open?: boolean;
		title?: string;
		/** Bare mode skips the card chrome — used for full-bleed content like an image viewer. */
		bare?: boolean;
		maxWidth?: string;
		onClose?: () => void;
		children?: Snippet;
	} = $props();

	function handleOpenChange(v: boolean) {
		open = v;
		if (!v) onClose?.();
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Portal>
		<Dialog.Overlay class="modal-overlay" />
		<Dialog.Content class={bare ? 'modal-content modal-content-bare' : 'modal-content'} style={bare ? undefined : `max-width: ${maxWidth}`}>
			{#if !bare}
				<div class="modal-header">
					{#if title}
						<Dialog.Title class="modal-title">{title}</Dialog.Title>
					{/if}
					<Dialog.Close class="modal-close" aria-label="Close">✕</Dialog.Close>
				</div>
			{:else}
				<Dialog.Close class="modal-close modal-close-bare" aria-label="Close">✕</Dialog.Close>
			{/if}
			<div class={bare ? 'modal-body-bare' : 'modal-body'}>
				{@render children?.()}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.modal-overlay) {
		position: fixed;
		inset: 0;
		background: rgba(20, 30, 20, 0.55);
		z-index: 100;
		animation: modal-fade-in var(--transition) ease-out;
	}
	:global(.modal-content) {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: calc(100vw - 32px);
		background: var(--surface);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: 101;
		max-height: calc(100dvh - 48px);
		overflow-y: auto;
	}
	:global(.modal-content-bare) {
		background: none;
		box-shadow: none;
		width: 100vw;
		max-width: 100vw;
		max-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border);
	}
	:global(.modal-title) {
		font-size: var(--text-lg);
		font-weight: 700;
		color: var(--primary-dark);
	}
	:global(.modal-close) {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border: none;
		background: var(--bg);
		border-radius: 50%;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	:global(.modal-close-bare) {
		position: fixed;
		top: 16px;
		right: 16px;
		background: rgba(255, 255, 255, 0.15);
		color: #fff;
		width: 36px;
		height: 36px;
		font-size: 1rem;
		z-index: 102;
	}
	.modal-body { padding: 20px; }
	.modal-body-bare {
		display: flex;
		align-items: center;
		justify-content: center;
		max-width: 92vw;
		max-height: 92dvh;
	}
	.modal-body-bare :global(img) {
		max-width: 92vw;
		max-height: 92dvh;
		border-radius: var(--radius-sm);
		object-fit: contain;
	}
	@keyframes modal-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
