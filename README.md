# ST Arc — Website Redesign

Premium dark landing page za ST Arc d.o.o., Split.

## Struktura projekta

```
st-arc/
├── index.html          ← Glavna HTML stranica
├── css/
│   └── style.css       ← Svi stilovi (design tokens, layout, animacije)
├── js/
│   ├── main.js         ← Cursor, scroll-reveal, sticky nav, hash router
│   ├── lang.js         ← i18n prijevodi (HR, EN, DE, IT, ES, FR, NL, PT, RU, ZH, AR)
│   └── catalogues.js   ← PDF katalog modul (thumbnails + reader modal)
├── images/
│   ├── hero-fontana.jpg              ← Hero pozadina (fontana, dvorac)
│   ├── projekt-01-hnk.jpg            ← Projekt: Zagreb HNK
│   ├── projekt-02-markov-trg.jpg     ← Projekt: Markov trg
│   ├── projekt-03-adventska-ulica.jpg← Projekt: Adventska ulica
│   ├── projekt-04-trg-jelacic.jpg    ← Projekt: Trg bana Jelačića (aerial)
│   ├── about-split-marmontova.jpg    ← About: Split Marmontova
│   ├── about-dubrovnik.jpg           ← About: Dubrovnik (accent slika)
│   ├── cta-stabla.jpg                ← CTA pozadina (inox stabla)
│   └── zagreb-ulica-aerial.jpg       ← Rezervna slika (nije korištena)
├── katalozi/                         ← PDF katalozi
│   ├── 2018.pdf
│   ├── 2019-2020.pdf
│   ├── katalog-maskare.pdf
│   └── posebno-izdanje-2015.pdf
└── README.md
```

## Fontovi

Učitavaju se s Google Fonts u `<head>` od `index.html`:
- **Cormorant Garamond** — naslovi, citati, dekorativni brojevi
- **Montserrat** — tijelo teksta, navigacija, labele

## Dizajn sistem

| Token          | Vrijednost |
|----------------|------------|
| `--gold`       | `#C9973A`  |
| `--gold-light` | `#E8C06A`  |
| `--dark`       | `#090A0F`  |
| `--dark-2`     | `#0F1018`  |
| `--dark-3`     | `#161820`  |
| `--dark-4`     | `#1E2030`  |
| `--text`       | `#E8E4DC`  |
| `--text-muted` | `#8A8880`  |

## JavaScript funkcionalnosti

- **Custom cursor** — zlatna točka s lagiranim prstenom (smooth pratnja)
- **Scroll reveal** — `.reveal` elementi se fade-in kada uđu u viewport
- **Sticky nav** — navigacija postaje frosted glass pri scrollu > 80px
- **Contact modal** — forma za upit s mailto fallbackom
- **Scroll progress** — zlatna linija na vrhu stranice
- **Stat counter** — animirano odbrojavanje brojki u hero sekciji
- **Ken Burns** — suptilni zoom/pan efekt na hero pozadini
- **Hash router** — `#/katalozi` ruta za prikaz katalog stranice
- **PDF viewer** — PDF.js thumbnail rendering + fullscreen reader modal

## Kako dodati novi katalog

1. Stavi PDF datoteku u `katalozi/` folder
2. U `js/catalogues.js` dodaj objekt u `CATALOGUES` array:
   ```javascript
   {
     id:       'kat-05',
     file:     'katalozi/novi-katalog.pdf',
     titleKey: 'cat5_title',
     descKey:  'cat5_desc',
     year:     '2024'
   }
   ```
3. U `js/lang.js` dodaj prijevode `cat5_title` i `cat5_desc` za sve jezike
4. Commit & push — gotovo.

> **Napomena:** Cover slike se ne koriste. Thumbnail se automatski generira
> iz prve stranice PDF-a pri svakom posjetu (PDF.js rendering).

## Kontakt (stvarni podaci)

- Email: info@st-arc.hr
- Tel: +385 21 339 861
- Tel: +385 98 265 642
- Adresa: Dubrovačka 49, 21000 Split, Hrvatska
