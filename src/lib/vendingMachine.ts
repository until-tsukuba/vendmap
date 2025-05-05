import ml from 'maplibre-gl';

interface VendingMachineAsObject {
	tags: object;
	lat: number;
	lon: number;
}

export class VendingMachine {
	private tags: Map<string, any>;
	public lat: number;
	public lng: number;

	constructor(elem: ml.MapGeoJSONFeature) {
		this.tags = new Map(Object.entries(elem.properties));
		if (elem.geometry.type === 'Point') [this.lng, this.lat] = elem.geometry.coordinates;
	}

	getPosition(): ml.LngLat {
		return new ml.LngLat(this.lng, this.lat);
	}

	getPaymentsType(): string[] {
		const payments: string[] = [];
		this.tags.forEach((v, k) => {
			if (k.startsWith('payment:') && v === 'yes') {
				payments.push(k.substring(8));
			}
		});
		return payments;
	}

	getHumanizedPaymentsType(): string[] {
		const payments = this.getPaymentsType();
		const payment_map = new Map<string, string>([
			['icsf', '交通系ICカード'],
			['d_barai', 'd払い'],
			['au_pay', ' au PAY'],
			['rakuten_pay', '楽天ペイ'],
			['coke_on_pay', 'Coke ON Pay'],
			['jcoin_pay', ' J-Coin Pay'],
			['cash', '現金'],
			['coins', '硬貨'],
			['notes', '紙幣']
		]);

		if (payments.length === 0) {
			return ['不明'];
		}

		return payments.map((payment) => {
			const exist = payment_map.get(payment);
			if (typeof exist === 'string') {
				return exist;
			} else {
				return payment;
			}
		});
	}

	getVending(): string | undefined {
		return this.tags.get('vending');
	}

	getHumanizedVendingType(): string {
		const vending = this.getVending();
		if (typeof vending === 'undefined') return '不明';

		const vending_map = new Map<string, string>([
			['drinks', '飲料'],
			['food', '食品'],
			['ice_cream', 'アイスクリーム'],
			['bread', 'パン']
		]);

		const exists = vending_map.get(vending);
		if (typeof exists === 'undefined') {
			return vending;
		}
		return exists;
	}

	isIndoor(): boolean {
		return typeof this.tags.get('indoor') !== 'undefined' && this.tags.get('indoor') === 'yes';
	}

	generatePopupText(): string {
		let text = `<p>売っているもの: ${this.getHumanizedVendingType()}</p>`;
		text += `<p>決済手段: ${this.getHumanizedPaymentsType().toString()}</p>`;
		if (this.isIndoor() && typeof this.tags.get('level') !== 'undefined') {
			const level = Number(this.tags.get('level')) + 1;
			text += `<p>${level.toString()}階</p>`;
		}
		return text;
	}

	toObject(): VendingMachineAsObject {
		let tags: object = {};
		for (const [k, v] of this.tags.entries()) tags = { ...tags, [k]: v };

		return {
			lat: this.lat,
			lon: this.lng,
			tags: tags
		};
	}
}

/*
 *
export const vendingmachine: Readable<VendingMachine[]> = readable(undefined, async (set) => {
  const query: string = "[out:json][timeout:25]; \
way(id:183555030); \
map_to_area-> .ulis; \
way(id:183555029); \
map_to_area -> .ut; \
( \
  node(area.ulis)[amenity=vending_machine]; \
  node(area.ut)[amenity=vending_machine]; \
); \
out;";
    const objToVendingMachine = (json : Object): VendingMachine[] => {
        let arr = [];
        json["elements"].forEach(elem => {
            let m = new VendingMachine(elem);
            arr.push(m);
        });
        return arr;
    }

    let vm = localStorage.getItem("vm");
        if (vm !== null) {
            try {
                let json = objToVendingMachine(JSON.parse(vm));
                set(json);
            } catch (e) {
                console.log(e);
                window.alert("自動販売機データの取得に失敗しました\nリロードしてください");
            }
        } else {
            let resp = await fetch("https://lz4.overpass-api.de/api/interpreter", {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/x-www-form-urlencode",
                },
                body: query,
            });

            if (resp.ok) {
                let json = await resp.json()
                set(objToVendingMachine(json));
            } else {
                let text = await resp.text();
                window.alert("自動販売機データの取得に失敗しました\nリロードしてください");
                throw new Error(text);
            }
        }
    return () => {};
});
 */
