#!/usr/bin/env node
// Generates the remastered pack's enemy word list (waves.txt) and treasure-dive word
// list (twords.txt) from public-domain / permissively licensed word lists.
//
//   node tools/gen-words.mjs            (downloads sources into $TMPDIR/deeptype-word-sources/ on first run)
//
// SOURCES (downloaded at run time into a temp cache dir, never committed):
//   1. ENABLE ("Enhanced North American Benchmark LExicon") word list. Public domain.
//      https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt
//      Base dictionary: lowercase a-z only, no proper nouns or abbreviations.
//   2. SCOWL 2020.12.07 (Spell Checker Oriented Word Lists) by Kevin Atkinson.
//      https://downloads.sourceforge.net/project/wordlist/SCOWL/2020.12.07/scowl-2020.12.07.tar.gz
//      License: MIT-like ("Permission to use, copy, modify, distribute and sell these word
//      lists, the associated scripts, the output created from the scripts, and its
//      documentation for any purpose is hereby granted without fee, provided that the above
//      copyright notice appears in all copies ..."; Copyright 2000-2018 Kevin Atkinson; see
//      the Copyright file in the tarball). Only the "english-words.NN"/"american-words.NN"
//      lists are read (no proper names, upper-case words, abbreviations or contractions);
//      a word must appear at size level <= SCOWL_LEVEL (standard, everyday spelling).
//   3. 12dicts 6.0.2 by Alan Beale, file Lemmatized/2+2+3frq.txt (lemmas + inflections
//      grouped in 21 frequency bands, 1 = most frequent). "I explicitly release them to the
//      public domain, but request acknowledgment of their use." (ReadMe.html)
//      https://downloads.sourceforge.net/wordlist/12dicts-6.0.2.zip
//      Used as the commonness filter and to rank words.
//
// A word is used if it is in all three lists, its 12dicts band is within the limit for
// its bucket, and it passes the family-friendly blocklist below (BLOCK / BLOCK_SUB) and
// the OBSCURE list. EXTRA lists a few everyday interjections allowed for 3-letter words.
//
// Output (CRLF, ASCII): packs/remastered/data/waves.txt (#LENGTH-3..7, enemy words by
// exact length) and twords.txt (#DIFF-3..21, DIFF = sum of per-letter values, see
// src/data/words.ts wordValue; words of 3..19 letters, at most TWORDS_CAP per bucket,
// most frequent first).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync, inflateRawSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Downloads are cached outside the repo (override with WORDS_CACHE=dir).
const CACHE = process.env.WORDS_CACHE ?? path.join(os.tmpdir(), 'deeptype-word-sources');
const OUT = path.join(ROOT, 'packs', 'remastered', 'data');

const ENABLE_URL = 'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt';
const SCOWL_URL = 'https://downloads.sourceforge.net/project/wordlist/SCOWL/2020.12.07/scowl-2020.12.07.tar.gz';

const DICTS_URL = 'https://downloads.sourceforge.net/wordlist/12dicts-6.0.2.zip';

const SCOWL_LEVEL = 50; // SCOWL size level cut-off (standard spelling, not rare)
const WAVE_BAND = 17; // 12dicts frequency band cut-off for enemy words (lengths 4-7)
const WAVE_BAND_3 = 21; // 3-letter enemy words: all bands (there are few 3-letter words)
const TWORD_BAND = 21; // treasure words may be rarer, ranked by band
const TWORDS_CAP = 1000;

async function cached(url, name) {
  mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, name);
  if (!existsSync(file)) {
    console.log(`downloading ${url}`);
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFileSync(file);
}

