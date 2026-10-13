# Bridge Money (BM) ekonomika

Īss, praktisks apraksts: no kurienes BM nāk, kur tie aiziet, kādi ir skaitļi un kā kontrolēt inflāciju.
Visi skaitļi dzīvo serverī (`supabase/migration_012_economy.sql`, `migration_003_progress.sql`, `migration_008_cosmetics.sql`);
klienta spoguļkopija ir `src/economy/config.ts` un `src/progress/achievements.ts` (testi pārbauda, ka tie sakrīt).

**Pamatprincipi**

- BM nav naudas vērtības, to nevar izņemt, pārdot vai nodot citam spēlētājam. Par eiro var tikai *pirkt* BM paciņas.
- Visas izmaksas un cenas nosaka serveris; klients tikai pasaka, *ko* grib (griezt ratu, sākt likmi, kalt relikviju).
- Pastiprinājumi (boosts) maina tikai **balvas**, nekad kārtis spēlē pret īstiem cilvēkiem. Vairogs darbojas tikai likmju galdā pret botiem.
- Laimes rata izredzes ir publicētas spēlē (poga “Izredzes”).

---

## 1. BM cikls

```
 SPĒLĒ ──► XP ──► līmeņi ──► BM            DIENAS BALVA ──► BM
   │                                           │
   ├─► sasniegumi ──► BM + XP + šķembas ◄──────┘
   │                        │
   │                        ▼
   │                 KOLEKCIJAS (šķembas ► relikvijas ► ekskluzīvs priekšmets)
   ▼
 TĒRĒ BM:  veikals (kosmētika) · Laimes rata papildgriezieni · pastiprinājumi · augsto likmju galdi
   ▲                                                                   │
   └──────────── atgriežas: rata balvas, likmju banka (ja uzvar) ◄────┘
 PRESTIŽS (50. līmenis): līmenis → 1, līmeņu balvas var nopelnīt vēlreiz → spēlētājs nekad “nepabeidz”.
```

### Avoti (BM ienāk)

| Avots | Cik | Ierobežojums |
|---|---|---|
| Spēle | 100 BM uzvara / 10 BM zaudējums + 25–85 XP | maks. 60 apmaksātas spēles dienā, 1 spēle / 30 s |
| Līmenis | 50 × L BM (katrs 5. līmenis ×2) | tikai pieaugot |
| Dienas balva | 100 → 1 000 BM (7 dienu cikls, vid. ~380/dienā) | 1× dienā (Rīgas laiks) |
| Sasniegumi | 85 gab., kopā ~155 700 BM + 27 400 XP + 214 šķembas | katrs vienreiz kontā |
| Laimes rats (bezmaksas) | vid. ~177 BM + XP/šķembas/pastiprinājumi | 1× dienā |
| Likmju galds (uzvara) | banka = iemaksa × 2,5 (+10 % ar Laimīgo jaukšanu) | 10 likmes/dienā, tīrā peļņa ≤ 20 000 BM/dienā |
| BM paciņas par € | 5 000–80 000 BM | maksājumi vēl nav ieslēgti |

### Patēriņš (BM aiziet)

| Izlietne | Cena | Kāpēc tas ir interesanti |
|---|---|---|
| Veikals | 900–12 000 BM priekšmets, paciņas 3 500–27 900 | redzams statuss, kolekcionēšana (Collector sasniegumi) |
| Rata papildgriezieni | 300 · 600 · 1 200 · 2 000 · 3 000 BM (maks. 5/dienā) | “vēl vienu!” sajūta; vidēji atdod ~177 BM, tātad tīra izlietne |
| XP ×2 (1 h) | 900 BM | ātrāk līdz nākamajam līmenim/prestižam |
| Laimīgā jaukšana (24 h) | 1 500 BM | +10 % BM no uzvarām un likmju bankām |
| Vairogs | 500 BM (līdz 5) | mīkstina pīķa dāmu likmju spēlē (5 → 3 kārtis) |
| Likmju galdi | 250 / 1 000 / 5 000 BM iemaksa | lielākais adrenalīns; nama priekšrocība dēļ 1 no 4 sēdvietām |

