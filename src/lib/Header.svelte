<script lang="ts">
	import { resolve } from '$app/paths';

	let is_navbar_toggled = $state(false);
</script>

<header>
	<nav class="dark:bg-slate-800 bg-sky-50 relative w-full p-2 z-30" aria-label="main navigation">
		<div class="flex items-center justify-between">
			<div class="flex-auto">
				<a class="item-center dark:text-neutral-200" href={resolve('/')}> 筑波大自販機Map </a>
			</div>
			<div class="md:hidden flex-none">
				<button
					class="inline-flex rounded-md dark:text-neutral-200 focus:outline-hidden"
					aria-label="menu"
					aria-expanded={is_navbar_toggled}
					data-target="navbar-content"
					tabindex="0"
					onclick={() => (is_navbar_toggled = !is_navbar_toggled)}
				>
					{#if is_navbar_toggled}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							fill="currentColor"
							class="bi bi-x"
							viewBox="0 0 16 16"
						>
							<path
								d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
							/>
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							fill="currentColor"
							class="bi bi-list"
							viewBox="0 0 16 16"
						>
							<path
								fill-rule="evenodd"
								d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
							/>
						</svg>
					{/if}
				</button>
			</div>
			<div class="hidden md:flex">
				<a href={resolve('/about')} class="p-2 dark:text-neutral-200">about</a>
				<a href={resolve('/contribute')} class="p-2 dark:text-neutral-200">このサイトに貢献する</a>
				<a href="https://github.com/eniehack/itf-vendingmachine" class="p-2 dark:text-neutral-200"
					>GitHub</a
				>
			</div>
		</div>
		{#if is_navbar_toggled}
			<div id="navbar-content" class="md:hidden flex flex-col block">
				<a href={resolve('/about')} class="p-2 dark:text-neutral-200">about</a>
				<a href={resolve('/contribute')} class="p-2 dark:text-neutral-200">このサイトに貢献する</a>
				<a href="https://github.com/eniehack/itf-vendingmachine" class="p-2 dark:text-neutral-200"
					>GitHub</a
				>
			</div>
		{/if}
	</nav>
</header>
