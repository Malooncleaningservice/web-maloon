/**
 * Global toast notifications — replaces blocking `alert()` calls for
 * success/error feedback. Mount a single <Toaster /> in the root layout,
 * then call `toast.success(...)` / `toast.error(...)` from anywhere.
 */

type ToastKind = 'success' | 'error' | 'info';

type ToastItem = {
	id: number;
	kind: ToastKind;
	message: string;
};

export const toastState = $state<{ items: ToastItem[] }>({ items: [] });

let nextId = 1;

function push(kind: ToastKind, message: string, duration = 4500) {
	const id = nextId++;
	toastState.items.push({ id, kind, message });
	setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id: number) {
	const idx = toastState.items.findIndex((t) => t.id === id);
	if (idx !== -1) toastState.items.splice(idx, 1);
}

export const toast = {
	success: (message: string) => push('success', message),
	error: (message: string) => push('error', message),
	info: (message: string) => push('info', message)
};