**Likmju matemātika.** Galdā ir 3 grūtie boti, tātad nejaušs spēlētājs uzvar ~25 %:
paredzamā vērtība = 0,25 × 2,5 − 1 = **−37,5 %** no iemaksas. Lai būtu “pa nullēm”, vajag 40 % uzvaru.
Labs spēlētājs var nopelnīt, bet vidēji galdi BM izņem no ekonomikas. Ja spēle beidzas ātrāk par 90 s vai `record_game`
ir ierobežots, likme tiek anulēta; jaunas likmes sākšana vai iziešana no galda = zaudēta iemaksa.

---

## 2. Mērķa skaitļi dienā

| | Ikdienas spēlētājs (~15 min, 5 spēles) | Aktīvais spēlētājs (1–2 h, 20–30 spēles) |
|---|---|---|
| Spēles | ~275 BM (50 % uzvaru) | ~1 100–1 600 BM |
| Līmeņi | ~150 BM | ~600–900 BM |
| Dienas balva + rats | ~550 BM | ~550 BM |
| Sasniegumi (pirmās nedēļas) | ~1 000 BM/dienā, vēlāk ~200 | ~2 000 BM/dienā, vēlāk ~500 |
| **Ienāk kopā** | **~1 000–2 000** | **~2 500–4 000** |
| Tērē (mērķis) | 1 papildgrieziens + reizi nedēļā priekšmets ~3 500 → **~800/dienā** | 2–3 griezieni, pastiprinājums, 2–4 likmes → **~2 500–3 500/dienā** |
| Rezultāts | jauns priekšmets ik 3–5 dienas | leģendārs priekšmets ~1× nedēļā, pārējais aiziet likmēs |

Svarīgākais rādītājs: **vidējais BM atlikums uz aktīvo spēlētāju** (admin panelī `bm_balance_total / players`).
Ja tas aug ilgāk par 2 nedēļām pēc kārtas — ekonomika inflē, skat. sviras zemāk.

---

## 3. Pretinflācijas sviras (no vieglākās)

1. **Rata svari** — tabula `wheel_prizes` (maināma ar SQL bez jaunas versijas). Piem., 100 BM svaru pārlikt uz XP.
2. **Papildgriezienu cenas** — masīvs `prices` funkcijās `wheel_spin` un `economy_state`.
3. **Jauni veikala viļņi** — leģendāri priekšmeti 10–15 k BM un ierobežota laika paciņas (sezonas).
4. **Likmju griesti** — `20000` (dienas peļņa) un `10` (likmes dienā) funkcijās `stake_start` / `stake_finish`.
5. **Pastiprinājumu cenas** — `buy_boost`.
6. **Spēles balvas** — `record_game` (100/10 BM) un 60 spēļu dienas limits.
7. **Prestižs** — ja līmeņu balvas pēc prestiža rada pārāk daudz BM, tās var samazināt uz pusi prestiža spēlētājiem.

Uzraudzībai: tabula `economy_log` (katra rata griešana, pastiprinājums, likme, kalšana, prestižs ar `bm_delta`) un
`purchases` (`wheel_spin`, `boost_xp2`, `boost_lucky`, `boost_shield` parādās admin “Veikals” cilnē kā preces).

---

## 4. Kas spēlētāju “ievelk” (pievilkšanas mehānika)

- **Dienas ieradums:** dienas balva + bezmaksas rata grieziens + dienas sērijas sasniegumi (7 / 30 / 100 dienas).
- **Gandrīz klāt:** zālē sadaļa “Gandrīz klāt” rāda 3 tuvākos sasniegumus ar progresu (88/100) — tas mudina uz vēl vienu spēli.
- **Noslēpumi:** 13 slēptie sasniegumi ar mīklainu mājienu — iemesls izmēģināt neparastas kombinācijas.
- **Kinematogrāfiska atklāšana:** zelta, platīna un slēptās medaļas parādās ekrāna centrā; bronza/sudrabs — kā paziņojums.
- **Vitrīna:** 3 piespraustas medaļas profilā — sociāls statuss (`public_showcase` citiem spēlētājiem).
- **Retums:** katrai medaļai “X % spēlētāju to ir ieguvuši” — retas medaļas kļūst vērtīgas.
- **Kolekcijas:** šķembas → relikvijas → ekskluzīvs rāmis/vārda krāsa/banneris, ko nevar nopirkt.
- **Prestižs:** pēc 50. līmeņa cikls sākas no jauna ar zvaigzni un ekskluzīvu rāmi.

