<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { isDarkmode } from './store';
	import { osm, dark } from '$lib/style';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { VendingMachine } from './vendingMachine';
	import { base } from '$app/paths';
	import { VENDING, SOURCE_ID, LAYER } from '$lib/const';
	import SearchMenu from './SearchMenu.svelte';
	import { darkmodeControl } from './darkmodeControl';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		here: maplibregl.LngLatLike;
		pointData: GeoJSON.FeatureCollection<GeoJSON.Point, Record<string, string>>;
	}

	let { here, pointData }: Props = $props();

	let map = $state<maplibregl.Map | undefined>();
	let mapElem = $state<HTMLDivElement | undefined>();
	let filter = $state<maplibregl.FilterSpecification | null>(null);

	const setFilter = (map: maplibregl.Map, expr: maplibregl.FilterSpecification | null) => {
		map.setFilter(LAYER.CIRCLE, expr);
		map.setFilter(LAYER.ICON, expr);
		map.setFilter(LAYER.SYMBOL, expr);
	};

	onMount(() => {
		if (typeof mapElem === 'undefined') return;
		map = new maplibregl.Map({
			container: mapElem,
			style: $isDarkmode ? dark : osm,
			center: here,
			zoom: 13
		});
		map.on('load', () => {
			map?.loadImage(`${base}/${VENDING.DRINKS.icon.file}`).then((img) => {
				map?.addImage(VENDING.DRINKS.icon.id, img.data, { sdf: true });
			});
			map?.loadImage(`${base}/${VENDING.BREAD.icon.file}`).then((img) => {
				map?.addImage(VENDING.BREAD.icon.id, img.data, { sdf: true });
			});
			map?.loadImage(`${base}/${VENDING.ICE_CREAM.icon.file}`).then((img) => {
				map?.addImage(VENDING.ICE_CREAM.icon.id, img.data, { sdf: true });
			});
			map?.addControl(
				new maplibregl.GeolocateControl({
					positionOptions: {
						enableHighAccuracy: true
					},
					trackUserLocation: true
				})
			);
			map?.addControl(new maplibregl.NavigationControl());
			map?.addControl(new darkmodeControl());
			map?.addSource(SOURCE_ID, {
				type: 'geojson',
				data: pointData
			});
			map?.addLayer({
				id: LAYER.CIRCLE,
				source: SOURCE_ID,
				type: 'circle',
				paint: {
					//'circle-color': 'blue',
					//'circle-opacity': 0.8,
					//'circle-stroke-color': 'white',
					//'circle-stroke-width': 1
					'circle-color': 'white',
					'circle-radius': 16
				}
			});
			map?.addLayer({
				id: LAYER.ICON,
				source: SOURCE_ID,
				type: 'symbol',
				paint: {
					'icon-color': [
						'match',
						['get', 'vending'],
						VENDING.DRINKS.value,
						VENDING.DRINKS.icon.color,
						VENDING.BREAD.value,
						VENDING.BREAD.icon.color,
						VENDING.ICE_CREAM.value,
						VENDING.ICE_CREAM.icon.color,
						'blue' // fallback
					]
				},
				layout: {
					'icon-image': [
						'match',
						['get', 'vending'],
						VENDING.DRINKS.value,
						VENDING.DRINKS.icon.id,
						VENDING.BREAD.value,
						VENDING.BREAD.icon.id,
						VENDING.ICE_CREAM.value,
						VENDING.ICE_CREAM.icon.id,
						VENDING.DRINKS.icon.id // fallback
					],
					'icon-size': 0.15,
					'icon-allow-overlap': true
				}
			});
			map?.addLayer({
				id: LAYER.SYMBOL,
				source: SOURCE_ID,
				type: 'symbol',
				layout: {
					'text-font': ['Noto Sans Bold'],
					'text-field': ['format', ['coalesce', ['get', 'brand'], ['get', 'name']]],
					'text-offset': [0, 1.6]
				},
				paint: {
					'text-halo-width': 2,
					'text-halo-color': 'white'
				}
			});
		});
		map.on('click', LAYER.CIRCLE, (e) => {
			if (typeof e.features === 'undefined') return;
			const feature = e.features[0];
			const vm = new VendingMachine(feature);
			new maplibregl.Popup()
				.setLngLat(vm.getPosition())
				.setHTML(vm.generatePopupText())
				.addTo(map!);
		});
		setFilter(map, filter);
		console.log(filter);

		/*
        const bottleIcon = icon({
            iconUrl: BottleImage,
            iconSize: [36, 36]
        });
        */
	});
	onDestroy(() => {
		if (typeof map === 'undefined') return;
		for (let l of Object.values(LAYER)) {
			map.removeLayer(l);
		}
		map.removeSource(SOURCE_ID);
		map.remove();
	})
	isDarkmode.subscribe((v) => {
		map?.setStyle(v ? dark : osm);
	});
</script>

<div id="map-container">
	<div id="map" bind:this={mapElem}></div>
</div>

<SearchMenu bind:filter />

<style>
	#map {
		height: 100%;
		width: 100vw;
	}
	#map-container {
		position: fixed;
		bottom: 0;
		top: 53px;
	}
</style>
