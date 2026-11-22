// Bettet web/index.html als String in src/webapp.ts ein.
// Nach jeder Änderung an web/index.html ausführen: npm run build:html
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
writeFileSync(
  new URL('../src/webapp.ts', import.meta.url),
  `// Automatisch erzeugt aus web/index.html – nicht von Hand bearbeiten.\nconst html: string = ${JSON.stringify(html)};\nexport default html;\n`
);
console.log('src/webapp.ts aktualisiert (' + html.length + ' Zeichen)');
