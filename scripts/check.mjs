import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import handler, {
  CatalogueError,
  DEFAULT_CATALOGUE,
  isAbsoluteHttpUrl,
  resolveCatalogue
} from '../api/games.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function check(name, fn) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`fail  ${name}`);
    console.error(`  ${error.message}`);
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`ok  ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`fail  ${name}`);
    console.error(`  ${error.message}`);
  }
}

function invokeHandler(env = {}, req = { method: 'GET' }) {
  const previous = process.env.GAMES_JSON;
  if (env.GAMES_JSON === undefined) delete process.env.GAMES_JSON;
  else process.env.GAMES_JSON = env.GAMES_JSON;

  const result = {
    statusCode: 200,
    headers: {},
    body: null
  };

  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      result.headers[name] = value;
      return this;
    },
    json(data) {
      result.body = data;
      return this;
    }
  };

  try {
    handler(req, res);
    return result;
  } finally {
    if (previous === undefined) delete process.env.GAMES_JSON;
    else process.env.GAMES_JSON = previous;
  }
}

check('default catalogue is used when GAMES_JSON is absent', () => {
  const catalogue = resolveCatalogue({});
  assert.equal(catalogue.games.length, 5);
  assert.equal(catalogue.games[0].id, 'kelvi');
  assert.equal(catalogue.games[0].href, 'https://kelvi.play.aarla.in');
});

check('default catalogue matches catalogue.example.json', () => {
  const example = JSON.parse(fs.readFileSync(path.join(root, 'catalogue.example.json'), 'utf8'));
  assert.deepEqual(example, DEFAULT_CATALOGUE);
});

check('every default live href is a complete external URL', () => {
  for (const game of DEFAULT_CATALOGUE.games) {
    assert.equal(isAbsoluteHttpUrl(game.href), true, `${game.id} href is not absolute`);
    assert.equal(game.href.startsWith('/'), false);
    assert.doesNotMatch(game.href, /play\.aarla\.in\/kelvi$/);
  }
});

check('default assets exist', () => {
  for (const game of DEFAULT_CATALOGUE.games) {
    assert.equal(game.image.startsWith('/assets/'), true);
    assert.equal(fs.existsSync(path.join(root, game.image)), true, `missing ${game.image}`);
  }
});

check('empty GAMES_JSON falls back to defaults', () => {
  const catalogue = resolveCatalogue({ GAMES_JSON: '   ' });
  assert.deepEqual(catalogue.games.map((game) => game.id), DEFAULT_CATALOGUE.games.map((game) => game.id));
});

check('GAMES_JSON may be a games array', () => {
  const catalogue = resolveCatalogue({
    GAMES_JSON: JSON.stringify([
      {
        id: 'kelvi',
        title: 'Kelvi',
        image: '/assets/kelvi.webp',
        href: 'https://kelvi.play.aarla.in',
        status: 'live'
      }
    ])
  });
  assert.equal(catalogue.games.length, 1);
});

check('malformed JSON returns a useful CatalogueError', () => {
  assert.throws(() => resolveCatalogue({ GAMES_JSON: '{not json' }), CatalogueError);
  assert.throws(
    () => resolveCatalogue({ GAMES_JSON: '{not json' }),
    /invalid JSON/
  );
});

check('missing games array returns a useful error', () => {
  assert.throws(
    () => resolveCatalogue({ GAMES_JSON: '{"hello":true}' }),
    /games" array/
  );
});

check('empty games array is valid', () => {
  const catalogue = resolveCatalogue({ GAMES_JSON: '{"games":[]}' });
  assert.deepEqual(catalogue.games, []);
});

check('local hrefs are rejected', () => {
  assert.throws(
    () =>
      resolveCatalogue({
        GAMES_JSON: JSON.stringify({
          games: [
            {
              id: 'kelvi',
              title: 'Kelvi',
              image: '/assets/kelvi.webp',
              href: '/kelvi',
              status: 'live'
            }
          ]
        })
      }),
    /complete http\(s\) URL/
  );
});

check('invalid status is rejected', () => {
  assert.throws(
    () =>
      resolveCatalogue({
        GAMES_JSON: JSON.stringify({
          games: [
            {
              id: 'kelvi',
              title: 'Kelvi',
              image: '/assets/kelvi.webp',
              href: 'https://kelvi.play.aarla.in',
              status: 'draft'
            }
          ]
        })
      }),
    /invalid status/
  );
});

check('duplicate ids are rejected', () => {
  const game = DEFAULT_CATALOGUE.games[0];
  assert.throws(
    () => resolveCatalogue({ GAMES_JSON: JSON.stringify({ games: [game, game] }) }),
    /unique/
  );
});

check('handler only returns the games catalogue', () => {
  const result = invokeHandler({
    GAMES_JSON: JSON.stringify({
      games: DEFAULT_CATALOGUE.games,
      secret: 'do-not-leak'
    })
  });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(Object.keys(result.body), ['games']);
  assert.equal(result.body.secret, undefined);
});

check('handler returns 500 with a useful message for malformed JSON', () => {
  const result = invokeHandler({ GAMES_JSON: '{"games":' });
  assert.equal(result.statusCode, 500);
  assert.match(result.body.error, /invalid JSON/);
});

check('unrelated environment variables are not exposed', () => {
  process.env.UNRELATED_SECRET = 'keep-me-server-side';
  const result = invokeHandler({});
  const serialized = JSON.stringify(result.body);
  assert.equal(serialized.includes('keep-me-server-side'), false);
  assert.equal(serialized.includes('UNRELATED_SECRET'), false);
  delete process.env.UNRELATED_SECRET;
});

check('vercel.json does not create local game routes', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const blob = JSON.stringify(config);
  assert.equal(blob.includes('/kelvi'), false);
  assert.equal(config.buildCommand, null);
});

check('source files have no local game routes', () => {
  const files = ['index.html', 'app.js', 'vercel.json', 'api/games.js'];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, /href\s*=\s*['"]\/kelvi['"]/);
    assert.doesNotMatch(source, /location.*\/kelvi/);
  }
});

check('client keeps coming-soon cards from navigating', () => {
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(source, /status === 'live'/);
  assert.match(source, /removeAttribute\('href'\)/);
  assert.match(source, /loading = 'lazy'/);
  assert.match(source, /The collection is being prepared/);
  assert.match(source, /game shelf could not be loaded/);
  assert.match(source, /id === 'kelvi'/);
});

check('styles cover mobile, reduced motion, and 16px body copy', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /font-size: 16px/);
  assert.match(css, /overflow-x: clip/);
  assert.match(css, /aspect-ratio: 1280 \/ 853/);
});

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

await checkAsync('HTTP /api/games serves default live Kelvi URL', async () => {
  const previous = process.env.GAMES_JSON;
  delete process.env.GAMES_JSON;
  const { createServer } = await import('./dev.mjs');
  const server = createServer();
  try {
    const port = await listen(server);
    const response = await fetch(`http://127.0.0.1:${port}/api/games`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    const kelvi = payload.games.find((game) => game.id === 'kelvi');
    assert.equal(kelvi.href, 'https://kelvi.play.aarla.in');
    assert.equal(kelvi.status, 'live');
    const home = await fetch(`http://127.0.0.1:${port}/`);
    const html = await home.text();
    assert.match(html, /Aarla Play/);
    assert.equal(html.includes('href="/kelvi"'), false);
  } finally {
    await closeServer(server);
    if (previous === undefined) delete process.env.GAMES_JSON;
    else process.env.GAMES_JSON = previous;
  }
});

