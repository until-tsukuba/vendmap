<script lang="ts">
	//import { VERCEL_URL } from "$env/static/private";
	import { here } from '$lib/geo';
	//import BottleImage from "$lib/assets/bottle.png";
	import { resolve } from '$app/paths';
	import ogpImage from '$lib/assets/ogp.jpg';
	import type { PageData } from './$types';
	import Map from '$lib/Map.svelte';

	interface Props {
		data: PageData;
	}

	const { data }: Props = $props();
</script>

<svelte:head>
	<title>筑波大学 自販機 Map</title>
	<meta name="og:title" content="筑波大学 自販機 Map" />
	<meta name="og:type" content="website" />
	<meta name="og:url" content={resolve('/')} />
	<meta name="og:locale" content="ja-JP" />
	<meta name="og:images" content={ogpImage} />
	<meta name="og:description" content="筑波大学構内の自動販売機の場所を一覧できるサイト" />
	<meta name="twitter:title" content="筑波大学 自販機 Map" />
	<meta name="twitter:description" content="筑波大学構内の自動販売機の場所を一覧できるサイト" />
	<meta name="twitter:creators" content="@eniehack" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<Map pointData={data} here={$here} />
