import maplibregl from 'maplibre-gl';
import DarkmodeControl from './DarkmodeControl.svelte';
import { mount, unmount } from 'svelte';

export class darkmodeControl implements maplibregl.IControl {
	_map: maplibregl.Map | undefined;
	_container: HTMLDivElement;
	_app: Record<string, any> | undefined;

	constructor() {
		this._container = document.createElement('div');
		this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
		this._app = mount(DarkmodeControl, {
			target: this._container
		});
	}

	onAdd(map: maplibregl.Map): HTMLElement {
		this._map = map;
		return this._container;
	}

	onRemove() {
		if (this._container.parentNode === null) return;
		if (typeof this._app === 'undefined') return;
		unmount(this._app);
		this._map = undefined;
	}

	getDefaultPosition(): maplibregl.ControlPosition {
		return 'top-right';
	}
}