await checkAsync('HTTP /api/games reports malformed JSON', async () => {
  const previous = process.env.GAMES_JSON;
  process.env.GAMES_JSON = '{"games":';
  const { createServer } = await import('./dev.mjs');
  const server = createServer();
  try {
    const port = await listen(server);
    const response = await fetch(`http://127.0.0.1:${port}/api/games`);
    const payload = await response.json();
    assert.equal(response.status, 500);
    assert.match(payload.error, /invalid JSON/);
  } finally {
    await closeServer(server);
    if (previous === undefined) delete process.env.GAMES_JSON;
    else process.env.GAMES_JSON = previous;
  }
});

await checkAsync('HTTP /api/games allows an empty catalogue', async () => {
  const previous = process.env.GAMES_JSON;
  process.env.GAMES_JSON = '{"games":[]}';
  const { createServer } = await import('./dev.mjs');
  const server = createServer();
  try {
    const port = await listen(server);
    const response = await fetch(`http://127.0.0.1:${port}/api/games`);
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(payload.games, []);
  } finally {
    await closeServer(server);
    if (previous === undefined) delete process.env.GAMES_JSON;
    else process.env.GAMES_JSON = previous;
  }
});

await checkAsync('live cards keep complete external hrefs through the API', async () => {
  const result = invokeHandler({});
  const kelvi = result.body.games.find((game) => game.id === 'kelvi');
  assert.equal(kelvi.href, 'https://kelvi.play.aarla.in');
  assert.equal(kelvi.status, 'live');
});

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}

console.log('\nAll checks passed.');
