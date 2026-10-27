<script lang="ts">
	import { page } from '$app/state';

	const failures = $derived(page.error?.failures ?? []);
</script>

<svelte:head>
	<title>エラー - 筑波大学 自販機 Map</title>
</svelte:head>

<section class="p-5 dark:text-neutral-200">
	<h1 class="text-2xl font-bold">{page.status}</h1>
	<p class="py-3">{page.error?.message}</p>

	{#if failures.length > 0}
		<p class="py-2">
			自動販売機データの取得元に問い合わせましたが、すべて失敗しました。
			時間をおいてリロードしてください。
		</p>
		<h2 class="pt-3 text-lg font-semibold">失敗の詳細</h2>
		<ul class="list-disc py-2 pl-6">
			{#each failures as failure (failure.source)}
				<li class="py-1">
					<span class="font-mono">{failure.source}</span>: {failure.reason}
				</li>
			{/each}
		</ul>
		<p class="py-2 text-sm">
			問題が続く場合は、この画面の内容を添えて
			<a
				class="text-sky-500 hover:underline"
				href="https://github.com/eniehack/itf-vendingmachine/issues">GitHubのIssue</a
			>でお知らせください。
		</p>
	{/if}
</section>
