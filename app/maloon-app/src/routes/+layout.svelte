<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="app-shell">
	<header class="top-nav">
		<a href="/" class="logo">Maloon Service</a>
		<nav>
			<a href="/quotes">Quotes</a>
			<a href="/jobs">Jobs</a>
			<a href="/personnel">Personnel</a>
		</nav>
	</header>
	<main>
		{@render children()}
	</main>
</div>
