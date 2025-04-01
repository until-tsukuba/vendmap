<script lang="ts">
	import ml from 'maplibre-gl';
	import { isDarkmode, mapStyle } from './store';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { VendingMachine } from './vendingMachine';
	import { writable } from 'svelte/store';
	import { base } from '$app/paths';
	import { darkmodeControl } from './darkmodeControl';

	interface Props {
		here: ml.LngLatLike;
		pointData: GeoJSON.FeatureCollection<GeoJSON.Point, Record<string, string>>;
	}

	let { here, pointData }: Props = $props();

	let map: ml.Map;
	let mapElem = $state<HTMLDivElement>();
	const vending = writable<string>('');
	const payment = writable<string>('');
	const VENDING = {
		DRINKS: {
			value: 'drinks',
			title: '飲み物',
			icon: { id: 'icon-bottle', file: 'icon-bottle.webp', color: 'blue' }
		},
		BREAD: {
			value: 'bread',
			title: 'パン',
			icon: { id: 'icon-bread', file: 'icon-baguette.webp', color: 'orange' }
		},
		ICE_CREAM: {
			value: 'ice_cream',
			title: 'アイス',
			icon: { id: 'icon-icecream', file: 'icon-icecream.webp', color: 'red' }
		}
	} as const;

	$effect(() => {
		if (typeof mapElem === 'undefined') return;
		map = new ml.Map({
			container: mapElem,
			style: $mapStyle,
			center: here,
			zoom: 13
		});
		const SOURCE_ID = 'vendingmachine';
		const LAYER = {
			CIRCLE: 'vendingmachine-circle',
			ICON: 'vendingmachine-icon',
			SYMBOL: 'vendingmachine-symbol'
		};
		map.on('load', () => {
			map.loadImage(`${base}/${VENDING.DRINKS.icon.file}`).then((img) => {
				map.addImage(VENDING.DRINKS.icon.id, img.data, { sdf: true });
			});
			map.loadImage(`${base}/${VENDING.BREAD.icon.file}`).then((img) => {
				map.addImage(VENDING.BREAD.icon.id, img.data, { sdf: true });
			});
			map.loadImage(`${base}/${VENDING.ICE_CREAM.icon.file}`).then((img) => {
				map.addImage(VENDING.ICE_CREAM.icon.id, img.data, { sdf: true });
			});
			map.addControl(
				new ml.GeolocateControl({
					positionOptions: {
						enableHighAccuracy: true
					},
					trackUserLocation: true
				})
			);
			map.addControl(new ml.NavigationControl());
			map.addControl(new darkmodeControl());
			map.addSource(SOURCE_ID, {
				type: 'geojson',
				data: pointData
			});
			map.addLayer({
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
		});
		map.on('click', LAYER.CIRCLE, (e) => {
			if (typeof e.features === 'undefined') return;
			const feature = e.features[0];
			const vm = new VendingMachine(feature);
			new ml.Popup().setLngLat(vm.getPosition()).setHTML(vm.generatePopupText()).addTo(map);
		});
		/*
        const bottleIcon = icon({
            iconUrl: BottleImage,
            iconSize: [36, 36]
        });
        */
		const vUnsubscriber = vending.subscribe((v) => {
			let filter = null;
			if (v === '') {
				map.setFilter(LAYER.CIRCLE, null);
				map.setFilter(LAYER.ICON, null);
				map.setFilter(LAYER.SYMBOL, null);
				return;
			}
			filter = ['==', ['get', 'vending'], v] as ml.FilterSpecification;
			if ($payment !== '') {
				filter = [
					'all',
					filter,
					['==', ['get', `payment:${$payment}`], 'yes']
				] as ml.FilterSpecification;
			}
			map.setFilter(LAYER.CIRCLE, filter);
			map.setFilter(LAYER.ICON, filter);
			map.setFilter(LAYER.SYMBOL, filter);
		});
		return () => {
			vUnsubscriber();
			map.remove();
		};
	});
</script>

<div id="map-container">
	<div id="map" bind:this={mapElem}></div>
</div>

<div class="absolute bottom-10 left-2 bg-white rounded-lg p-2">
	<div>
		<label for="vending">欲しいものは？</label>
		<select name="vending" id="vending-selector" bind:value={$vending}>
			<option value="">指定なし</option>
			{#each Object.values(VENDING) as v}
				<option value={v.value}>{v.title}</option>
			{/each}
		</select>
	</div>
</div>

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
