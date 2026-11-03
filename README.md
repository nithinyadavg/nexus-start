# Nexus

**A start page that feels like a TV home screen.** The sky outside plays behind it (rain, snow, fog, storms,
stars, sunrise and sunset), your world clocks flip, and the sites you use sit in glass tiles. Mouse, trackpad,
touch, keyboard, or full-screen TV mode.

**Try it:** https://nithinyadavg.github.io/nexus-start/

- **No account, no sign-in, no tracking.** A one-minute setup asks your name, your city, your clocks and the sites
  you use; the answers stay in your browser. The only thing that leaves it is the weather lookup.
- **Suites in one tile.** Google, Microsoft 365 and iCloud each open a panel with all their apps, like the app grid
  in Google's corner.
- **It learns what you use** — in your browser only. After a few visits a *Most used* row appears, ranked by how
  often and how recently you open each site.
- **Search like a launcher.** Start typing anywhere. `Tab` switches engine (Google, DuckDuckGo, Bing, Brave, Ecosia,
  Startpage). `!yt`, `!gh`, `!w`, `!m`, `!r`, `!c`, `!g` search YouTube, GitHub, Wikipedia, Maps, Reddit, Claude or
  ChatGPT instead. A web address goes straight there.
- **Back up and move.** Settings → *Back up my setup* saves a small `.json` you can restore in any browser.

| Keys | |
|---|---|
| type anything | search |
| `/` | jump to search · `Tab` engine · `Esc` back to the tiles |
| `←` `↑` `→` `↓` · `Enter` | move · open (`⌘`/`Ctrl`-click for a new tab) |
| `⇧F` | TV mode (full screen; the pointer hides when still) |

## Make it your start page

- **As your new tab (Chrome, Edge, Brave):** download this repo (Code → Download ZIP) and unzip it, open
  `chrome://extensions`, turn on **Developer mode**, **Load unpacked**, and pick the folder. Every new tab is Nexus.
- **As your home page:** Chrome → Settings → On start-up → *Open a specific page* → the address above.
  Safari → Settings → General → Homepage. Firefox → Settings → Home → Custom URLs.

## Make it yours (fork it)

Everything it can offer lives in **`catalog.js`**: categories, sites, suites, search engines and `!` shortcuts. Add a
site with an `id`, `name`, `url`, an `icon` from `icons.js` (or none, to show its name) and a `color` for the light it
casts. The setup picks it up by itself.

To add logos, `icons.js` is generated from [theSVG](https://github.com/glincker/thesvg) and [Lucide](https://lucide.dev):

```bash
npm pack @thesvg/icons lucide-static && for f in *.tgz; do mkdir -p "${f%.tgz}" && tar xzf "$f" -C "${f%.tgz}"; done
node make-icons.js thesvg-icons-*/package/dist lucide-static-*/package/icons > icons.js
```

Publish your fork with **Settings → Pages → Deploy from a branch → `main` / root**. No build step: it's plain HTML,
CSS and JavaScript, and works opened straight from disk too. Please swap the phoenix (`sign.png`, `icon128.png`) for
your own mark.

## How it was decided

- **What's in the catalogue.** The popular picks follow [Similarweb's most-visited sites](https://en.wikipedia.org/wiki/List_of_most-visited_websites)
  (August 2026): Google, YouTube, Facebook, Instagram, ChatGPT, X, Reddit, WhatsApp, Wikipedia, Amazon, Gemini,
  LinkedIn, Netflix, Microsoft 365, Outlook, Claude, GitHub… leaving out search engines (they're in the search bar),
  adult and gambling sites, and portals.
- **What a start page needs.** The ones people keep ([awesome-startpage](https://github.com/jnmcfly/awesome-startpage):
  Bonjourr, Casca, Dashy, Homepage, KeyJump, Tilde) share search first, sites grouped by what they're for, one
  consistent look, and keyboard-first use. Nexus adds a pointer that never fights the keyboard: hover moves focus, but
  only when the mouse really moved.
- **Logos.** [theSVG](https://github.com/glincker/thesvg) has 7,600+ brands in full colour with dark-mode variants
  (MIT, most logos CC0), against Simple Icons' single colour or svgl's ~400 ([comparison](https://dev.to/thegdsks/i-tested-every-open-source-brand-svg-library-so-you-dont-have-to-2026-edition-3jcc)).
  Logos that vanish on dark glass are drawn in white.
- **Privacy by construction.** No analytics, no cookies, no server. Location comes from your connection
  ([GeoJS](https://www.geojs.io)) or a city you pick ([Open-Meteo geocoding](https://open-meteo.com/en/docs/geocoding-api));
  weather from [Open-Meteo](https://open-meteo.com).

## Credits

Made by [Nithin Yadav Gopinath](https://nithinyadavg.me). Logos: theSVG (MIT; logos CC0 unless noted), owned by their
brands. Glyphs: Lucide (ISC). Font: Inter (SIL OFL). MIT licence.
