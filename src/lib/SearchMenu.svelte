<script lang="ts">
	import VendingSelector from './VendingSelector.svelte';

	type Props = {
		filter: maplibregl.FilterSpecification | null;
	};
	let { filter = $bindable() }: Props = $props();
	let vendingFilter = $state<maplibregl.FilterSpecification | undefined>();

	const updateFilter = (
		vendingFilter: maplibregl.FilterSpecification | undefined
	): maplibregl.FilterSpecification | null => {
		if (typeof vendingFilter === 'undefined') {
			return null;
		}
		return vendingFilter;
	};

	$effect(() => {
		filter = updateFilter(vendingFilter);
	});
</script>

<div class="absolute bottom-10 left-2 bg-white rounded-lg p-2">
	<VendingSelector bind:vendingFilter />
</div>
