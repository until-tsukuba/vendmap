<script lang="ts">
	import { VENDING } from './const';
	import maplibregl from 'maplibre-gl';
	import { vendingFilter } from './store';

	let vending = $state('');

	$effect(() => {
		if (vending !== '') {
			vendingFilter.set(['==', ['get', 'vending'], vending] as maplibregl.FilterSpecification);
		} else {
			vendingFilter.set(null);
		}
	});
</script>

<div>
	<label for="vending">欲しいものは？</label>
	<select name="vending" id="vending-selector" bind:value={vending}>
		<option value="">指定なし</option>
		{#each Object.values(VENDING) as v}
			<option value={v.value}>{v.title}</option>
		{/each}
	</select>
</div>
