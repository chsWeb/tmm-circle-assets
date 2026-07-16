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
async function getCurrentMember(){
  if (window.CircleApps){ try { return await window.CircleApps.getCurrentMember(); } catch(e){} }
  return { id:null, firstName:'Mama' };
}
async function getMemberTierKey(memberId){
  if (!memberId) return 'free';
  try{
    const res  = await fetch(`${TMM_CONFIG.WORKER_URL}/community_members?id=${memberId}`);
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
      const res = await fetch(url);
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
let heroIdx=0, heroTotal=0;

function renderHero(posts,cfg){
  set('tmmS1Label',cfg.label); href('tmmS1Url',cfg.url);
  const box=document.getElementById('tmmHero'), nav=document.getElementById('tmmHeroNav');
  if (!posts.length){ box.innerHTML='<p class="tmm-empty">No posts yet.</p>'; return; }
  heroIdx=0; heroTotal=posts.length;
  box.innerHTML = posts.map((p,i)=>`
    <a class="tmm-hero-card${i===0?' is-active':''}" href="${esc(p.url||'#')}" target="_blank" rel="noopener">
      <span class="tmm-cat">${esc(p.space_name||cfg.label||'Post')}</span>
      ${p.cover_image_url ? `<img class="tmm-hero-img" src="${esc(p.cover_image_url)}" alt="" loading="lazy">` : `<div class="tmm-hero-imgph"></div>`}
      <div class="tmm-hero-title">${esc(p.name||'Untitled')}</div>
      <div class="tmm-hero-desc">${esc(strip(p.body?.body||'').slice(0,90))}</div>
      <div class="tmm-dots">${posts.map((_,j)=>`<button class="tmm-dot${j===0?' is-active':''}" onclick="tmmHeroJump(event,${j})" aria-label="Slide ${j+1}"></button>`).join('')}</div>
    </a>`).join('');
  if (posts.length>1) nav.style.display='flex'; else nav.style.display='none';
  updateHero();
}
function updateHero(){
  document.querySelectorAll('#tmmHero .tmm-hero-card').forEach((c,i)=>c.classList.toggle('is-active',i===heroIdx));
  document.querySelectorAll('#tmmHero .tmm-dot').forEach((d,i)=>d.classList.toggle('is-active',i===heroIdx));
  const prev=document.getElementById('tmmHeroPrev'), next=document.getElementById('tmmHeroNext');
  if(prev) prev.disabled = heroIdx===0;
  if(next) next.disabled = heroIdx===heroTotal-1;
}
function tmmHeroJump(e,i){ if(e){e.preventDefault();e.stopPropagation();} heroIdx=i; updateHero(); }

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
        <div class="tmm-feat-cal">📅</div>
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
          <span class="tmm-stat">♥ ${p.likes_count||0}</span>
          <span class="tmm-stat">💬 ${p.comments_count||0}</span>
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
    const past = dt && new Date(dt) < new Date();
    return `
      <a class="tmm-ev-card" href="${esc(ev.url||'#')}" target="_blank" rel="noopener">
        ${ev.cover_image_url ? `<img class="tmm-ev-img" src="${esc(ev.cover_image_url)}" alt="" loading="lazy">` : `<div class="tmm-ev-imgph"></div>`}
        <div class="tmm-ev-row">
          <div class="tmm-ev-meta">
            <div class="tmm-ev-title">${esc(ev.name||'Untitled Event')}</div>
            <div class="tmm-ev-date">${fmtShort(dt)}</div>
          </div>
          <span class="tmm-btn tmm-btn--sm${past?' tmm-btn--muted':''}">RSVP</span>
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

  const [hero,grid,feat,feed,events] = await Promise.all([
    fetchSection(tier.hero), fetchSection(tier.contentGrid),
    fetchSection(tier.featuredEvent), fetchSection(tier.postFeed),
    fetchSection(tier.eventsGrid),
  ]);
  renderHero(hero,tier.hero);
  renderContentGrid(grid,tier.contentGrid);
  renderFeatured(feat,tier.featuredEvent);
  renderFeed(feed,tier.postFeed);
  renderEvents(events,tier.eventsGrid);
}

/* hero prev/next (attached after DOM ready) */
function wireHeroButtons(){
  const prev=document.getElementById('tmmHeroPrev'), next=document.getElementById('tmmHeroNext');
  if(prev) prev.onclick = ()=>{ if(heroIdx>0){heroIdx--; updateHero();} };
  if(next) next.onclick = ()=>{ if(heroIdx<heroTotal-1){heroIdx++; updateHero();} };
}

/* expose inline handlers + test switcher to window (IIFE hides them otherwise) */
window.tmmHeroJump = tmmHeroJump;
window.tmmSetTier  = (k)=>init(k);

document.addEventListener('DOMContentLoaded', ()=>{
  wireHeroButtons();
  if(!TMM_CONFIG.TEST_MODE){ const b=document.getElementById('tmmTestBanner'); if(b) b.style.display='none'; }
  init();
});

})();
