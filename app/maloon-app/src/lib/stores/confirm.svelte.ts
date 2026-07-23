/**
 * Global confirm dialog — replaces blocking `confirm()` calls for
 * destructive/irreversible actions. Mount a single <ConfirmDialogHost />
 * in the root layout, then `await confirmAction({...})` from anywhere.
 */

export type ConfirmOptions = {
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	/** Styles the confirm button as destructive (red) instead of primary (green). */
	danger?: boolean;
};

type ConfirmState = ConfirmOptions & {
	open: boolean;
	resolve: ((value: boolean) => void) | null;
};

export const confirmState = $state<ConfirmState>({
	open: false,
	title: '',
	description: '',
	confirmText: 'Confirm',
	cancelText: 'Cancel',
	danger: false,
	resolve: null
});

export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
	return new Promise((resolve) => {
		confirmState.title = opts.title;
		confirmState.description = opts.description ?? '';
		confirmState.confirmText = opts.confirmText ?? 'Confirm';
		confirmState.cancelText = opts.cancelText ?? 'Cancel';
		confirmState.danger = opts.danger ?? false;
		confirmState.resolve = resolve;
		confirmState.open = true;
	});
}

export function resolveConfirm(value: boolean) {
	confirmState.open = false;
	confirmState.resolve?.(value);
	confirmState.resolve = null;
}