/** Minimal ustar reader: returns { name: Buffer } for regular files. */
function untar(buf) {
  const files = {};
  for (let off = 0; off + 512 <= buf.length; ) {
    const name = buf.toString('latin1', off, off + 100).replace(/\0.*$/s, '');
    if (!name) break;
    const prefix = buf.toString('latin1', off + 345, off + 500).replace(/\0.*$/s, '');
    const size = parseInt(buf.toString('latin1', off + 124, off + 136).replace(/\0.*$/s, '').trim() || '0', 8);
    const type = buf.toString('latin1', off + 156, off + 157);
    const full = prefix ? `${prefix}/${name}` : name;
    if (type === '0' || type === '\0' || type === '') files[full] = buf.subarray(off + 512, off + 512 + size);
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

/** Minimal zip reader (central directory; stored or deflated entries). */
function unzip(buf) {
  const files = {};
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip file');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(off + 10);
    const csize = buf.readUInt32LE(off + 20);
    const nlen = buf.readUInt16LE(off + 28);
    const elen = buf.readUInt16LE(off + 30);
    const clen = buf.readUInt16LE(off + 32);
    const local = buf.readUInt32LE(off + 42);
    const name = buf.toString('latin1', off + 46, off + 46 + nlen);
    const data = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(data, data + csize);
    if (!name.endsWith('/')) files[name] = method === 0 ? raw : inflateRawSync(raw);
    off += 46 + nlen + elen + clen;
  }
  return files;
}

// ---------------------------------------------------------------- blocklist
// Exact words (and their simple inflections, see isBlocked) that are not suitable for a
// family-friendly typing game: profanity, slurs, sexual/anatomical terms, violence and
// weapons, death, drugs/alcohol/tobacco, bodily functions, insults, gambling, religion-
// and politics-sensitive terms, and scary/depressing words.
const BLOCK = `
ass arse asses butt butts crap crapped crappy damn damned dang darn hell hells heck
piss pissed shit fart farts farted turd turds poo poop pooped pee peed pees wee wees
puke puked vomit vomited barf snot snotty phlegm pus feces fecal urine urinate dung manure
sewage sewer toilet toilets diarrhea enema bowel bowels rectum rectal anus anal
spat spittle
sex sexy sexual sexes sexed sexier sexiest sexism sexist nude nudes nudity naked nakedness
porn porno stripper striptease erotic erotica lust lusty lustful horny kinky
breast breasts boob boobs bosom bra bras nipple nipples penis vagina womb groin crotch testes testicle
scrotum semen sperm ovary ovaries uterus pubic pubes genital genitals bust busty buxom
virgin virginal virginity pregnant pregnancy abortion condom harlot whore slut pimp brothel
mistress lover lovers seduce seduced seduction orgy orgasm fetish affair adultery rape raped rapist
incest pervert perverse lewd obscene bawdy smut smutty raunchy titillate bedded
gay gays lesbian queer homo dyke fag faggot fags
nigger negro coon chink gook spic wop kike jap honky redneck gypsy gyp gypped
retard retarded idiot idiots moron morons imbecile cretin dumb dummy stupid loser losers lame
jerk jerks freak freaks bitch bitches bastard bastards wench hag hussy crone twit prat git
kill kills killed killer killers killing murder murdered murderer murderous slay slain slaughter
massacre homicide suicide assassin assassinate execute executed execution behead stab stabbed
stabbing shoot shot shoots shooting shooter gun guns gunner gunfire gunman gunmen pistol pistols
rifle rifles bullet bullets ammo shotgun cannon cannons bomb bombs bombed bomber bombing grenade
missile missiles warhead nuke nuclear explode explosive dynamite terror terrorist terrorism
war wars warfare warrior soldier soldiers army armies weapon weapons sword swords dagger daggers
knife knives spear spears axe axes torture tortured torment hostage kidnap kidnapped
victim victims violence violent brutal brute beaten beating choke choked
strangle hanged noose lynch flog slap slapped spank abuse abused abuser
assault attack attacks attacked fight fights fighting fought blood bloody bleed bleeding gore gory
wound wounded injury corpse corpses cadaver carcass dead death deaths deadly die died dies dying
grave graves coffin coffins funeral morgue skull skulls skeleton zombie demon demons devil devils
satan hellish evil curse cursed damnation doom doomed ghoul
drug drugs dope doped heroin cocaine meth opium marijuana stoned hooch
drunk drunken drunkard booze boozer beer beers wine wines liquor whiskey whisky vodka rum gin
brandy alcohol alcoholic tipsy hangover pub pubs saloon tavern cigar cigars cigarette
smoked smoker smoking tobacco nicotine vape addict addiction overdose
gamble gambler gambling casino bet bets betting wager poker
cancer tumor disease diseases plague leprosy leper syphilis herpes aids hiv
hate hated hates hatred racist racism nazi nazis slave slaves slavery
god gods jesus christ allah bible church mosque pray prayer sin sins sinner sinful
fat fatty fatso obese ugly
swine ho hoe hoes bum bums tit tits sot sots zit zits pox nun nuns
cock cocks cocky coke coked cokes oral orals ovum teat teats suck sucks sucked sucker scum scums
babe babes hick hicks thug thugs geld gelds spay spays cyst cysts coma comas loin loins maim maims
slum slums slob slobs goon goons kink kinks acne bile riot riots cult cults sect sects pope papal
amen tomb tombs pyre pyres arson bigot booty fagot fetus felon harem lager macho nymph pussy sissy
thong thigh thighs udder uteri vices widow widows witch witches screw screws bribe fraud psych spasm
ulcer mucus lymph colic polio toxin pagan rabbi vicar psalm deity deify crypt dirge elegy goner
nuder unman abort aborted aborts crime crimes criminal prison prisoner jail jails convict
weed weeds stoned junkie hippie hippy wino booze dope sniper ambush raid raids invade invasion
mafia gangster gang gangs thief thieves steal steals stolen robber robbery burglar burglary
corset lingerie panties undies bikini diaper diapers tampon bladder kidney liver colon intestine
scar scars wound wounds rash rashes louse lousy lice leech leeches maggot maggots cockroach
sewer flatulent laxative bra bras bosom hooker hookers stud studs hunk hunks
bimbo boozy butch campy detox jihad gulag squaw welsh pansy pygmy potty prick wacko lupus edema fetal
aorta renal palsy sinus lipid retch pinup vixen tryst unwed flesh siege saber salvo fatal heist binge fiend
filth harpy lifer hater mecca synod mufti padre laity tithe druid tarot matzo cabal junta
abduct afghan armpit bugger carnal cervix coolie ghetto gringo geisha midget molest sadism sadist psycho
voyeur libido urinal pogrom napalm opiate peyote mullah eunuch sputum sepsis hernia pelvis pelvic eczema angina
biopsy bedpan bookie hearse entomb exhume embalm musket magnum lethal mayhem strafe kisser pantie inmate inbred
lesion mugger biggie weirdo yuppie lunacy scotch sherry cognac claret occult voodoo heresy unholy papacy gospel
sermon pulpit clergy cleric deacon homily rosary vestry priory pastor soviet sleaze sleazy unisex bummer doping
downer cystic slaver hijack impale corpus mucous myopia spleen gutted
abscess abusive adrenal alimony amputee anthrax arousal asshole ashtray atheism atheist autopsy baptism baptize
barmaid barroom bayonet bigotry bondage bootleg boudoir bourbon bribery bulimia buttock carbine carnage carotid
carrion cholera cohabit colitis commode coroner cremate cripple crucify cyanide deprave dervish diocese drugged
enslave epitaph fascism fascist firearm foxhole gallows gentile goddamn goddess godless godlike godsend groupie
gunshot handgun hangman heathen heretic homeboy hoodlum hospice immoral infidel inbreed jackass larceny latrine
liqueur liturgy machete menorah messiah mestizo mobster mulatto mugging nightie nirvana ovarian perjury perjure
phallic phallus playboy pontiff prelate profane puberty quickie redskin requiem sarcoma scumbag sensual slammer
steroid syringe tequila tetanus topless typhoid urethra urinary uterine warlord warpath wartime wedlock wiretap
martini lactate arsenic arsenal militia platoon brigade dragoon stalker cartel sternum trachea divorce
dick dicks john johns jock jocks lube vamp vamps shag cuss crud mead
toke tokes steamy garter garters
`;

// Substrings that block any word containing them (chosen so innocuous words survive).
const BLOCK_SUB = [
  'fuck', 'shit', 'cunt', 'bitch', 'bastard', 'whore', 'slut', 'nigg', 'fagg', 'dyke', 'penis', 'vagin',
  'porn', 'erotic', 'orgasm', 'masturb', 'sodom', 'paedo', 'rapist', 'incest', 'genital', 'testic', 'scrot',
  'clitor', 'sperm', 'semen', 'condom', 'nipple', 'boob', 'titty', 'crotch', 'murder', 'slaughter',
  'massacre', 'suicid', 'homicid', 'corpse', 'cadaver', 'behead', 'tortur', 'terror', 'bomb', 'grenade',
  'pistol', 'bullet', 'gunman', 'gunfire', 'gunner', 'shotgun', 'cocain', 'heroin', 'marijuan', 'opium',
  'narcot', 'alcohol', 'vodka', 'liquor', 'drunk', 'booze', 'tobacc', 'nicotin', 'casino', 'gambl', 'nazi',
  'racis', 'fetish', 'sexual', 'sexy', 'lesbian', 'homosex', 'bisex', 'transvest', 'prostitut', 'brothel',
  'pimp', 'piss', 'fart', 'turd', 'feces', 'fecal', 'diarrh', 'vomit', 'puke', 'enema', 'rectum', 'devil',
  'demon', 'satan', 'zombi', 'pregnan', 'virgin', 'naked', 'seduc', 'adulter', 'harlot', 'strangl', 'lynch',
  'hostage', 'kidnap', 'assassin', 'death', 'coffin', 'funeral', 'morgue', 'blood', 'gory', 'idiot', 'moron',
  'retard', 'stupid', 'cretin', 'imbecil', 'poop', 'queer', 'wench', 'abortion', 'killer', 'killing',
  'killjoy', 'cigarette', 'deadly', 'damnat', 'dumbass', 'whiskey', 'pedophil',
  'militar', 'weapon', 'religio', 'christ', 'church', 'cancer', 'diabet', 'prostat', 'urinat', 'homophob',
  'harass', 'prison', 'crimin', 'pregnat', 'shootout', 'sharpshoot', 'gunpo', 'gunfight', 'gunshot', 'handgun',
  'battlesh', 'battlefi', 'battlegr', 'sword', 'knife', 'stabb', 'witchcr', 'tombston', 'gravest', 'graveyard',
  'bacchan', 'explos', 'fistfight', 'prizefight', 'warhead', 'warmonger', 'intercourse', 'ejacul', 'menstru',
  'contracep', 'transsex', 'hermaphro', 'circumcis', 'flatul', 'excrement', 'defecat', 'laxat', 'hemorrh',
  'gonorr', 'venereal', 'aphrodis', 'promiscu', 'lecher', 'licentio', 'voluptu', 'impotenc', 'abortiv',
  'euthan', 'genocid', 'infantic', 'patricid', 'fratricid', 'regicid', 'pesticid', 'insecticid', 'herbicid',
  'concubin', 'courtesan', 'mistress', 'philander', 'debauch', 'deprav', 'sadomas', 'masochis', 'sadist',
  'paramour', 'nudis', 'bloodbath', 'bloodshed', 'bloodthirst', 'cutthroat', 'manslaught', 'executioner',
  'electrocut', 'decapitat', 'dismember', 'mutilat', 'disembowel', 'crucifi', 'immolat', 'assassinat',
  'atrocit', 'holocaust', 'carnage', 'firearm', 'ammunit', 'artiller', 'munition', 'cannibal', 'carcinog',
  'tumor', 'leukem', 'syphil', 'tubercul', 'heroine', 'narcotic', 'hallucin', 'intoxic', 'inebriat',
  'alcoholi', 'brewer', 'distill', 'bartend', 'barroom', 'saloon', 'nightclub', 'stripteas', 'lingerie',
  'blasphem', 'evangel', 'worship', 'vampir', 'traffick', 'poison', 'drinker', 'malignan', 'dementia', 'satanic',
  'underwear', 'underpant', 'brassiere', 'bosom', 'cleavage', 'buttock', 'backside', 'bottomless', 'topless',
  'womaniz', 'perver', 'obscen', 'flirt', 'intima', 'molest', 'grope', 'fondl', 'sensuo', 'sensual', 'polygam',
  'bigam', 'infidel', 'necro', 'mortici', 'mortuar', 'postmortem', 'brutal', 'combatan', 'combativ', 'warlike',
  'warring', 'warship', 'troopship', 'infantry', 'firepower', 'manhunt', 'marksman', 'onslaught', 'postwar',
  'antiwar', 'arouse', 'undress', 'strapless', 'vulgar', 'depress', 'warlock', 'crossfire', 'alluring', 'caress',
  'lovemak', 'hookup', 'insurg', 'pillag', 'seductiv', 'lustful', 'wanton', 'harlot', 'bishop', 'adulter', 'divorc', 'widow', 'concubin', 'eunuch',
];
// Words containing a BLOCK_SUB entry that are fine and should be kept.
const ALLOW = new Set(`
shell shells shellfish hello hellos seashell seashells eggshell eggshells nutshell nutshells
bumble bumblebee bumblebees bumpy bump bumps bumped bumper bumpers album albums bumpkin
skill skills skilled skillful skillet skillets kiln kilns killdeer
gaily
ward wards warden wardens wardrobe wary warily
lustre lustrous illustrate illustrated illustrates illustration illustrations illustrator lusters luster
crape scrap scraps scrape scraped scrapes scrapbook scrapper scrappy
arsenal parse parsed parses parsley parsnip parson
dumbbell dumbbells
farther farthest farthing
deadline deadlines
pistachio pistachios
lumbago
crumb crumbs crumble crumbled crumbles crumbly
plumb plumber plumbers plumbing plumbs plumbed
numb numbed number numbers numbered numbering numbness
thumb thumbs thumbed thumbtack thumbtacks
dumbo
rumba rumbas
hellenic
nudge nudged nudges nudging
breaststroke
whisker whiskers whiskered
shellac
swordfish swordfishes
bloodhound
`.split(/\s+/).filter(Boolean));


// Rare, archaic, technical or abbreviation-like words that pass the commonness filters; removed so enemy words stay recognisable to young players.
const OBSCURE = new Set(`
ado alb ale cis dis pis hes ins ifs ems mas pas ova cox nth rho pyx qua fer hep lam dos ids ohs
sic sod sop tho tor tun wen wot yon mil ell erg hie fie pol poi lib lei dun deb con gob hob tog
ken mar nit brr bung czar emir dike mien wive wist mete lade baud calk bani sics shes mans weer swum geed drys mads feds hove ting twee ism oho gad sim pap fop lea chi bur jib lox maw nix ope sac tam thy yen yuk eta
hepatic mastoid papilla femoral ventral diurnal epsilon minster provost proviso cloture coterie overlie nonuser
nonplus reagent valence tankard mimetic seminal excrete arraign draftee inquest
cation casein adduce evince sylvan maxima nuclei lading lactic niacin dioxin ashram animus dictum patois
polity cahoot tenths thirds warder welter mimosa feller enamor remand parlay punter jobber shiner costar prewar
deject docent lessee jurist legate septum schema settee tureen
legit snafu spunk besot ducal paean codex basal axial natal tenon thrum skeet credo ocher umber augur demur
ennui aegis dacha telex mogul scion servo wader divan canto folio mores terms weeks works sales nadir fiver
rupee ruble chino skein diode kiddo getup payer saver comer taker homer
bilk dork kook imam frat bozo exec coed urea loci anti conk dint miff slue rime tort axon berm mica sump tamp
semi thru nary pock beck cloy coif gird lien doth hath aver scat arty jeez shah gout alum apse agar boll roil
`.split(/\s+/).filter(Boolean));

// Everyday short words and interjections missing from the 12dicts frequency list
// (still required to be in ENABLE).
const EXTRA = new Set(`
aah hmm nah ooh pow shh yin zig zag zee biz pic pix veg yum yup alp rah phi tau mac ska yow hic gar cay
auk cod gnu ohm wiz asp rep ups tom lee pip zed fey bio bot bro fab rad app ick duh
`.split(/\s+/).filter(Boolean));

const blockSet = new Set(BLOCK.split(/\s+/).filter(Boolean));

function isBlocked(w) {
  if (ALLOW.has(w)) return false;
  if (blockSet.has(w)) return true;
  // simple inflections of exact blocked words
  for (const suf of ['s', 'es', 'ed', 'd', 'er', 'ers', 'ing', 'y', 'ies', 'ly']) {
    if (w.endsWith(suf) && blockSet.has(w.slice(0, -suf.length))) return true;
  }
  return BLOCK_SUB.some((s) => w.includes(s));
}

// ---------------------------------------------------------------- scoring

function charValue(c) {
  if ('ASDFGHJKLE'.includes(c)) return 1;
  if ('RTYUIMNVB'.includes(c)) return 2;
  if ('QZXCWPO0123456789'.includes(c)) return 3;
  return 4;
}
const wordValue = (w) => [...w].reduce((n, c) => n + charValue(c), 0);

/** Deterministic PRNG (mulberry32) so output is stable between runs. */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- main

async function main() {
  const enable = new Set(
    (await cached(ENABLE_URL, 'enable1.txt'))
      .toString('latin1')
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter((x) => /^[a-z]+$/.test(x)),
  );

  // scowl[word] = lowest SCOWL size level containing it
  const scowl = new Map();
  const tar = untar(gunzipSync(await cached(SCOWL_URL, 'scowl-2020.12.07.tar.gz')));
  for (const [name, buf] of Object.entries(tar)) {
    const m = /\/final\/(english|american)-words\.(\d+)$/.exec(name);
    if (!m) continue;
    const lv = Number(m[2]);
    for (const raw of buf.toString('latin1').split(/\r?\n/)) {
      const w = raw.trim();
      if (!/^[a-z]+$/.test(w)) continue; // drops capitalised words, apostrophes, accents
      if (!scowl.has(w) || scowl.get(w) > lv) scowl.set(w, lv);
    }
  }

  // band[word] = 12dicts frequency band (1 = most frequent); inflections share their lemma's band
  const band = new Map();
  const zip = unzip(await cached(DICTS_URL, '12dicts-6.0.2.zip'));
  const frq = Object.entries(zip).find(([n]) => n.endsWith('2+2+3frq.txt'));
  if (!frq) throw new Error('2+2+3frq.txt not found in 12dicts zip');
  let cur = 0;
  for (const line of frq[1].toString('latin1').split(/\r?\n/)) {
    const m = /^-+ (\d+) -+$/.exec(line.trim());
    if (m) {
      cur = Number(m[1]);
      continue;
    }
    for (let w of line.split(/[,\s]+/)) {
      w = w.replace(/[*!]$/, '');
      if (/^[a-z]+$/.test(w) && !band.has(w)) band.set(w, cur);
    }
  }

  const usable = (w, maxBand) =>
    enable.has(w) &&
    (EXTRA.has(w) || ((scowl.get(w) ?? 999) <= SCOWL_LEVEL && (band.get(w) ?? 999) <= maxBand)) &&
    !isBlocked(w) &&
    !OBSCURE.has(w);
  const all = [...new Set([...band.keys(), ...EXTRA])].sort();

  // waves.txt
  let waves = '';
  const waveCounts = {};
  for (let n = 3; n <= 7; n++) {
    const list = all.filter((w) => w.length === n && usable(w, n === 3 ? WAVE_BAND_3 : WAVE_BAND));
    waveCounts[n] = list.length;
    waves += `#LENGTH-${n}\r\n${list.map((w) => w.toUpperCase()).join('\r\n')}\r\n#END\r\n\r\n`;
  }

  // twords.txt
  const buckets = new Map();
  for (const w of all) {
    if (w.length < 3 || w.length > 19 || !usable(w, TWORD_BAND)) continue;
    const d = wordValue(w.toUpperCase());
    if (d < 3 || d > 21) continue;
    if (!buckets.has(d)) buckets.set(d, []);
    buckets.get(d).push(w);
  }
  let twords = '';
  const tCounts = {};
  for (let d = 3; d <= 21; d++) {
    let list = buckets.get(d) ?? [];
    if (list.length > TWORDS_CAP) {
      // keep the most frequent words; ties broken by a seeded shuffle (deterministic)
      const r = rng(1000 + d);
      list = list
        .map((w) => [(band.get(w) ?? 21) + r(), w])
        .sort((a, b) => a[0] - b[0])
        .slice(0, TWORDS_CAP)
        .map((x) => x[1]);
    }
    list.sort();
    tCounts[d] = list.length;
    twords += `#DIFF-${d}\r\n${list.map((w) => w.toUpperCase()).join('\r\n')}\r\n#END\r\n\r\n`;
  }

  mkdirSync(OUT, { recursive: true });
  writeFileSync(path.join(OUT, 'waves.txt'), waves, 'latin1');
  writeFileSync(path.join(OUT, 'twords.txt'), twords, 'latin1');
  console.log('waves.txt', waveCounts);
  console.log('twords.txt', tCounts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
