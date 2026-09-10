/* ============================================================
   TMM Circle Home — home.js   (TMM_HOME_v4)
   Tier-aware content loader for members.themillionairemother.com
   Hosted on Cloudflare Pages. Wrapped in an IIFE because Circle's
   Custom App Builder can load the script twice.
   ============================================================ */
(function () {
'use strict';
/* TMM_HOME_v4 */

const TMM_CONFIG = {
  WORKER_URL:   'https://tmm-circle-proxy.product-10c.workers.dev',
  COMMUNITY_ID: '97488',
  /* TEST_MODE true skips member detection and shows everyone the Free page.
     Off since 10 Sept 2026 so test logins exercise real detection. The
     test banner in body.html still lets you preview any tier; delete it
     before real members are let in. */
  TEST_MODE:    false,

  /* Tier = the member's Circle ACCESS GROUPS, matched by group ID. Not by
     name: groups get renamed (on 10 Sept 2026 "The Mother Hub" became
     "MotherHub" and "Matriarch Network" became "MotherHub Expert Network"),
     and IDs survive that. Not member tags either — real members have none.
     Checked top to bottom; the first tier with a matching group wins, so a
     member in two tiers gets the one listed higher. No match -> Free.
     Group IDs come from the proxy's /access_groups. */
  TIER_GROUPS: [
    { tier:'inner_circle',   groups:[
        105821,  // Inner Circle
        74507,   // The Inner Circle 2026
        23929,   // The Inner Circle
        77964,   // The Vault                      <- CONFIRM: Vault members get the Inner Circle page?
    ]},
    { tier:'foundry',        groups:[
        105820,  // Foundry
        69954,   // The Foundry 2026
        22666,   // The Foundry Spring/Fall 2025
        102378, 102661, 102662,  // Foundry Pod 1, 2, 3
        117122,  // Foundry Alumni Pod
    ]},
    { tier:'expert_network', groups:[
        132064,  // MotherHub Expert Network (was Matriarch Network)
    ]},
    { tier:'mother_hub',     groups:[
        104172,  // MotherHub (was The Mother Hub)
        78001,   // Founding Mother Access           <- CONFIRM
    ]},
  ],

  /* Logo/brand per tier: free → Millionaire Mother, all paid → Mother Hub */
  BRAND_BY_TIER: {
    free:         'mm',
    mother_hub:   'hub',
    foundry:      'hub',
    inner_circle: 'hub',
  },

  TIERS: {
    /* A section set to null is hidden for that tier. Free members can't
       open events or Say Hello, so those three sections are hidden rather
       than showing content that links somewhere they can't go.
       The hero's posts come from FEATURED.SPACES — `hero` here only sets
       its heading and See all link. */
    free: {
      label: 'Free Member',
      hero:         { label:'Welcome', url:'https://members.themillionairemother.com/c/welome-library' },
      contentGrid:  { label:'Starter Library', spaceId:2551366, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/free-resources', placeholders:'resource' },
      featuredEvent: null,
      postFeed:      null,
      eventsGrid:    null,
    },
    mother_hub: {
      label: 'The Mother Hub',
      hero:         { label:'Announcements', spaces:[{id:853914,space_type:'basic'}], count:3, url:'https://members.themillionairemother.com/c/announcements' },
      contentGrid:  { label:'Business Resources', spaceId:853992, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/business-questions', placeholders:'resource' },
      featuredEvent:{ label:'Coming Up', spaceId:802308, space_type:'event', url:'https://members.themillionairemother.com/c/group-coaching' },
      postFeed:     { label:'From the community', spaceId:853990, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/motherhood-questions' },
      eventsGrid:   { label:'Upcoming Live Events', spaceId:802308, space_type:'event', count:6, url:'https://members.themillionairemother.com/c/group-coaching' },
    },
    foundry: {
      label: 'Foundry Member',
      hero:         { label:'Announcements', spaces:[{id:2349055,space_type:'basic'},{id:853914,space_type:'basic'}], count:3, url:'https://members.themillionairemother.com/c/announcements-c79c49' },
      contentGrid:  { label:'Coaching Q&A', spaceId:2349045, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/coaching-q-a' },
      featuredEvent:{ label:'Coming Up', spaceId:2491518, space_type:'event', url:'https://members.themillionairemother.com/c/monthly-village-circle-with-cait' },
      postFeed:     { label:'From the community', spaceId:2349020, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/marketing-lab' },
      eventsGrid:   { label:'Upcoming Live Events', spaceId:2491518, space_type:'event', count:6, url:'https://members.themillionairemother.com/c/monthly-village-circle-with-cait' },
    },
    inner_circle: {
      label: 'Inner Circle',
      hero:         { label:'Announcements', spaces:[{id:2349055,space_type:'basic'},{id:853914,space_type:'basic'},{id:2530145,space_type:'basic'}], count:3, url:'https://members.themillionairemother.com/c/announcements-c79c49' },
      contentGrid:  { label:'Coaching Q&A', spaceId:2349045, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/coaching-q-a' },
      featuredEvent:{ label:'Coming Up', spaceId:2491518, space_type:'event', url:'https://members.themillionairemother.com/c/monthly-village-circle-with-cait' },
      postFeed:     { label:'From the community', spaceId:853992, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/business-questions' },
      eventsGrid:   { label:'Upcoming Live Events', spaceId:802308, space_type:'event', count:6, url:'https://members.themillionairemother.com/c/group-coaching' },
    },
  },
};

/* ============================================================
   FEATURED hero — one `featured` topic (538336), access by SPACE.
   The owner tags any post `featured`; a post shows in a member's
   hero only if its space_id is in that tier's list below.
   ----------------------------------------------------------------
   Why space_id and not space-group: the content spaces (Resources,
   Identity, Home, Money, Business, Motherhood) all live in ONE group
   (Content Hub, 996638), and a single tier's featured spaces span
   multiple groups. So group gating can't separate free from paid —
   explicit space lists can. This map IS the access model.

   EDIT THESE when featured scope changes. Space ids come from /spaces.
   Higher tiers should include everything lower tiers see, plus more.
   ============================================================ */
const FEATURED = {
  TOPIC_ID: 538336,   // Circle "topics" id for the `featured` tag
  MAX: 5,             // max cards in the hero
  SPACES: {
    // Free: Welcome! only. Free members can also open Start Here and Free
    // Resources, but the owner features content for them from Welcome!;
    // Free Resources already has its own section (Starter Library).
    free: [
      2551323, // Welcome!        (welome-library)
    ],
    // Mother Hub Plus: free set + the Content Hub library spaces + Plus space.
    // VERIFY this list matches what a Plus member should see featured.
    mother_hub: [
      2551323, 2505755, 2551366,          // (inherits free)
      2571702, // Identity
      2571703, // Home
      2571704, // Motherhood
      2571705, // Business
      2571707, // Money
      2701022, // MotherHub Plus
    ],
    // Foundry (legacy): Foundry Community spaces. VERIFY / adjust.
    foundry: [
      2349055, // Announcements   (Foundry)
      2349045, // Business Channel
      2349052, // Celebrations    (Foundry)
      2349021, // Introductions   (Foundry)
      2349020, // Marketing Lab
      2672204, // Motherhood Channel
      2672218, // Peer Accountability Hub
      2672173, // Ai & Ops Channel
    ],
    // Inner Circle (legacy): The Vault space(s). VERIFY / adjust.
    inner_circle: [
      802279,  // Top Guest Experts (Vault)
      802277,  // Masterclass Library (Vault)
      2361522, // MME Program Library (Vault)
    ],
  },
};

/* ---------- member detection ---------- */
/* Never let an unresolved SDK/API promise hang the page. */
function withTimeout(promise, ms, fallback){
  return Promise.race([
    Promise.resolve(promise).catch(()=>fallback),
    new Promise(res => setTimeout(()=>res(fallback), ms)),
  ]);
}

async function getCurrentMember(){
  const fallback = { id:null, firstName:'Mama' };
  if (window.CircleApps && typeof window.CircleApps.getCurrentMember === 'function'){
    try { return await withTimeout(window.CircleApps.getCurrentMember(), 2500, fallback); }
    catch(e){}
  }
  return fallback;
}
/* The old lookup (/community_members?id=) hit Circle's LIST endpoint, which
   ignores `id` and returns the first page — so every member got the same
   person's (empty) tags and landed on Free. This asks for the member's own
   access groups instead. */
async function getMemberTierKey(memberId){
  if (!memberId) return 'free';
  try{
    const url = `${TMM_CONFIG.WORKER_URL}/community_members/${encodeURIComponent(memberId)}/access_groups?per_page=100`;
    const res = await withTimeout(fetch(url), 3000, null);
    if (!res || !res.ok) return 'free';
    const data = await res.json();
    const mine = new Set((data?.records || []).map(g => g.id));
    const hit  = TMM_CONFIG.TIER_GROUPS.find(t => t.groups.some(id => mine.has(id)));
    return hit ? hit.tier : 'free';
  }catch(e){ return 'free'; }
}

/* ---------- API ---------- */
async function fetchSection(cfg){
  if (!cfg) return [];
  const n = cfg.count || 4;
  const spaces = cfg.spaces
    ? cfg.spaces
    : (cfg.spaceId ? [{ id:cfg.spaceId, space_type:cfg.space_type||'basic' }] : []);
  if (!spaces.length) return [];
  const perSpace = Math.max(n, spaces.length>1 ? n*2 : n);

  const all = await Promise.all(spaces.map(async sp => {
    const isEvent = sp.space_type === 'event';
    const ep  = isEvent ? '/events' : '/posts';
    const cid = isEvent ? '' : `&community_id=${TMM_CONFIG.COMMUNITY_ID}`;   // posts require community_id
    const url = `${TMM_CONFIG.WORKER_URL}${ep}?space_id=${sp.id}${cid}&per_page=${perSpace}&page=1`;
    try{
      const res = await withTimeout(fetch(url), 6000, null);
      if (!res){ console.error(`fetchSection ${ep} space ${sp.id}: timeout/failed`); return []; }
      if (!res.ok){ console.error(`fetchSection ${ep} space ${sp.id}: HTTP ${res.status}`); return []; }
      const data = await res.json();
      return (data.records || []).map(r => isEvent
        ? { ...r, name:r.name||'Untitled Event', user_name:r.user_name||'Host',
            published_at:r.starts_at||r.published_at, body:{ body:r.body?.body||r.description||'' } }
        : r);
    }catch(err){ console.error(`fetchSection ${ep} space ${sp.id} threw:`, err.message); return []; }
  }));

  let records = all.flat();

  // Tag filter (used by the featured/hero area). Circle calls tags "topics".
  // Only posts carrying the configured tag are kept. Matches defensively on
  // string OR object {name|slug|title}, case-insensitively.
  if (cfg.tag){
    const want = String(cfg.tag).toLowerCase();
    const tagged = records.filter(r => (r.topics || r.tags || []).some(t =>
      typeof t === 'string'
        ? t.toLowerCase() === want
        : [t.name, t.slug, t.title].filter(Boolean).some(v => String(v).toLowerCase() === want)
    ));
    if (!tagged.length) console.warn(`fetchSection: no posts tagged "${cfg.tag}" in this space`);
    records = tagged;   // strict: show ONLY tagged posts (empty if none tagged)
  }

  return records
    .sort((a,b)=> new Date(b.published_at||0) - new Date(a.published_at||0))
    .slice(0, n);
}

/* ---------- featured hero data ----------
   Tier -> allowed space_ids (FEATURED.SPACES). Fetch each allowed
   space's posts (small, complete lists), keep the ones tagged
   `featured` (538336). Per-space so a featured post is found
   regardless of age. No /spaces call, no group map needed. */
async function fetchOneSpacePosts(spaceId){
  try{
    const url = `${TMM_CONFIG.WORKER_URL}/posts?community_id=${TMM_CONFIG.COMMUNITY_ID}&space_id=${spaceId}&per_page=100&page=1`;
    const res = await withTimeout(fetch(url), 6000, null);
    if (!res || !res.ok) return [];
    const data = await res.json();
    return data.records || [];
  }catch(e){ console.error('space posts fetch failed', spaceId, e.message); return []; }
}

async function fetchFeatured(tierKey){
  const spaceIds = FEATURED.SPACES[tierKey] || FEATURED.SPACES.free;
  if (!spaceIds.length){ console.error('fetchFeatured: no spaces for tier', tierKey); return []; }
  const lists = await Promise.all(spaceIds.map(fetchOneSpacePosts));
  const seen = new Set();
  return lists.flat()
    .filter(p => (p.topics || []).includes(FEATURED.TOPIC_ID))   // carries `featured`
    .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
    .sort((a,b) => new Date(b.published_at||0) - new Date(a.published_at||0))
    .slice(0, FEATURED.MAX);
}

/* ---------- helpers ---------- */
function strip(html){ const d=document.createElement('div'); d.innerHTML=html||''; return d.textContent||''; }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtLong(iso){ return iso ? new Date(iso).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : ''; }
function fmtTime(iso){ return iso ? new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZoneName:'short'}) : ''; }
function fmtShort(iso){ return iso ? new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''; }
/* Circle stores a post's picture in one of two places: cover_image_url when
   someone sets a cover image, cardview_thumbnail_url when they attach it as the
   card thumbnail instead. Reading only the first meant posts that had a
   perfectly good image still fell through to a placeholder — 6 of the 253 posts
   across the Mother Hub's spaces were hit, including the featured "Matriarch"
   post. Take whichever one is there.
   Thumbnail first: the owner makes Mobile Thumbnails for these cards, so when
   a post has both, show the thumbnail. Circle keeps whatever shape is
   uploaded — thumbnails are NOT forced to 2:1 — so this only reduces cropping
   when the thumbnail is exported at 2:1 (1200x600). In our ~1.5:1 slots a 2:1
   image loses ~25% at the sides; a 2.8:1 one (840x300, the cover shape) ~46%.
   Checked Sept 2026: 5 of the 6 Free Resources thumbnails are 840x300. */
function coverImage(x){ return (x && (x.cardview_thumbnail_url || x.cover_image_url)) || ''; }

/* Show or hide a whole section — heading, See all and body — from the id of
   any element inside it. Inline display rather than the hidden attribute,
   so no stylesheet rule can override it. Re-run on every init so switching
   tier in the test banner brings back sections another tier had hidden. */
function showSection(innerId, on){
  const sec = document.getElementById(innerId)?.closest('.tmm-section');
  if (sec) sec.style.display = on ? '' : 'none';
}
function initial(name){ return (name||'?').trim().charAt(0).toUpperCase(); }
function set(id,v){ const el=document.getElementById(id); if(el) el.textContent=v||''; }
function href(id,u){ const el=document.getElementById(id); if(el) el.href=u||'#'; }

/* ---------- cover-image placeholders ----------
   Posts without a cover image used to get a grey gradient block. They now
   get one of four brand graphics instead.

   There is a set per content type, because the art names itself — the
   announcement graphics read "ANNOUNCEMENTS" and the resource graphics read
   "RESOURCES", so the set has to match what the section is showing. A
   section picks its set with `placeholders:'resource'` in TMM_CONFIG.TIERS;
   anything unset falls back to `announce`.

   Adjacent cards must never share a graphic. Rather than rolling a die per
   card (which repeats), we roll ONCE for a starting point and then step
   through the set in order. That guarantees neighbours differ while the run
   still starts somewhere different on each load, so the shelf looks fresh
   without ever doubling up.

   Order within a set matters too. Two of every four graphics sit on a light
   backdrop (white = red artwork, sand = tan artwork), so they are held apart
   rather than listed together — otherwise the shelf shows two near-identical
   pale cards in a row. red -> white -> linen -> sand alternates the backdrop
   at every step, including across the wrap.

   The art is 810x540 — a true 3:2, exactly 3x the 270x180 card slot — so it
   fills the frame with no crop and no letterbox. `contain` and the per-variant
   backgrounds in home.css stay as insurance: if a future export drifts off
   ratio it letterboxes in its own backdrop colour rather than cropping the
   wordmark or showing a bar. Both sets land on the same four backdrops, so
   they share those rules. */
const PLACEHOLDER_SETS = {
  announce: [
    { file:'announce-red.webp',   variant:'red'   },
    { file:'announce-white.webp', variant:'white' },
    { file:'announce-linen.webp', variant:'linen' },
    { file:'announce-sand.webp',  variant:'sand'  },
  ],
  resource: [
    { file:'resource-red.webp',   variant:'red'   },
    { file:'resource-white.webp', variant:'white' },
    { file:'resource-linen.webp', variant:'linen' },
    { file:'resource-sand.webp',  variant:'sand'  },
  ],
};
const PLACEHOLDER_BASE = 'https://tmm-circle-assets.pages.dev/images/';

function placeholderSet(name){ return PLACEHOLDER_SETS[name] || PLACEHOLDER_SETS.announce; }

/* One roll per render pass, not per card. */
function placeholderStart(setName){ return Math.floor(Math.random()*placeholderSet(setName).length); }

function placeholderImg(index,start,imgClass,setName){
  const set = placeholderSet(setName);
  const ph = set[(start+index)%set.length];
  return `<img class="${imgClass} tmm-ph tmm-ph--${ph.variant}" src="${PLACEHOLDER_BASE}${ph.file}" alt="" loading="lazy" data-ph-fallback="${imgClass}">`;
}

/* If a placeholder file is missing or blocked, fall back to the old grey
   block rather than leaving a broken-image icon on the shelf. Wired here
   instead of an inline onerror because Circle's iframe CSP can strip
   inline handlers. Call after setting innerHTML. */
function wirePlaceholderFallbacks(el){
  el.querySelectorAll('img[data-ph-fallback]').forEach(img=>{
    img.addEventListener('error',()=>{
      const div=document.createElement('div');
      div.className=img.getAttribute('data-ph-fallback')+'ph';
      img.replaceWith(div);
    },{once:true});
  });
}

/* ---------- renderers ---------- */
function renderHero(posts,cfg){
  set('tmmS1Label',cfg.label); href('tmmS1Url',cfg.url);
  const box=document.getElementById('tmmHero');
  // Nothing tagged: drop the whole section rather than show "No posts yet".
  if (!posts.length){ showSection('tmmHero', false); return; }
  showSection('tmmHero', true);
  const cards = posts.map(p=>{
    const img = coverImage(p);
    return `
    <a class="tmm-hero-card" href="${esc(p.url||'#')}" target="_blank" rel="noopener">
      <span class="tmm-cat">${esc(p.space_name||cfg.label||'Post')}</span>
      ${img ? `<img class="tmm-hero-img" src="${esc(img)}" alt="" loading="lazy">` : `<div class="tmm-hero-imgph"></div>`}
      <h2 class="tmm-hero-title">${esc(p.name||'Untitled')}</h2>
      <div class="tmm-hero-desc">${esc(strip(p.body?.body||'').slice(0,90))}</div>
    </a>`;
  }).join('');
  const dots = posts.length>1
    ? `<div class="tmm-dots" id="tmmHeroDots">${posts.map((_,j)=>`<button class="tmm-dot${j===0?' is-active':''}" data-i="${j}" aria-label="Slide ${j+1}"></button>`).join('')}</div>`
    : '';
  box.innerHTML = `<div class="tmm-hero-scroll" id="tmmHeroScroll">${cards}</div>${dots}`;
  setupHeroCarousel();
}

/* Native swipe carousel. Dots track scroll position via IntersectionObserver
   (fires natively — unlike click handlers, which Circle's iframe blocks). */
function setupHeroCarousel(){
  const scroll=document.getElementById('tmmHeroScroll');
  const dots=[...document.querySelectorAll('#tmmHeroDots .tmm-dot')];
  if(!scroll) return;
  const cards=[...scroll.querySelectorAll('.tmm-hero-card')];
  if(dots.length){
    const setActive=i=>dots.forEach((d,j)=>d.classList.toggle('is-active',j===i));
    const io=new IntersectionObserver(entries=>{
      entries.forEach(en=>{ if(en.isIntersecting){ const i=cards.indexOf(en.target); if(i>=0) setActive(i); } });
    },{root:scroll,threshold:0.6});
    cards.forEach(c=>io.observe(c));
    // Best-effort: tapping a dot scrolls to that card. Swipe always works regardless.
    dots.forEach(d=>d.addEventListener('click',e=>{
      e.preventDefault();
      const c=cards[+d.getAttribute('data-i')];
      if(c) c.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    }));
  }
}

function renderContentGrid(posts,cfg){
  set('tmmS2Label',cfg.label); href('tmmS2Url',cfg.url);
  const el=document.getElementById('tmmGrid');
  if(!posts.length){ el.innerHTML='<p class="tmm-empty">No posts yet.</p>'; return; }
  const phSet = cfg.placeholders;
  const start = placeholderStart(phSet);
  el.innerHTML = posts.map((p,i)=>{
    const img = coverImage(p);
    return `
    <a class="tmm-card" href="${esc(p.url||'#')}" target="_blank" rel="noopener">
      ${img ? `<img class="tmm-card-img" src="${esc(img)}" alt="" loading="lazy">` : placeholderImg(i,start,'tmm-card-img',phSet)}
      <div class="tmm-card-title">${esc(p.name||'Untitled')}</div>
      <div class="tmm-card-desc">${esc(strip(p.body?.body||'').slice(0,80))}</div>
    </a>`;
  }).join('');
  wirePlaceholderFallbacks(el);
}

function renderFeatured(events,cfg){
  set('tmmS3Label',cfg.label); href('tmmS3Url',cfg.url);
  const el=document.getElementById('tmmFeat');
  if(!events.length){ el.innerHTML='<p class="tmm-empty">No upcoming events.</p>'; return; }
  const PIN='money-marriage-motherhood-the-unspoken-dynamics-of-earning-more'; // set to '' to un-pin
  const PIN_TITLE='money, marriage & motherhood';
  const ev=events.find(e=>
        (e.url||'').includes(PIN) || (e.slug||'')===PIN ||
        (e.name||'').toLowerCase().startsWith(PIN_TITLE)
      )||events[0];
  const dt=ev.starts_at||ev.published_at;
  const featImg=coverImage(ev);
  el.innerHTML = `
    <a class="tmm-feat" href="${esc(ev.url||'#')}" target="_blank" rel="noopener">
      ${featImg ? `<img class="tmm-feat-bg" src="${esc(featImg)}" alt="" loading="lazy">` : ``}
      <div class="tmm-feat-top">
        <div class="tmm-feat-cal"><svg width="24" height="26" viewBox="0 0 27 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18.6667 1.33337V6.66671M8 1.33337V6.66671M1.33333 12H25.3333M4 4.00004H22.6667C24.1394 4.00004 25.3333 5.19395 25.3333 6.66671V25.3334C25.3333 26.8061 24.1394 28 22.6667 28H4C2.52724 28 1.33333 26.8061 1.33333 25.3334V6.66671C1.33333 5.19395 2.52724 4.00004 4 4.00004Z" stroke="currentColor" stroke-width="2.66667" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <div><div class="tmm-feat-date">${fmtLong(dt)}</div><div class="tmm-feat-time">${fmtTime(dt)}</div></div>
      </div>
      <div class="tmm-feat-bottom">
        <div class="tmm-feat-title">${esc(ev.name||'Untitled Event')}</div>
        <span class="tmm-btn">Reserve a Spot</span>
      </div>
    </a>`;
}

function renderFeed(posts,cfg){
  set('tmmS4Label',cfg.label); href('tmmS4Url',cfg.url);
  const el=document.getElementById('tmmFeed');
  if(!posts.length){ el.innerHTML='<p class="tmm-empty">No posts yet.</p>'; return; }
  el.innerHTML = posts.map(p=>{
    const av = p.user_avatar_url
      ? `<img class="tmm-avatar" src="${esc(p.user_avatar_url)}" alt="">`
      : `<div class="tmm-avatar">${esc(initial(p.user_name))}</div>`;
    return `
      <a class="tmm-feed-card" href="${esc(p.url||'#')}" target="_blank" rel="noopener">
        <div class="tmm-feed-who">${av}<div class="tmm-feed-whoText"><span class="tmm-feed-name">${esc(p.user_name||'Member')}</span><span class="tmm-feed-space">${esc(p.space_name||'')}</span></div></div>
        <div class="tmm-feed-preview">${esc(strip(p.body?.body||'').slice(0,140))}</div>
        <div class="tmm-stats">
          <span class="tmm-stat"><svg class="tmm-ico" width="15" height="14" viewBox="0 0 16 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M13.6609 1.8746C13.3204 1.53394 12.9161 1.2637 12.4711 1.07932C12.0261 0.894947 11.5492 0.800049 11.0675 0.800049C10.5859 0.800049 10.1089 0.894947 9.66396 1.07932C9.21898 1.2637 8.8147 1.53394 8.47419 1.8746L7.76753 2.58127L7.06086 1.8746C6.37307 1.1868 5.44022 0.800405 4.46753 0.800405C3.49484 0.800405 2.56199 1.1868 1.87419 1.8746C1.1864 2.56239 0.799999 3.49524 0.799999 4.46793C0.799999 5.44062 1.1864 6.37347 1.87419 7.06127L7.76753 12.9546L13.6609 7.06127C14.0015 6.72076 14.2718 6.31648 14.4561 5.8715C14.6405 5.42653 14.7354 4.94959 14.7354 4.46793C14.7354 3.98627 14.6405 3.50934 14.4561 3.06436C14.2718 2.61939 14.0015 2.2151 13.6609 1.8746Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>${p.likes_count||0}</span>
          <span class="tmm-stat"><svg class="tmm-ico" width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M14 10C14 10.3536 13.8595 10.6928 13.6095 10.9428C13.3594 11.1929 13.0203 11.3333 12.6667 11.3333H4.66667L2 14V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H12.6667C13.0203 2 13.3594 2.14048 13.6095 2.39052C13.8595 2.64057 14 2.97971 14 3.33333V10Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>${p.comments_count||0}</span>
        </div>
      </a>`;
  }).join('');
}

function renderEvents(events,cfg){
  set('tmmS5Label',cfg.label); href('tmmS5Url',cfg.url);
  const el=document.getElementById('tmmEvents');
  if(!events.length){ el.innerHTML='<p class="tmm-empty">No events yet.</p>'; return; }
  el.innerHTML = events.map(ev=>{
    const dt=ev.starts_at||ev.published_at;
    const img=coverImage(ev);
    return `
      <a class="tmm-ev-card" href="${esc(ev.url||'#')}" target="_blank" rel="noopener">
        ${img ? `<img class="tmm-ev-img" src="${esc(img)}" alt="" loading="lazy">` : `<div class="tmm-ev-imgph"></div>`}
        <div class="tmm-ev-row">
          <div class="tmm-ev-meta">
            <div class="tmm-ev-title">${esc(ev.name||'Untitled Event')}</div>
            <div class="tmm-ev-date">${fmtShort(dt)}</div>
          </div>
          <span class="tmm-btn tmm-btn--sm">RSVP</span>
        </div>
      </a>`;
  }).join('');
}

/* ---------- init ---------- */
async function init(overrideTierKey){
  const member    = await getCurrentMember();
  const firstName = member?.firstName || member?.name?.split(' ')[0] || 'Mama';
  const tierKey   = overrideTierKey || (TMM_CONFIG.TEST_MODE ? 'free' : await getMemberTierKey(member?.id));
  const tier      = TMM_CONFIG.TIERS[tierKey] || TMM_CONFIG.TIERS.free;
  console.info('[tmm-home] member id:', member?.id ?? '(none)', '| tier:', tierKey, TMM_CONFIG.TIERS[tierKey] ? '' : '(no page yet, showing Free)');
  // Test banner: show the DETECTED tier in its dropdown, so a test login can
  // see what it was matched to. Skipped when the dropdown itself chose it.
  const sel = document.querySelector('#tmmTestBanner select');
  if (sel && !overrideTierKey && [...sel.options].some(o => o.value === tierKey)) sel.value = tierKey;

  const root = document.getElementById('tmmHome');
  if (root) root.setAttribute('data-brand', TMM_CONFIG.BRAND_BY_TIER[tierKey] || 'mm');
  set('tmmGreeting', `Welcome back, ${firstName}`);

  // Each section fetches + renders on its own. A slow/empty section can no
  // longer block the others (previously one hung fetch froze the whole page).
  const render = (cfg, fn, boxId) => {
    showSection(boxId, !!cfg);
    if (!cfg) return;
    fetchSection(cfg)
      .then(d => { try { fn(d, cfg); } catch(e){ console.error('render error:', e); } })
      .catch(e => console.error('section error:', e));
  };

  // Hero = posts tagged `featured` community-wide, filtered to the groups
  // this tier can access. Everything else stays per-space.
  showSection('tmmHero', true);   // skeleton while loading; renderHero decides
  fetchFeatured(tierKey)
    .then(posts => { try { renderHero(posts, tier.hero); } catch(e){ console.error('hero render error:', e); showSection('tmmHero', false); } })
    .catch(e => { console.error('featured error:', e); showSection('tmmHero', false); });

  render(tier.contentGrid,   renderContentGrid, 'tmmGrid');
  render(tier.featuredEvent, renderFeatured,    'tmmFeat');
  render(tier.postFeed,      renderFeed,        'tmmFeed');
  render(tier.eventsGrid,    renderEvents,      'tmmEvents');
}

/* expose test-tier switcher to window (IIFE hides it otherwise) */
window.tmmSetTier = (k)=>init(k);

/* ---------- boot ----------
   Circle is a single-page app: it may inject our HTML block AFTER this
   script runs, and DOMContentLoaded may have already fired. So instead of
   relying on that one event, we wait until #tmmHome actually exists, and
   re-init if Circle swaps in a fresh block on navigation (e.g. tapping Home).
   This is why content loaded via the test dropdown but not on nav before. */
let tmmBootedEl = null;
function tmmTryBoot(){
  const home = document.getElementById('tmmHome');
  if (!home) return;
  if (home === tmmBootedEl) return;              // this block already initialised
  tmmBootedEl = home;                            // set before init() so DOM edits don't re-trigger
  if(!TMM_CONFIG.TEST_MODE){ const b=document.getElementById('tmmTestBanner'); if(b) b.style.display='none'; }
  init();
}
function tmmStart(){
  tmmTryBoot();
  // Keep watching: covers Circle injecting the block late AND re-injecting it on navigation.
  new MutationObserver(tmmTryBoot).observe(document.documentElement, {childList:true, subtree:true});
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tmmStart);
else tmmStart();

})();
