# ST Arc — Website Redesign

Premium dark landing page za ST Arc d.o.o., Split.

## Struktura projekta

```
st-arc/
├── index.html          ← Glavna HTML stranica
├── css/
│   └── style.css       ← Svi stilovi (design tokens, layout, animacije)
├── js/
│   └── main.js         ← Cursor, scroll-reveal, sticky nav
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

## Kontakt (stvarni podaci)

- Email: info@st-arc.hr
- Tel: +385 21 339 861
- Tel: +385 98 265 642
- Adresa: Dubrovačka 49, 21000 Split, Hrvatska
