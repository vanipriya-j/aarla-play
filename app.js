const grid = document.querySelector('#games');
const featuredSlot = document.querySelector('#featured');
const collection = document.querySelector('#collection');
const statusSlot = document.querySelector('#catalogue-status');
const template = document.querySelector('#game-card-template');
const guestNumber = document.querySelector('#guest-number');

let guestId = sessionStorage.getItem('aarla-play-guest');
if (!guestId) {
  guestId = String(Math.floor(100 + Math.random() * 900));
  sessionStorage.setItem('aarla-play-guest', guestId);
}
guestNumber.textContent = guestId;

function isAbsoluteHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function visibleGames(games) {
  return games.filter((game) => game.visible !== false);
}

function pickFeatured(games) {
  return games.find((game) => game.id === 'kelvi') || games.find((game) => game.status === 'live') || games[0];
}

function showStatus(message, kind = 'status') {
  featuredSlot.hidden = true;
  featuredSlot.replaceChildren();
  collection.hidden = true;
  grid.replaceChildren();
  statusSlot.hidden = false;
  statusSlot.className = kind === 'error' ? 'notice notice-error' : 'notice';
  statusSlot.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  statusSlot.textContent = message;
}

function hideStatus() {
  statusSlot.hidden = true;
  statusSlot.textContent = '';
}

function fillCard(game, index, featured) {
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector('.game-card');
  const frame = fragment.querySelector('.game-frame');
  const image = fragment.querySelector('.game-art');
  const live = game.status === 'live' && isAbsoluteHttpUrl(game.href);

  card.classList.toggle('is-featured', featured);
  card.classList.toggle('is-soon', !live);
  if (game.accent) card.style.setProperty('--accent', game.accent);

  image.src = game.image;
  image.alt = game.imageAlt || `${game.title} game artwork`;
  image.width = 1280;
  image.height = 853;
  image.decoding = 'async';
  image.sizes = featured
    ? '(max-width: 860px) 100vw, (max-width: 1100px) 58vw, 42vw'
    : '(max-width: 860px) 50vw, (max-width: 1100px) 46vw, 24vw';

  if (featured) {
    image.loading = 'eager';
    image.fetchPriority = 'high';
  } else {
    image.loading = 'lazy';
    image.fetchPriority = 'low';
  }

  fragment.querySelector('.status').textContent =
    game.statusLabel || (live ? 'Play now' : 'Coming soon');
  fragment.querySelector('.number').textContent = String(index + 1).padStart(2, '0');
  fragment.querySelector('.eyebrow').textContent = game.category || 'Aarla Play';
  fragment.querySelector('h2').textContent = game.title;
  fragment.querySelector('.description').textContent = game.description || '';
  fragment.querySelector('.action').textContent =
    game.cta || (live ? 'Enter game' : 'Coming soon');

  if (live) {
    const link = document.createElement('a');
    link.className = 'game-frame';
    link.href = game.href;
    link.setAttribute('aria-label', `${game.cta || 'Enter game'}: ${game.title}`);
    while (frame.firstChild) link.append(frame.firstChild);
    frame.replaceWith(link);
  } else {
    frame.classList.add('is-inactive');
    frame.removeAttribute('href');
    card.setAttribute('aria-disabled', 'true');
  }

  return fragment;
}

function renderGames(games) {
  const items = visibleGames(games);

  if (items.length === 0) {
    showStatus('The collection is being prepared. Please check back soon.');
    return;
  }

  const featured = pickFeatured(items);
  const rest = items.filter((game) => game !== featured);

  hideStatus();
  featuredSlot.hidden = false;
  featuredSlot.replaceChildren(fillCard(featured, 0, true));

  grid.replaceChildren();
  rest.forEach((game, index) => {
    grid.append(fillCard(game, index + 1, false));
  });
  collection.hidden = rest.length === 0;
}

function catalogueErrorMessage(status, payload) {
  if (payload && typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }
  if (status >= 500) {
    return 'The game catalogue is misconfigured. Please try again shortly.';
  }
  return 'The game shelf could not be loaded. Please try again shortly.';
}

async function loadGames() {
  try {
    const response = await fetch('/api/games', { headers: { accept: 'application/json' } });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      showStatus(catalogueErrorMessage(response.status, payload), 'error');
      return;
    }

    if (!payload || !Array.isArray(payload.games)) {
      showStatus('The game catalogue is misconfigured. Please try again shortly.', 'error');
      return;
    }

    renderGames(payload.games);
  } catch {
    showStatus('The game shelf could not be loaded. Please try again shortly.', 'error');
  }
}

loadGames();
