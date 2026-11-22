# Naki Bodenplaner – iOS & Android

Expo-App (React Native), die den Naki Bodenplaner als native App für iPhone/iPad und Android bereitstellt.

- **Bundle-ID iOS / Paketname Android:** `ch.nakigmbh.bodenplaner`
- **Sprache:** Deutsch (Schweiz)
- **Expo SDK:** 58

## Aufbau

| Datei | Inhalt |
|---|---|
| `web/index.html` | Die eigentliche Bodenplaner-App (WebGL, Katalog, Meine Böden). Hier Böden, Texte, E-Mail ändern. |
| `src/webapp.ts` | Automatisch aus `web/index.html` erzeugt – nicht von Hand bearbeiten. |
| `App.tsx` | Native Hülle: WebView + Kamera/Galerie, Teilen, Zwischenablage, Mail/Links. |
| `app.json` | Name, Icons, Bundle-IDs, Berechtigungstexte. |
| `eas.json` | Build-Profile (preview = Test-APK, production = Store). |

Nach jeder Änderung an `web/index.html`:

```bash
npm run build:html
```

(`npm start` macht das automatisch.)

## Einmalige Einrichtung

```bash
npm install
npx eas-cli@latest login          # Expo-Konto
npx eas-cli@latest init           # verknüpft das Projekt mit deinem Expo-Konto
```

## Builds

```bash
# Android-Test-APK (direkt aufs Handy installierbar)
npx eas-cli@latest build -p android --profile preview

# Store-Builds
npx eas-cli@latest build -p android --profile production   # .aab für Google Play
npx eas-cli@latest build -p ios --profile production       # für App Store / TestFlight
```

Für iOS brauchst du ein **Apple Developer Konto** (99 USD/Jahr). EAS erstellt Zertifikate und Profile automatisch.

## Veröffentlichen

```bash
npx eas-cli@latest submit -p ios        # an App Store Connect / TestFlight
npx eas-cli@latest submit -p android    # an Google Play (Service-Account-JSON nötig)
```

Bei Google Play muss die **erste** Version einmal manuell in der Play Console hochgeladen werden.

## Lokal testen

Die App nutzt native Module (Kamera, Teilen), Expo Go reicht deshalb nicht ganz. Entweder:

```bash
npx eas-cli@latest build -p android --profile development   # Development Build
npx expo start
```

oder einfach die Preview-APK installieren.

## Anpassen

- **E-Mail für Muster/Offerten:** in `web/index.html` → `CONFIG.email`
- **Böden:** in `web/index.html` → `CATALOG`
- **Version:** `app.json` → `version` (Build-Nummern zählt EAS automatisch hoch)

## Store-Angaben (Vorschlag)

- **Name:** Naki Bodenplaner
- **Untertitel:** Traumboden virtuell verlegen
- **Kategorie:** Lifestyle (Alternative: Haus & Wohnen)
- **Altersfreigabe:** 4+ / Jeder
- **Datenschutz:** Die App sammelt keine Daten. Fotos bleiben auf dem Gerät; Anfragen werden nur verschickt, wenn der Nutzer die E-Mail selbst absendet.
- **Datenschutzerklärung-URL:** wird von beiden Stores verlangt, z. B. auf nakigmbh.ch
