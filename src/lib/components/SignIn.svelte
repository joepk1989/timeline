<script lang="ts">
	import { app } from '$lib/state/app.svelte';
	import { ui } from '$lib/state/ui.svelte';
	import Btn from './Btn.svelte';
	import Dialog from './Dialog.svelte';

	let { next, text }: { next?: string; text?: string } = $props();
	let email = $state('');
	let sent = $state(false);
	let busy = $state(false);
	async function send() {
		if (!/^\S+@\S+\.\S+$/.test(email.trim())) { app.toast('Vul je e-mailadres in'); return; }
		busy = true;
		sent = await app.signIn(email.trim(), next);
		busy = false;
	}
</script>

<Dialog open={ui.account} onclose={() => (ui.account = false)} label="Inloggen">
	<form class="dlg" onsubmit={(e) => { e.preventDefault(); send(); }}>
		<h3>Inloggen</h3>
		{#if sent}
			<p>Er is een link gestuurd naar <b>{email}</b>. Open de e-mail en tik op de link om in te loggen. Je kunt dit venster sluiten.</p>
		{:else}
			<p class="muted">{text ?? 'Je krijgt een e-mail met een link. Geen wachtwoord nodig.'}</p>
			<label>E-mailadres<input type="email" autocomplete="email" required bind:value={email} /></label>
		{/if}
		<div class="actions">
			<Btn variant="ghost" onclick={() => (ui.account = false)}>{sent ? 'Sluiten' : 'Annuleren'}</Btn>
			{#if !sent}<Btn type="submit" disabled={busy}>{busy ? 'Versturen…' : 'Stuur link'}</Btn>{/if}
		</div>
	</form>
</Dialog>

<style>
	p { margin: 0; }
</style>
