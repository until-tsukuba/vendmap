export const SOURCE_ID = 'vendingmachine';
export const LAYER = {
	CIRCLE: 'vendingmachine-circle',
	ICON: 'vendingmachine-icon',
	SYMBOL: 'vendingmachine-symbol'
};

export const VENDING = {
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

export const DARKMODE = 'vendmap.tsukuba.dev__darkmode';
