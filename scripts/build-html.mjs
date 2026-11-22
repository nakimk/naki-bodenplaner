// Nach jeder Änderung an web/index.html ausführen: npm run build:html
// 1) src/webapp.ts  = Offline-Kopie in der App (Fallback ohne Internet)
// 2) docs/app/index.html = Live-Version auf GitHub Pages. Die App lädt immer diese –
//    Änderungen sind nach dem Push sofort (max. ~10 Min. Cache) bei allen Nutzern, ohne Store-Update.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
writeFileSync(new URL('../src/webapp.ts', import.meta.url),
  `// Automatisch erzeugt aus web/index.html – nicht von Hand bearbeiten.\nconst html: string = ${JSON.stringify(html)};\nexport default html;\n`);
mkdirSync(new URL('../docs/app/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/app/index.html', import.meta.url), html);
console.log('webapp.ts + docs/app/index.html aktualisiert (' + html.length + ' Zeichen)');
