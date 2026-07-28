<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	let path = $derived($page.url.pathname);
	let onHome = $derived(path === '/worker');
	let onJobs = $derived(path.startsWith('/worker/jobs'));
	let onProfile = $derived(path.startsWith('/worker/profile'));
</script>

<div class="worker-portal">
	{@render children()}
</div>

<nav class="worker-tabbar">
	<a href="/worker" class:active={onHome}>
		<span class="tab-icon">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></svg>
		</span>
		<span class="tab-label">Home</span>
	</a>
	<a href="/worker/jobs" class:active={onJobs}>
		<span class="tab-icon">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l1.5 1.5L8 5" /><path d="M4 12l1.5 1.5L8 11" /><path d="M4 18l1.5 1.5L8 17" /><path d="M11 6h9" /><path d="M11 12h9" /><path d="M11 18h9" /></svg>
		</span>
		<span class="tab-label">Jobs</span>
	</a>
	<a href="/worker/profile" class:active={onProfile}>
		<span class="tab-icon">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="10" r="3" /><path d="M6.5 19a6 6 0 0 1 11 0" /></svg>
		</span>
		<span class="tab-label">Profile</span>
	</a>
</nav>