---

## 5. Turpmākās idejas (plusi / mīnusi)

| Ideja | + | − |
|---|---|---|
| ~~**Sezonas caurlaide**~~ — ieviesta, skat. 6. sadaļu | stabils ienākums, 6–8 nedēļu mērķis | daudz satura katrai sezonai |
| **Dienas/nedēļas uzdevumi** (“izspēlē 3 astotniekus”) | īss mērķis katru dienu, var dot šķembas | jāseko, lai nebūtu nogurdinoši |
| **Turnīri ar BM iemaksu pret īstiem spēlētājiem** | ļoti aizraujoši, sociāli | Uzmanību: ja BM var nopirkt par €, likmes starp cilvēkiem var tikt uzskatītas par azartspēli (LV/ES) — tikai ar ieejas maksu un fiksētām kosmētikas balvām, nevis BM banku |
| **Klubi/ģildes ar kopīgu kasi** | piederība, atgriešanās | moderācija, krāpšanās risks |
| **Vārda maiņa / profila efekti par BM** | vienkārša izlietne | maza vērtība |
| **Revanšs ar “apdrošināšanu”** (atgūst 50 % likmes, ja zaudē par ≤ 5 punktiem) | mazina vilšanos | sarežģī likmju matemātiku |
| **Dāvanas draugiem (kosmētika, nevis BM)** | vīrusu efekts | BM tirgus/“fermēšanas” risks — BM pārskaitījumus neieviest |
| **Ierobežota laika veikals (rotācija 24 h)** | FOMO, regulāri apmeklējumi | spēlētāji var justies spiesti |
| **Maksas noslēpuma kastes** | ienākumi | Uzmanību: “loot box” regulējums (BE/NL aizliegts); ja ievieš — tikai par nopelnītiem resursiem un ar publicētām izredzēm |
| **Kluba reitinga līgas ar sezonas balvām** | ilgtermiņa mērķis labākajiem | vajag pietiekami daudz spēlētāju |

**Juridiska piezīme.** Papildgriezienus par BM var uzskatīt par nejaušības balvu par līdzekļiem, kas netieši pirkti par €.
Riska mazināšana jau iebūvēta: izredzes publicētas, balvas nav pārdodamas/nododamas, maks. 5 papildgriezieni dienā,
BM nav izņemami. Pirms maksājumu ieslēgšanas ieteicams to apstiprināt ar juristu.

---

## 6. Sezonas caurlaide (`supabase/migration_016_season.sql`, `/season`)

**1. sezona “Džeza laikmets”**: 8 nedēļas (datumi tabulā `seasons`, maināmi ar vienu `update`), 40 pakāpes, divi celiņi.
Klienta spoguļkopija: `src/season/data.ts` (tests `src/season/season.test.ts` salīdzina ar SQL).

**Zvaigznes** (sezonas XP; 100 ★ = 1 pakāpe, 1. pakāpe ir uzreiz, 40. pakāpei vajag 3 900 ★):

| Avots | ★ | Dienas griesti |
|---|---|---|
| Uzvarēta / zaudēta spēle (tikai apmaksātās, t.i. līdz 60 dienā) | 5 / 2 | 300 |
| Dienas uzdevums · nedēļas uzdevums · nedēļas lāde | 10 · 25 · 50 | 200 |
| Dienas izaicinājums (`season_add_xp(uid, 15, 'challenge')` no 014) | 15 | 30 |
| Sasniegums (bronza · sudrabs · zelts · platīns) | 5 · 10 · 20 · 40 | 400 |

