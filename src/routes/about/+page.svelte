<script lang="ts">
	import { resolve } from '$app/paths';
	import ogpImage from '$lib/assets/ogp.jpg';
</script>

<article class="prose">
	<h1 class="p-5 text-2xl font-bold">about</h1>
	<section class="p-4">
		<h1 class="text-xl font-semibold">地図、自販機データの出典</h1>
		<p class="p-3">
			地図データ、自動販売機データ共に<a
				class="text-sky-500 hover:underline"
				href="https://openstreetmap.org">OpenStreetMap</a
			>を利用しています。 OSMの提供するデータはODbLの下にライセンスされます。 詳細は<a
				class="text-sky-500 hover:underline"
				href="https://www.openstreetmap.org/copyright">こちら</a
			>をご覧ください
		</p>
	</section>
	<section class="p-4">
		<h1 class="text-xl font-semibold">プライバシーポリシー</h1>
		<p class="p-3">
			このサービスではあなたの位置情報を取り扱います。
			しかし、位置情報はあなたのブラウザのみに共有され、その他第三者に共有されることはありません。
		</p>
		<p class="p-3">
			また、このサイトの使いやすさ向上のためにGoogle Analyticsの導入しています。 Google
			Analyticsを用いて、ユーザの属性や行動を収集することで、よりよいインタフェース、機能の開発に利用します。
			Google Analyticsではそれぞれのアクセスを匿名化した上で収集されます。 Google
			Analyticsの問題があると感じる場合は、Adblockerの導入やブラウザの設定によりcookieを無効化することで回避できます。
			Google Analyticsに関しての詳細は<a
				class="text-sky-500 hover:underline"
				href="https://marketingplatform.google.com/about/analytics/terms/jp/"
				>Google アナリティクス利用規約</a
			>や<a
				class="text-sky-500 hover:underline"
				href="https://policies.google.com/technologies/partner-sites">Google ポリシーと規約</a
			>などをご確認ください。
		</p>
	</section>
</article>

<svelte:head>
	<title>筑波大学 自販機 Map</title>
	<meta name="og:title" content="about | 筑波大学 自販機 Map" />
	<meta name="og:type" content="website" />
	<meta name="og:url" content={resolve('/about')} />
	<meta name="og:locale" content="ja_JP" />
	<meta name="og:images" content={ogpImage} />
	<meta name="og:description" content="筑波大学構内の自動販売機の場所を一覧できるサイト" />
	<meta name="twitter:title" content="about | 筑波大学 自販機 Map" />
	<meta name="twitter:description" content="筑波大学構内の自動販売機の場所を一覧できるサイト" />
	<meta name="twitter:creators" content="@eniehack" />
	<meta name="twitter:card" content="summary" />
</svelte:head>
