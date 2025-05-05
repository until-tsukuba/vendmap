import { derived, writable } from 'svelte/store';
import maplibregl from 'maplibre-gl';

export const isDarkmode = writable(false);
export const vendingFilter = writable<maplibregl.FilterSpecification | null>(null);
export const filter = derived(vendingFilter, ($vendingFilter) => $vendingFilter);