Spēles, uzdevumi un sasniegumi zvaigznes dod caur trigeriem (`profiles`, `player_quests`), tāpēc nevienu esošo funkciju nevajadzēja mainīt.
Ikdienas spēlētājs (5 spēles + 3 dienas uzdevumi + izaicinājums + nedēļas uzdevumi) pabeidz caurlaidi ~7. nedēļā; aktīvais ~4. nedēļā.

**Balvas** (kopā): bezmaksas celiņš 15 250 BM, 17 šķembas, 4 rata griezieni, 2 × XP ×2, 2 kosmētikas (titulu “Debitants”, kāršu muguru “Džeza biļete”).
Premium celiņš: 8 ekskluzīvi stili (galds “Džeza klubs”, kāršu mugura “Zeltītais deko”, rāmis “Džeza laikmeta oreols”, tituls “Maestro”,
vārda krāsa “Šampanietis”, banneris, emociju paka, uzvaras efekts “Šampanieša šalts”) + 6 900 BM, 250 💎, 26 šķembas, 12 griezieni.
Papildu BM ~270/dienā bezmaksas celiņā — mazāk par 15 % no ikdienas ienākumiem, inflāciju būtiski nemaina.

**Cenas**: Premium 950 💎 (≈ €9,99 paka), pakāpes izlaišana 150 💎/pakāpe. Tikai dimanti — nekad BM. Admins/god: premium un izlaišana bez maksas.
Premium celiņa 250 💎 atdod ~26 % cenas (motivē nākamo sezonu, bet neatmaksā to). “Rata grieziens” ir bezmaksas grieziens ar publicētajām izredzēm
(`wheel_prizes`), nevis pārdodama nejaušības balva.

**Nākamā sezona**: jauns `seasons` ieraksts (`s2`, datumi), 80 `season_rewards` rindas, jauni `s2_*` stili `shop_items` (price_bm null) un
`src/season/cosmetics.ts`. Balvas var saņemt vēl 14 dienas pēc sezonas beigām (`grace_days`).

---

## 7. Mini spēles (`supabase/migration_019_minigames.sql`, `/games`)

Bridge 125 paliek galvenā — un vislabāk apmaksātā — spēle. Mini spēles (Zole, Durak, Pasjanss, Sudoku …) ir “vairāk spēļu” slānis
ar to pašu kontu, BM, XP, uzdevumiem, sezonas zvaigznēm un medaļām. Klienta spoguļkopija: `src/games/rewards.ts` (tests salīdzina ar SQL).

| Spēle | Uzvara (normāls) | Līmenis: viegls ×0,75 · normāls ×1 · grūts ×1,25 · eksperts ×1,5 | Zaudējums | Dienas mīklas bonuss |
|---|---|---|---|---|
| Zole | 40 BM · 30 XP | 30 / 40 / 50 / 60 BM · 23 / 30 / 38 / 45 XP | 5 BM · 8 XP | — |
| Durak | 35 BM · 25 XP | 26 / 35 / 44 / 53 BM · 19 / 25 / 31 / 38 XP | 5 BM · 8 XP | — |
| Pasjanss | 30 BM · 20 XP | 23 / 30 / 38 / 45 BM · 15 / 20 / 25 / 30 XP | 0 BM · 5 XP | — |
| Sudoku | 30 BM · 20 XP | 23 / 30 / 38 / 45 BM · 15 / 20 / 25 / 30 XP | 0 BM · 5 XP | +50 BM · +25 XP (1× par dienas mīklu) |

- **Griesti**: SQL `CHECK` neļauj nevienai mini spēlei (arī admina pievienotai) maksāt eksperta līmenī ≥ 100 BM / 85 XP (Bridge uzvara).
- **Limiti**: 30 apmaksātas spēles dienā katrā spēlē un 60 kopā; spēle īsāka par `min_seconds` netiek skaitīta (`fast`);
  starp diviem vienas spēles rezultātiem jāpaiet `min_seconds` (`slow`). Pēc limita spēle skaitās statistikā, uzdevumos un tabulās, bet nemaksā.
