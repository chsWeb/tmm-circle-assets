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
  TEST_MODE:    true,   // ← set false before publishing (also delete the test banner in body.html)

  ACCESS_GROUPS: {
    inner_circle: 'Inner Circle',
    foundry:      'Foundry',
    mother_hub:   'The Mother Hub',
    free:         'Free',
  },

  /* Logo/brand per tier: free → Millionaire Mother, all paid → Mother Hub */
  BRAND_BY_TIER: {
    free:         'mm',
    mother_hub:   'hub',
    foundry:      'hub',
    inner_circle: 'hub',
  },

  TIERS: {
    free: {
      label: 'Free Member',
      hero:         { label:'Welcome', spaces:[{id:2505755,space_type:'basic'}], count:3, url:'https://members.themillionairemother.com/c/start-here-3ba756' },
      contentGrid:  { label:"What's New", spaceId:853914, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/announcements' },
      featuredEvent:{ label:'Coming Up', spaceId:2491518, space_type:'event', url:'https://members.themillionairemother.com/c/monthly-village-circle-with-cait' },
      postFeed:     { label:'From the community', spaceId:805666, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/say-hello' },
      eventsGrid:   { label:'Upcoming Live Events', spaceId:2491518, space_type:'event', count:6, url:'https://members.themillionairemother.com/c/monthly-village-circle-with-cait' },
    },
    mother_hub: {
      label: 'The Mother Hub',
      hero:         { label:'Announcements', spaces:[{id:853914,space_type:'basic'}], count:3, url:'https://members.themillionairemother.com/c/announcements' },
      contentGrid:  { label:'Business Resources', spaceId:853992, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/business-questions' },
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
async function getMemberTierKey(memberId){
  if (!memberId) return 'free';
  try{
    const res  = await withTimeout(fetch(`${TMM_CONFIG.WORKER_URL}/community_members?id=${memberId}`), 3000, null);
    if (!res) return 'free';
    const data = await res.json();
    const tags = (data?.member_tags || data?.records?.[0]?.member_tags || []).map(t => typeof t==='string'?t:t.name);
    if (tags.includes(TMM_CONFIG.ACCESS_GROUPS.inner_circle)) return 'inner_circle';
    if (tags.includes(TMM_CONFIG.ACCESS_GROUPS.foundry))      return 'foundry';
    if (tags.includes(TMM_CONFIG.ACCESS_GROUPS.mother_hub))   return 'mother_hub';
    return 'free';
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

  return all.flat()
    .sort((a,b)=> new Date(b.published_at||0) - new Date(a.published_at||0))
    .slice(0, n);
}

/* ---------- helpers ---------- */
function strip(html){ const d=document.createElement('div'); d.innerHTML=html||''; return d.textContent||''; }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtLong(iso){ return iso ? new Date(iso).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : ''; }
function fmtTime(iso){ return iso ? new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZoneName:'short'}) : ''; }
function fmtShort(iso){ return iso ? new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''; }
function initial(name){ return (name||'?').trim().charAt(0).toUpperCase(); }
function set(id,v){ const el=document.getElementById(id); if(el) el.textContent=v||''; }
function href(id,u){ const el=document.getElementById(id); if(el) el.href=u||'#'; }

/* ---------- renderers ---------- */
function renderHero(posts,cfg){
  set('tmmS1Label',cfg.label); href('tmmS1Url',cfg.url);
  const box=document.getElementById('tmmHero');
  if (!posts.length){ box.innerHTML='<p class="tmm-empty">No posts yet.</p>'; return; }
  const cards = posts.map(p=>`
    <a class="tmm-hero-card" href="${esc(p.url||'#')}" target="_blank" rel="noopener">
      <span class="tmm-cat">${esc(p.space_name||cfg.label||'Post')}</span>
      ${p.cover_image_url ? `<img class="tmm-hero-img" src="${esc(p.cover_image_url)}" alt="" loading="lazy">` : `<div class="tmm-hero-imgph"></div>`}
      <div class="tmm-hero-title">${esc(p.name||'Untitled')}</div>
      <div class="tmm-hero-desc">${esc(strip(p.body?.body||'').slice(0,90))}</div>
    </a>`).join('');
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
  el.innerHTML = posts.map(p=>`
    <a class="tmm-card" href="${esc(p.url||'#')}" target="_blank" rel="noopener">
      ${p.cover_image_url ? `<img class="tmm-card-img" src="${esc(p.cover_image_url)}" alt="" loading="lazy">` : `<div class="tmm-card-imgph"></div>`}
      <div class="tmm-card-title">${esc(p.name||'Untitled')}</div>
      <div class="tmm-card-desc">${esc(strip(p.body?.body||'').slice(0,80))}</div>
    </a>`).join('');
}

function renderFeatured(events,cfg){
  set('tmmS3Label',cfg.label); href('tmmS3Url',cfg.url);
  const el=document.getElementById('tmmFeat');
  if(!events.length){ el.innerHTML='<p class="tmm-empty">No upcoming events.</p>'; return; }
  const ev=events[0], dt=ev.starts_at||ev.published_at;
  el.innerHTML = `
    <a class="tmm-feat" href="${esc(ev.url||'#')}" target="_blank" rel="noopener">
      ${ev.cover_image_url ? `<img class="tmm-feat-bg" src="${esc(ev.cover_image_url)}" alt="" loading="lazy">` : ``}
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
        <div class="tmm-feed-who">${av}<span class="tmm-feed-name">${esc(p.user_name||'Member')}</span></div>
        <div class="tmm-feed-title">${esc(p.name||'Untitled')}</div>
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
    return `
      <a class="tmm-ev-card" href="${esc(ev.url||'#')}" target="_blank" rel="noopener">
        ${ev.cover_image_url ? `<img class="tmm-ev-img" src="${esc(ev.cover_image_url)}" alt="" loading="lazy">` : `<div class="tmm-ev-imgph"></div>`}
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

  const root = document.getElementById('tmmHome');
  if (root) root.setAttribute('data-brand', TMM_CONFIG.BRAND_BY_TIER[tierKey] || 'mm');
  set('tmmGreeting', `Welcome back, ${firstName}`);

  // Each section fetches + renders on its own. A slow/empty section can no
  // longer block the others (previously one hung fetch froze the whole page).
  const render = (cfg, fn) =>
    fetchSection(cfg)
      .then(d => { try { fn(d, cfg); } catch(e){ console.error('render error:', e); } })
      .catch(e => console.error('section error:', e));

  render(tier.hero,          renderHero);
  render(tier.contentGrid,   renderContentGrid);
  render(tier.featuredEvent, renderFeatured);
  render(tier.postFeed,      renderFeed);
  render(tier.eventsGrid,    renderEvents);
}

/* expose test-tier switcher to window (IIFE hides it otherwise) */
window.tmmSetTier = (k)=>init(k);

document.addEventListener('DOMContentLoaded', ()=>{
  if(!TMM_CONFIG.TEST_MODE){ const b=document.getElementById('tmmTestBanner'); if(b) b.style.display='none'; }
  init();
});

})();
