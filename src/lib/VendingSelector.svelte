<script lang="ts">
	import { VENDING } from './const';
	import maplibregl from 'maplibre-gl';

	interface Props {
		vendingFilter: maplibregl.FilterSpecification | undefined;
	}

	let vending = $state('');
	let { vendingFilter = $bindable() }: Props = $props();

	$effect(() => {
		if (vending === '') {
			vendingFilter = [
				'==',
				['get', 'amenity'],
				'vending_machine'
			] as maplibregl.FilterSpecification;
		} else {
			vendingFilter = ['==', ['get', 'vending'], vending] as maplibregl.FilterSpecification;
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