- **Sezona**: apmaksāta mini spēle +3 ★ (uzvara) / +1 ★ (zaudējums) no tās pašas dienas ‘game’ kvotas (300 ★) kā Bridge.
- **Uzdevumi**: spēlētājs, kas pēdējās 14 dienās spēlējis kādu mini spēli, saņem **vienu papildu** dienas spēļu uzdevumu (120–150 BM);
  Bridge 3 dienas + 5 nedēļas uzdevumi un nedēļas lāde nemainās.
- **Medaļas**: kategorija “Spēles” — 9 medaļas (100–1 500 BM), piem., “Zoles meistars” (25 Zoles uzvaras), “Nekad muļķis” (5 Durak uzvaras pēc kārtas),
  “Kā pulkstenis” (dienas mīkla 7 dienas pēc kārtas).
- **Admin**: `select minigame_set('zole', '{"win_bm": 45, "daily_cap": 20}')` (admin/god) — maina vai pievieno spēli; `active = false` to paslēpj no balvām.

Pat 60 apmaksātas mini spēles dienā, visas uzvarētas eksperta līmenī, dod ≤ ~3 600 BM (+ dienas mīkla un uzdevums) — mazāk nekā 60 Bridge uzvaras
(6 000 BM), un parastam spēlētājam tās ir dažas spēles starp partijām, tāpēc inflāciju tas būtiski nemaina.

## 8. Spēļu zāles sociālais slānis (`supabase/migration_022_games_social.sql`, `/games`, `/c/<kods>`)

Viss karājas uz `minigame_results` trigeriem — `record_minigame` (019) paraksts un ķermenis nemainās.

| Mehānika | Kā strādā | Balva |
|---|---|---|
| **Dienas spēle** | Viena aktīva mini spēle katru Rīgas dienu (`minigame_of_day()`, md5 izvēle). `BEFORE INSERT` trigeris | +50 % no bāzes uzvaras/zaudējuma BM un XP (ne no dienas mīklas bonusa); bāze + bonuss < 100 BM / 85 XP (Bridge uzvara). Eksperta Zole: 60 + 30 = 90 BM |
| **Nedēļas turnīrs** | Pirmdiena–svētdiena (Rīga), viena spēle pēc kārtas pa visām aktīvajām `minigames` (pēc `sort`; jaunas spēles pievienojas pašas). Bezmaksas — skaitās katra nedēļas spēle. Metrika: kāršu spēlēm “visvairāk uzvaru”, mīklām “labākais rezultāts”. Kvalifikācija: ≥ 3 spēles + uzvara. Admin: `tournament_set('2026-10-19', 'sudoku', 'score')` | #1 3 000 BM + tituls “Čempions” + rāmis “Pjedestāla lauri” · #2 1 800 BM + tituls “Finālists” + rāmis · #3 1 000 BM + tituls + rāmis · top 10 % 300 BM + nozīmīte. #N tikai, ja ir vairāk nekā N kvalificētu spēlētāju |
| **Maratons** | 3 dažādas mini spēles vienā Rīgas dienā → lāde (`games_marathon_claim`) 1× dienā | 200 BM + 40 XP |
| **Izaicini draugu** | `challenge_create` saglabā spēli, sēklu (seed), līmeni un autora rezultātu (pārbaudīts pret `minigame_results`); saite `bridge125.com/c/<kods>` derīga 30 dienas; viesis var skatīt un spēlēt (salīdzinājums lokāli), ielogots saglabā 1. mēģinājumu | Nemaksā BM — tikai gods un tabula (spēle pati maksā kā parasti) |
| **Kāršu zāles līmenis** | Klienta aprēķins no `minigame_stats`: 10 XP/uzvara, 3/zaudējums, 15/dienas mīkla, 5/labākās sērijas diena, +25 par katru uzvarētu spēli; līmenis L = 40·(L−1)·L | Nemaksā — progresa sajūta un vitrīna |

Inflācija: turnīrs izmaksā ~5 800 BM + ~0,3 × N₁₀ BM nedēļā **visiem kopā** (N₁₀ = top 10 % spēlētāju skaits), dienas spēle — līdz +50 % no vienas
spēles bāzes (≤ ~1 000 BM dienā pat pie 30 apmaksātām eksperta uzvarām), maratons ≤ 200 BM dienā. Bridge paliek vislabāk apmaksātā spēle.
