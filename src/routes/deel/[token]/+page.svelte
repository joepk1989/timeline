<script lang="ts">
	// Opening an invite link: sign in if needed, accept it, then go to the timeline.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { supabase } from '$lib/supabase';
	import { acceptShareLink } from '$lib/data/cloud';

	let phase = $state<'busy' | 'signin' | 'sent' | 'error' | 'nodb'>('busy');
	let message = $state('');
	let email = $state('');
	const token = page.params.token ?? '';

	async function accept() {
		try {
			const id = await acceptShareLink(supabase!, token);
			goto(resolve('/') + `?t=${id}`, { replaceState: true });
		} catch (e) {
			message = e instanceof Error && /ongeldig|verlopen/.test(e.message) ? 'Deze link is ongeldig of verlopen. Vraag om een nieuwe.' : 'Openen lukte niet. Probeer het later opnieuw.';
			phase = 'error';
		}
	}
	onMount(async () => {
		if (!supabase) { phase = 'nodb'; return; }
		const { data } = await supabase.auth.getSession();
		if (data.session) accept();
		else {
			phase = 'signin';
			supabase.auth.onAuthStateChange((_e, s) => { if (s && phase !== 'busy') { phase = 'busy'; accept(); } });
		}
	});
	async function send(e: SubmitEvent) {
		e.preventDefault();
		const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.href } });
		if (error) { message = 'Versturen lukte niet. Klopt het e-mailadres?'; return; }
		message = '';
		phase = 'sent';
	}
</script>

<main>
	<div class="card">
		<h1>Je bent uitgenodigd</h1>
		{#if phase === 'busy'}
			<p>Even geduld…</p>
		{:else if phase === 'signin'}
			<p>Iemand deelt een tijdlijn met je. Log in met je e-mailadres om hem te bekijken. Je krijgt een e-mail met een link, een wachtwoord is niet nodig.</p>
			<form onsubmit={send}>
				<label>E-mailadres<input type="email" autocomplete="email" required bind:value={email} /></label>
				<button type="submit">Stuur link</button>
			</form>
		{:else if phase === 'sent'}
			<p>Er is een link gestuurd naar <b>{email}</b>. Open hem op dit apparaat, dan kom je vanzelf bij de tijdlijn.</p>
		{:else if phase === 'nodb'}
			<p>Delen werkt pas als er een database is gekoppeld.</p>
			<a href={resolve('/')}>Naar de app</a>
		{:else}
			<a href={resolve('/')}>Naar de app</a>
		{/if}
		{#if message}<p class="err" role="alert">{message}</p>{/if}
	</div>
</main>

<style>
	main { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 16px; }
	.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 24px; max-width: 440px; width: 100%; }
	h1 { margin: 0 0 12px; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
	p { margin: 0 0 14px; }
	form { display: flex; flex-direction: column; gap: 12px; }
	label { display: flex; flex-direction: column; gap: 5px; font-size: 13px; color: var(--muted); }
	input { padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); font: inherit; font-size: 16px; color: var(--ink); }
	button { padding: 11px 16px; border-radius: 8px; border: none; background: var(--ink); color: var(--surface); font: inherit; font-weight: 600; cursor: pointer; }
	a { color: var(--accent); font-weight: 600; }
	.err { color: var(--danger); }

	/* Hover */
	button { transition: background-color 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s, filter 0.15s; }
	@media (hover: hover) { button:hover { background: color-mix(in srgb, var(--ink) 85%, var(--surface)); } }
</style>
