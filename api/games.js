const GAME_FIELDS = [
  'id',
  'title',
  'category',
  'description',
  'image',
  'imageAlt',
  'href',
  'status',
  'statusLabel',
  'cta',
  'accent',
  'visible'
];

export const DEFAULT_CATALOGUE = {
  games: [
    {
      id: 'kelvi',
      title: 'Kelvi',
      category: 'Quick-fire culture quiz',
      description: 'A question drops. Answer fast. Protect the streak.',
      image: '/assets/kelvi.webp',
      imageAlt: 'A visual spread of South Indian cultural clues: a veena, filter coffee, jasmine, a temple gopuram, kolam, and an auto rickshaw.',
      href: 'https://kelvi.play.aarla.in',
      status: 'live',
      statusLabel: 'Now playing',
      cta: 'Enter game',
      accent: '#c95235',
      visible: true
    },
    {
      id: 'kolam-kraze',
      title: 'Kolam Kraze',
      category: 'Pattern · Memory · Speed',
      description: 'Read the dots. Complete the pattern. Do not blink.',
      image: '/assets/kolam-kraze.webp',
      imageAlt: 'A hand drawing a white kolam of looping lines and dots on a textured floor, with jasmine, rice flour, and turmeric nearby.',
      href: 'https://kolam.play.aarla.in',
      status: 'soon',
      statusLabel: 'Coming soon',
      cta: 'On view soon',
      accent: '#355c63',
      visible: true
    },
    {
      id: 'sabha-canteen',
      title: 'Sabha Canteen',
      category: 'Coffee · Hierarchy · Gossip',
      description: 'Know the menu, read the room, survive the season.',
      image: '/assets/sabha-canteen.webp',
      imageAlt: 'Filter coffee, banana-leaf tiffin, and a concert programme on a green marble sabha canteen table.',
      href: 'https://canteen.play.aarla.in',
      status: 'soon',
      statusLabel: 'Coming soon',
      cta: 'On view soon',
      accent: '#ad4d32',
      visible: true
    },
    {
      id: 'pallanguzhi',
      title: 'Pallanguzhi',
      category: 'Counting · Strategy · Memory',
      description: 'The old counting game, sharpened for a new round.',
      image: '/assets/pallanguzhi.webp',
      imageAlt: 'A carved wooden pallanguzhi board on sunlit stone, with cowrie shells and tamarind seeds in its pits.',
      href: 'https://pallanguzhi.play.aarla.in',
      status: 'soon',
      statusLabel: 'Coming soon',
      cta: 'On view soon',
      accent: '#8b4c2f',
      visible: true
    },
    {
      id: 'aadu-puli-aattam',
      title: 'Aadu Puli Aattam',
      category: 'Goats · Tigers · Tactics',
      description: 'One side has numbers. The other has teeth.',
      image: '/assets/aadu-puli-aattam.webp',
      imageAlt: 'Brass tigers and ivory goats arranged on a triangular Aadu Puli Aattam board over deep blue cloth.',
      href: 'https://aadupuli.play.aarla.in',
      status: 'soon',
      statusLabel: 'Coming soon',
      cta: 'On view soon',
      accent: '#b22f2b',
      visible: true
    }
  ]
};

export class CatalogueError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CatalogueError';
  }
}

export function isAbsoluteHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function optionalString(game, field, label) {
  if (game[field] == null) return;
  if (typeof game[field] !== 'string' || game[field].trim() === '') {
    throw new CatalogueError(`${label} ${field} must be a non-empty string when provided.`);
  }
}

function sanitizeGame(game) {
  const clean = {};
  for (const field of GAME_FIELDS) {
    if (game[field] !== undefined) clean[field] = game[field];
  }
  return clean;
}

function validateGame(game, index, seenIds) {
  const label = `Game ${index + 1}`;

  if (!game || typeof game !== 'object' || Array.isArray(game)) {
    throw new CatalogueError(`${label} must be an object.`);
  }

  if (typeof game.id !== 'string' || game.id.trim() === '') {
    throw new CatalogueError(`${label} is missing a non-empty "id" string.`);
  }

  if (seenIds.has(game.id)) {
    throw new CatalogueError(`${label} repeats id "${game.id}". Each game id must be unique.`);
  }
  seenIds.add(game.id);

  if (typeof game.title !== 'string' || game.title.trim() === '') {
    throw new CatalogueError(`Game "${game.id}" is missing a non-empty "title" string.`);
  }

  if (game.status !== 'live' && game.status !== 'soon') {
    throw new CatalogueError(`Game "${game.id}" has invalid status "${game.status}". Use "live" or "soon".`);
  }

  if (typeof game.href !== 'string' || game.href.trim() === '') {
    throw new CatalogueError(`Game "${game.id}" is missing a non-empty "href" string.`);
  }

  if (!isAbsoluteHttpUrl(game.href)) {
    throw new CatalogueError(
      `Game "${game.id}" href must be a complete http(s) URL such as https://kelvi.play.aarla.in, not a local path.`
    );
  }

  if (typeof game.image !== 'string' || game.image.trim() === '') {
    throw new CatalogueError(`Game "${game.id}" is missing a non-empty "image" string.`);
  }

  if (game.visible != null && typeof game.visible !== 'boolean') {
    throw new CatalogueError(`Game "${game.id}" visible must be true or false when provided.`);
  }

  optionalString(game, 'category', `Game "${game.id}"`);
  optionalString(game, 'description', `Game "${game.id}"`);
  optionalString(game, 'imageAlt', `Game "${game.id}"`);
  optionalString(game, 'statusLabel', `Game "${game.id}"`);
  optionalString(game, 'cta', `Game "${game.id}"`);
  optionalString(game, 'accent', `Game "${game.id}"`);

  return sanitizeGame(game);
}

export function resolveCatalogue(env = process.env) {
  const raw = env.GAMES_JSON;
  let parsed;

  if (raw == null || String(raw).trim() === '') {
    parsed = DEFAULT_CATALOGUE;
  } else {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CatalogueError(
        'GAMES_JSON contains invalid JSON. Paste a JSON object with a "games" array, using the shape in catalogue.example.json.'
      );
    }
  }

  if (Array.isArray(parsed)) {
    parsed = { games: parsed };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CatalogueError('GAMES_JSON must be a JSON object with a "games" array.');
  }

  if (!Array.isArray(parsed.games)) {
    throw new CatalogueError('GAMES_JSON must contain a "games" array.');
  }

  const seenIds = new Set();
  const games = parsed.games.map((game, index) => validateGame(game, index, seenIds));

  return { games };
}

export default function handler(_req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    return res.status(200).json(resolveCatalogue(process.env));
  } catch (error) {
    const message =
      error instanceof CatalogueError
        ? error.message
        : 'Unable to load the game catalogue.';
    return res.status(500).json({ error: message });
  }
}
