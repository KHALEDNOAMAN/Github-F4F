import {logLine} from './logger.js';

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function isFollowing(octokit, username) {
  try {
    await octokit.request('GET /user/following/{username}', {username});
    return true;
  } catch (err) {
    if (err.status === 404) return false;
    // on other errors assume not following to avoid skipping unintentionally
    return false;
  }
}

export async function followUser(octokit, logger, username, tag = null) {
  try {
    await octokit.rest.users.follow({username});
    logLine(tag, 'Success', `Followed ${username}`, 200);
    if (logger && typeof logger.info === 'function') logger.info(`Followed ${username}`);
    return true;
  } catch (err) {
    const code = err?.status || err?.statusCode || '';
    logLine(tag, 'Error', `Failed to follow ${username}: ${err.message || err}`, code);
    if (logger && typeof logger.warn === 'function') logger.warn(`Failed to follow ${username}: ${err.message || err}`);
    return false;
  }
}

export async function followRandom(octokit, logger, opts = {count: 5, delayMin: 1000, delayMax: 3000}) {
  const {count, delayMin = 1000, delayMax = 3000} = opts;
  let followed = 0;
  const tried = new Set();
  while (followed < count) {
    const page = Math.max(1, Math.floor(Math.random() * 30));
    const res = await octokit.rest.search.users({q: 'followers:>5', per_page: 30, page});
    const items = res.data.items || [];
    for (const user of items.sort(() => 0.5 - Math.random())) {
      if (followed >= count) break;
      if (tried.has(user.login)) continue;
      tried.add(user.login);
      // check if already following
      const already = await isFollowing(octokit, user.login);
      if (already) continue;
      const ok = await followUser(octokit, logger, user.login);
      if (ok) followed++;
      const wait = delayMin + Math.floor(Math.random() * (delayMax - delayMin + 1));
      await delay(wait);
    }
    if ((res.data.items || []).length === 0) break;
  }
  return {followed};
}

export async function followFromList(octokit, logger, target, listType = 'followers', count = 10, tag = null, opts = {delayMin: 1000, delayMax: 3000}) {
  const {delayMin = 1000, delayMax = 3000} = opts;
  const per_page = 100;
  let page = 1;
  let collected = [];
  while (collected.length < count) {
    let res;
    if (listType === 'followers') {
      res = await octokit.rest.users.listFollowersForUser({username: target, per_page, page});
    } else {
      res = await octokit.rest.users.listFollowingForUser({username: target, per_page, page});
    }
    const items = res.data || [];
    if (items.length === 0) break;
    collected.push(...items.map(u => u.login));
    if (items.length < per_page) break;
    page++;
  }
  collected = collected.slice(0, count);
  let followed = 0;
  for (const login of collected) {
    const already = await isFollowing(octokit, login);
    if (already) continue;
    const ok = await followUser(octokit, logger, login, tag);
    if (ok) followed++;
    const wait = delayMin + Math.floor(Math.random() * (delayMax - delayMin + 1));
    await delay(wait);
  }
  return {followed};
}
