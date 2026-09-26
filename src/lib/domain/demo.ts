import { formatDate } from './dates';
import type { Category, Day, Moment, Status, Timeline } from './types';

type Extra = { end?: string; repeat?: boolean; status?: Status };

/**
 * Demo timeline: a whole life from birth to plans twelve years ahead.
 * Dates are relative to `now`, so the person is always 36 and the plans stay in the future.
 */
export function demoTimeline(now: Day, makeId: () => string): { timeline: Timeline; moments: Moment[] } {
	const TY = now.y, B = TY - 36;
	const F = (n: number) => TY + n, P = (n: number) => B + n;
	const D = (y: number, m: number, d: number) => formatDate(y, m - 1, d);
	const M = (y: number, m: number) => formatDate(y, m - 1);
	const Y = (y: number) => String(y);
	const categories: Category[] = ([
		['gezin', 'Gezin', '#C8507A'], ['relatie', 'Relatie', '#8E3B46'], ['vrienden', 'Vrienden', '#7A5BC4'], ['opleiding', 'Opleiding', '#2F6FD1'],
		['werk', 'Werk', '#1F8A8A'], ['huis', 'Huis', '#D0663A'], ['vervoer', 'Vervoer', '#B8860B'], ['reizen', 'Reizen', '#3E8E4F'],
		['sparen', 'Sparen', '#4A5FC1'], ['overig', 'Overig', '#6B7785']
	] as const).map(([id, name, color]) => ({ id, name, color }));
	// [date, emoji, title, category, note, extra]
	const E: [string, string, string, string, string, Extra?][] = [
    [D(P(1),6,2),'👣','Eerste stapjes','gezin','Van de bank naar de salontafel, zes stapjes zonder vallen.'],
    [M(P(2),9),'💬','Eerste zinnetjes','gezin','“Mama, kijk, vogel!”'],
    [D(P(3),11,20),'👶','Zusje Lotte geboren','gezin','Vanaf dag één de grote zus.'],
    [D(P(4),8,20),'🎒','Eerste schooldag','opleiding','Met een rugzak die bijna groter was dan zijzelf.'],
    [M(P(5),5),'🚲','Fietsen zonder zijwieltjes','gezin',''],
    [D(P(7),7,12),'⛺','Kampeervakantie in de Ardèche','reizen','Kanoën, zwemmen in de rivier en elke avond pannenkoeken.',{end:D(P(7),7,26)}],
    [D(P(9),6,14),'🏊','Zwemdiploma A','overig',''],
    [M(P(10),8),'📦','Verhuisd naar Amersfoort','huis','Een eigen kamer met een schuin dak.'],
    [D(P(11),5,27),'⚽','Kampioen met het voetbalteam','vrienden','Winnende goal in de laatste minuut.'],
    [D(P(12),7,4),'🎓','Einde basisschool','opleiding','Musical gespeeld als de burgemeester.'],
    [D(P(13),10,18),'🎸','Eerste concert met vriendinnen','vrienden',''],
    [M(P(14),3),'📰','Eerste bijbaantje: krantenwijk','werk','Om zes uur op, regen of niet.'],
    [D(P(15),4,10),'🇩🇪','Werkweek naar Berlijn','opleiding','',{end:D(P(15),4,14)}],
    [D(P(16),5,10),'🛵','Scooter gekocht van eigen spaargeld','vervoer','Twee jaar krantenwijk in één scooter.'],
    [D(P(18),6,21),'🎓','Vwo-diploma gehaald','opleiding','Met een 8 voor wiskunde.'],
    [D(P(18),7,15),'🚆','Interrail door Europa','reizen','Parijs, Barcelona, Rome en Wenen in drie weken.',{end:D(P(18),8,5)}],
    [D(P(18),9,1),'🏛️','Start studie Bouwkunde in Delft','opleiding',''],
    [M(P(18),9),'🛏️','Op kamers in Delft','huis','Zeven huisgenoten en één koelkast.'],
    [D(P(18),11,16),'🚗','Rijbewijs gehaald','vervoer','In één keer!'],
    [Y(P(19)),'🚣','Roeien bij de studentenvereniging','vrienden','Vrienden voor het leven gemaakt.'],
    [D(P(20),2,1),'🇩🇰','Uitwisseling in Kopenhagen','reizen','Een semester Deens design en fietsen door de sneeuw.',{end:D(P(20),6,30)}],
    [D(P(21),3,8),'❤️','Daan ontmoet op een verjaardag','relatie','We praatten de hele avond over reizen.'],
    [D(P(22),2,1),'📐','Stage bij een bureau in Rotterdam','werk','',{end:D(P(22),7,31)}],
    [D(P(23),7,4),'🎓','Master Bouwkunde afgerond','opleiding','Afstudeerproject: een school van hout.'],
    [D(P(23),9,1),'💼','Eerste baan: junior architect','werk',''],
    [D(P(24),2,14),'🚗','Eerste eigen auto: tweedehands Golf','vervoer','Rood, 140.000 km, rammelende radio. Perfect.'],
    [D(P(24),6,1),'🏢','Samenwonen met Daan in een huurappartement','relatie',''],
    [D(P(25),8,2),'🗾','Rondreis door Japan','reizen','Tokio, Kyoto en een nacht in een ryokan.',{end:D(P(25),8,23)}],
    [Y(P(26)),'🐷','Sparen voor een eigen huis','sparen','Elke maand een vast bedrag opzij.',{status:'behaald'}],
    [D(P(27),4,22),'🔑','Sleutel van ons eerste koophuis','huis','Jaren-dertigwoning met een tuin op het zuiden.'],
    [D(P(27),5,1),'🔨','Verbouwing keuken en badkamer','huis','Alles zelf gesloopt, de rest laten doen.',{end:D(P(27),8,15)}],
    [D(P(27),12,27),'💍','Aanzoek op het strand','relatie','Daan had de ring in een schelp verstopt.'],
    [D(P(28),6,15),'💒','Onze trouwdag','relatie','Een zonnige dag met al onze vrienden.',{repeat:true}],
    [D(P(28),6,20),'🇵🇹','Huwelijksreis door Portugal','reizen','',{end:D(P(28),7,5)}],
    [M(P(29),1),'📈','Promotie tot projectarchitect','werk',''],
    [D(P(29),10,3),'👶','Noor geboren','gezin','3.450 gram en meteen verliefd.',{repeat:true}],
    [M(P(30),3),'🚙','Gezinsauto gekocht','vervoer','Genoeg ruimte voor een kinderwagen en de hond.'],
    [D(P(31),2,1),'🪜','Zolder verbouwd tot kinderkamer','huis','',{end:D(P(31),4,15)}],
    [D(P(32),5,18),'👶','Mees geboren','gezin','Precies op tijd, zoals zijn vader.',{repeat:true}],
    [D(P(33),8,31),'🎒','Noor naar de basisschool','gezin',''],
    [M(P(33),11),'🚀','Eigen architectenbureau gestart','werk','Kantoor aan huis, grote dromen.'],
    [M(P(34),4),'☀️','Zonnepanelen op het dak','huis',''],
    [D(P(34),7,10),'🚐','Met de camper door Noorwegen','reizen','Fjorden, trollen en elke dag een ander uitzicht.',{end:D(P(34),7,31)}],
    [D(P(35),2,2),'🏫','Eerste grote opdracht: een school in Amersfoort','werk','Precies zoals mijn afstudeerproject, maar dan echt.'],
    [D(P(35),6,28),'🏡','Groter huis met tuin gekocht','huis','Eindelijk een moestuin en een werkplaats.'],
    [D(TY,1,1),'🏰','Spaarplan voor het landgoed','sparen','Elke maand 20% opzij, bonussen gaan er helemaal in.',{end:D(F(6),12,31),status:'bezig'}],
    [D(TY,3,8),'🥂','15 jaar samen met Daan','relatie','Etentje op dezelfde plek als waar we elkaar ontmoetten.'],
    [M(TY,5),'🏊','Mees begint met zwemles','gezin',''],
    [D(TY,6,30),'🛟','Buffer van zes maanden vaste lasten','sparen','Loopt achter door de verhuizing. Plan bijstellen.',{status:'bijstellen'}],
    [D(TY,8,31),'🎒','Mees naar de basisschool','gezin',''],
    [D(TY,12,27),'⛷️','Wintersport met het hele gezin','reizen','Noor en Mees voor het eerst op de ski\'s.',{end:D(F(1),1,3),status:'gepland'}],
    [D(F(1),6,1),'💶','Spaardoel: € 40.000 opzij','sparen','Eerste tussenstap richting het landgoed.',{status:'gepland'}],
    [M(F(1),9),'⚡','Elektrische auto voor het bureau','vervoer','',{status:'gepland'}],
    [D(F(2),7,1),'🇳🇿','Drie maanden door Nieuw-Zeeland','reizen','Een sabbatical met het hele gezin, voordat Noor naar de middelbare school gaat.',{end:D(F(2),9,30),status:'gepland'}],
    [D(F(3),3,1),'💶','Spaardoel: € 100.000 opzij','sparen','',{status:'gepland'}],
    [Y(F(3)),'👩‍💼','Bureau uitbreiden met twee medewerkers','werk','Meer tijd voor ontwerpen, minder voor administratie.',{status:'gepland'}],
    [M(F(4),4),'🔎','Landgoederen bezichtigen','huis','Gelderland en Drenthe. Eisen: bos, water en ruimte voor een atelier.',{status:'gepland'}],
    [D(F(5),9,1),'🏫','Noor naar de middelbare school','gezin','',{status:'gepland'}],
    [D(F(6),6,1),'🏦','Aanbetaling landgoed rond','sparen','Hypotheekgesprek en taxatie.',{status:'gepland'}],
    [D(F(7),5,15),'🏰','Landgoed kopen','huis','Oude boerderij met bos, moestuin, een vijver en ruimte voor een atelier.',{status:'gepland'}],
    [D(F(7),6,1),'🧱','Restauratie van het hoofdhuis','huis','Rieten dak, nieuwe kozijnen en een warmtepomp.',{end:D(F(8),3,31),status:'gepland'}],
    [D(F(8),4,15),'📦','Verhuizen naar het landgoed','gezin','',{status:'gepland'}],
    [M(F(9),5),'🎨','Atelier en gastenverblijf openen','werk','Het bureau verhuist mee naar de oude schuur.',{status:'gepland'}],
    [D(F(10),3,8),'🎉','25 jaar samen: feest op het landgoed','relatie','Alle vrienden van vroeger uitnodigen.',{status:'gepland'}],
    [Y(F(12)),'🌱','Financieel onafhankelijk','sparen','Werken omdat het leuk is, niet omdat het moet.',{status:'gepland'}]
  ];
	const timeline: Timeline = { id: makeId(), name: 'Demo: het leven van Sanne', kind: 'mij', anchor: D(B, 3, 14), categories, scope: { from: B, to: F(12) }, demo: true };
	const moments: Moment[] = E.map(([date, emoji, title, categoryId, note, x]) => ({
		id: makeId(), timelineId: timeline.id, date, emoji, title, categoryId, note: note || '',
		end: x?.end ?? null, repeat: !!x?.repeat, status: x?.status ?? null, photos: []
	}));
	return { timeline, moments };
}
