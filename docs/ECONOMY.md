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
| **Sezonas caurlaide** (bezmaksas + premium celiņš, `pass_s1` jau ir katalogā) | stabils ienākums, 6–8 nedēļu mērķis | daudz satura katrai sezonai |
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
