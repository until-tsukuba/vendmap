<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { isDarkmode, filter } from './store';
	import { osm, dark } from '$lib/style';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { VendingMachine } from './vendingMachine';
	import { asset } from '$app/paths';
	import { VENDING, SOURCE_ID, LAYER, DARKMODE } from '$lib/const';
	import SearchMenu from './SearchMenu.svelte';
	import { darkmodeControl } from './darkmodeControl';
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type GeoJSON from '@types/geojson';

	interface Props {
		here: maplibregl.LngLatLike;
		pointData: GeoJSON.FeatureCollection<GeoJSON.Point, Record<string, string>>;
	}

	const { here, pointData }: Props = $props();

	let map = $state<maplibregl.Map | undefined>();
	let mapElem = $state<HTMLDivElement | undefined>();

	const setFilter = (map: maplibregl.Map, expr: maplibregl.FilterSpecification | null = null) => {
		map.setFilter(LAYER.CIRCLE, expr);
		map.setFilter(LAYER.ICON, expr);
		map.setFilter(LAYER.SYMBOL, expr);
	};

	const loadDarkmodeState = (): boolean => {
		const rawDarkmode = localStorage.getItem(DARKMODE);
		if (!rawDarkmode) {
			return false;
		}
		const darkmode = JSON.parse(rawDarkmode) as boolean;
		return darkmode;
	};

	const setLayer = (map: maplibregl.Map) => {
		map.addSource(SOURCE_ID, {
			type: 'geojson',
			data: pointData
		});
		map.addLayer({
			id: LAYER.CIRCLE,
			source: SOURCE_ID,
			type: 'circle',
			paint: {
				'circle-color': 'white',
				'circle-radius': 16
			}
		});
		map.addLayer({
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
		map.addLayer({
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
	};

	onMount(() => {
		if (typeof mapElem === 'undefined') return;
		if (browser) {
			isDarkmode.set(loadDarkmodeState());
		}
		map = new maplibregl.Map({
			container: mapElem,
			style: $isDarkmode ? dark : osm,
			center: here,
			zoom: 13
		});
		map.on('load', () => {
			if (typeof map === 'undefined') return;
			map.loadImage(asset(`/${VENDING.DRINKS.icon.file}`)).then((img) => {
				map?.addImage(VENDING.DRINKS.icon.id, img.data, { sdf: true });
			});
			map.loadImage(asset(`/${VENDING.BREAD.icon.file}`)).then((img) => {
				map?.addImage(VENDING.BREAD.icon.id, img.data, { sdf: true });
			});
			map.loadImage(asset(`/${VENDING.ICE_CREAM.icon.file}`)).then((img) => {
				map?.addImage(VENDING.ICE_CREAM.icon.id, img.data, { sdf: true });
			});
			map.addControl(
				new maplibregl.GeolocateControl({
					positionOptions: {
						enableHighAccuracy: true
					},
					trackUserLocation: true
				})
			);
			map.addControl(new maplibregl.NavigationControl());
			map.addControl(new darkmodeControl());
			setLayer(map);
			setFilter(map, $filter);
		});
		map.on('click', LAYER.CIRCLE, (e) => {
			if (typeof map === 'undefined') return;
			if (typeof e.features === 'undefined') return;
			const feature = e.features[0];
			const vm = new VendingMachine(feature);
			new maplibregl.Popup().setLngLat(vm.getPosition()).setHTML(vm.generatePopupText()).addTo(map);
		});
	});
	const filterUnsubscriber = filter.subscribe(
		(filter) => {
			if (typeof map === 'undefined') return;
			setFilter(map, filter);
		},
		() => {
			if (typeof map === 'undefined') return;
			setFilter(map, null);
		}
	);
	const darkmodeUnsubscriber = isDarkmode.subscribe((v) => {
		if (browser && typeof map !== 'undefined') {
			localStorage.setItem(DARKMODE, JSON.stringify(v));
			map.setStyle(v ? dark : osm);
			setLayer(map);
			setFilter(map, $filter);
		}
	});
	onDestroy(() => {
		filterUnsubscriber();
		darkmodeUnsubscriber();
		if (typeof map === 'undefined') return;
		for (const l of Object.values(LAYER)) {
			map.removeLayer(l);
		}
		map.removeSource(SOURCE_ID);
		map.remove();
	});
</script>

<div id="map-container">
	<div id="map" bind:this={mapElem}></div>
</div>

<SearchMenu />

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
