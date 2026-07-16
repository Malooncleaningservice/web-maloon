<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();

	let path = $derived($page.url.pathname);
	let onJobs = $derived(path === '/worker' || path.startsWith('/worker/jobs'));
	let onProfile = $derived(path.startsWith('/worker/profile'));
</script>

<div class="worker-portal">
	{@render children()}
</div>

<nav class="worker-tabbar">
	<a href="/worker" class:active={onJobs}>
		<span class="tab-icon">🧹</span>
		<span class="tab-label">Jobs</span>
	</a>
	<a href="/worker/profile" class:active={onProfile}>
		<span class="tab-icon">👤</span>
		<span class="tab-label">Profile</span>
	</a>
</nav>
