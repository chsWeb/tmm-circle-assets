/* ============================================================
   TMM Circle Home — home.js   (TMM_HOME_v4)
   Tier-aware content loader for members.themillionairemother.com
   Hosted on Cloudflare Pages. Wrapped in an IIFE because Circle's
   Custom App Builder can load the script twice.
   ============================================================ */
(function () {
'use strict';
/* TMM_HOME_v4 */

/* Only the newest copy of this script that has loaded acts. When a newer
   build loads over this one (see tmmUpdateIfNewer), every listener below
   checks tmmLive() and this copy goes quiet. */
const TMM_ME = {};
window.__tmmActive = TMM_ME;
const tmmLive = () => window.__tmmActive === TMM_ME;

const TMM_CONFIG = {
  WORKER_URL:   'https://tmm-circle-proxy.product-10c.workers.dev',
  COMMUNITY_ID: '97488',
  /* TEST_MODE true skips member detection and shows everyone the Free page.
     Off since 10 Sept 2026 so test logins exercise real detection. The
     test banner in body.html still lets you preview any tier; delete it
     before real members are let in. */
  TEST_MODE:    false,

  /* The black test banner with the tier dropdown. Separate from TEST_MODE:
     it used to vanish whenever TEST_MODE was off, which hid it from the test
     logins that need it. On while test accounts check detection — set false
     (and remove the banner from body.html) before real members are let in. */
  SHOW_TEST_BANNER: true,

  /* TEMPORARY (Oct 2026). The app sizes the home screen's webview itself and
     sometimes gets it wrong: cropped mid-hero, or far taller than the page.
     There is no console in the app, so this pins a small readout to the
     bottom-left corner: the webview's height, the page's height, and every
     time either changed. Turn off once the cause is known. */
  DEBUG_LAYOUT: false,

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
    /* The community is private and free members join through the Free access
       group. Listed explicitly so the mapping is documented; anyone matching
       none of these (e.g. only in Cash Flow Challenge) also gets Free. */
    { tier:'free',           groups:[
        104197,  // Free
    ]},
  ],

  /* Logo/brand per tier: free → Millionaire Mother, all paid → Mother Hub */
  BRAND_BY_TIER: {
    free:         'mm',
    mother_hub:   'hub',
    foundry:        'hub',
    inner_circle:   'hub',
    expert_network: 'hub',
  },

  /* Stamped into the test banner at run time, so you can see which build a
     surface is actually running. The app and the Site Builder page each have
     their own head snippet and their own cache, so one can be stale while
     the other is current. No stamp visible at all = old JS. Bump this when
     you bump ?v= in head.html. */
  BUILD: 'v52 · 2026-10-02',

  /* Share card (section 6). Lives here rather than in body.html so it can
     be changed by deploy like the rest of the page. A tier can override any
     of these, or set share:null to hide the card for that tier.
     newTab is ON: /share is a Site Builder page, and opening it in place
     inside the app replaces the screen the tab bar was showing, which left
     members unable to get back — tapping Home did nothing. A new window
     keeps the home screen where it was.
     That was not enough on its own: the app opens any link on the
     community's own domain in place, target or not (still stuck on v18, Sept 30).
     So the url goes through /go/share on tmm-circle-assets, which the app
     treats as an outside link; see /_redirects.
     appUrl is what the app opens instead, through window.navigateToUrl: the
     slide-up in-app browser Circle's own Button block uses, so Back closes
     it and the home screen is still there. The web keeps `url`. */
  /* Admins and moderators can open every space by role, so Circle lists them
     as members of almost none — the gate would leave their own home screen
     nearly empty. They are bypassed instead, straight from the isAdmin /
     isModerator flags Circle puts on window.circleUser. This list is only a
     manual fallback for someone those flags miss. Ids only, no names. */
  ADMIN_BYPASS_IDS: [],

  /* Start Here screen: a second Custom HTML screen (start-here-body.html)
     that new members land on. Same head as the home screen; this script
     sees data-page="start-here" and builds this instead of the home page.
     Everyone who is signed in sees the same thing, whatever their tier.
     open: 'panel' slides the post up in a panel drawn by this page, over
     Start Here, with its full text; close it and Start Here is still
     there. Tested 1 Oct 2026, neither of Circle's own routes works here:
     Start Here is a PRIVATE space and most members are not in it, so
     'native' (the app's post screen) sat on a skeleton forever, and
     'sheet' (/go/c/… on this domain) went to Safari and back to Home.
     The panel needs no access: the Worker already fetched the post. */
  START_HERE: {
    spaceId:  2505755,                  // Start Here (start-here-3ba756)
    /* Shown above the cards: the newest post in the Welcome! space, with
       its video playing on the screen. null hides it. */
    welcomeSpaceId: 2551323,            // Welcome! (welome-library)
    title:    'Start here',
    open:     'panel',
    sheetBase:'https://tmm-circle-assets.pages.dev/go/c/',
    /* Sending new members here from the home screen. Circle's own new-member
       welcome never fires for people who join with the app's "Join now":
       that signup runs on the website, which completes the profile, so the
       app counts them as existing (tested 1 Oct 2026). So the home screen
       opens Start Here itself, once per member on this device, for anyone
       who joined within NEW_DAYS. screenId is the Start Here App Builder
       screen; null keeps this off. */
    screenId: null,
    newDays:  14,
    /* Without the screen id, the home screen carries Start Here instead: a
       "Start here" shelf at the top for members who joined within newDays,
       its cards opening in the post panel. It goes away on its own after. */
    homeShelf: true,
    homeShelfTitle: 'Start here',
    /* Free members cannot open the Start Here space; their home already
       leads with the Welcome video and the Starter Library (QA, 2 Oct). */
    homeShelfSkipTiers: ['free'],
  },

  SHARE: {
    title:  'Share MotherHub!',
    body:   'Share MotherHub, earn a chance to win a 30 min 1:1 with Cait!',
    cta:    'Learn More',
    url:    'https://tmm-circle-assets.pages.dev/go/share',
    appUrl: 'https://members.themillionairemother.com/share',
    newTab: true,
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
      hero:         { label:'Announcements', url:'https://members.themillionairemother.com/c/motherhood' },
      contentGrid:  { label:'Connect with vetted Experts', spaceId:2468301, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/the-expert-network', placeholders:'mark' },
      featuredEvent:{ label:'Coming Up', spaceId:2491518, space_type:'event', url:'https://members.themillionairemother.com/c/motherhub-events' },
      postFeed:     { label:'From the community', spaceId:2823968, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/motherhub-conversations-d9bb26' },
      eventsGrid:   { label:'Upcoming Events', spaceId:2491518, space_type:'event', count:6, url:'https://members.themillionairemother.com/c/motherhub-events' },
    },

    /* NEW TIER. Same as Mother Hub except its group chat is the Expert
       Network's own. Detected via the "MotherHub Expert Network"
       access group (was called Matriarch Network). */
    expert_network: {
      label: 'MotherHub Expert Network',
      hero:         { label:'Announcements', url:'https://members.themillionairemother.com/c/motherhood' },
      contentGrid:  { label:'Connect with vetted Experts', spaceId:2468301, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/the-expert-network', placeholders:'mark' },
      /* Coming Up and Upcoming Events are MotherHub Events, as for MotherHub
         (1 Oct). The Expert Network events space is not open to its members. */
      featuredEvent:{ label:'Coming Up', spaceId:2491518, space_type:'event', url:'https://members.themillionairemother.com/c/motherhub-events' },
      postFeed:     { label:'From the Expert Network', spaceId:2632318, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/member-spotlight' },
      eventsGrid:   { label:'Upcoming Events', spaceId:2491518, space_type:'event', count:6, url:'https://members.themillionairemother.com/c/motherhub-events' },
    },
    foundry: {
      label: 'Foundry Member',
      hero:         { label:'Announcements', url:'https://members.themillionairemother.com/c/announcements-c79c49' },
      /* Retitled per QA (1 Oct 2026); same posts. Until the owner adds
         images to them, they show the Business Channel thumbnail. */
      contentGrid:  { label:'Business Channel', spaceId:2349045, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/coaching-q-a', placeholders:'business' },
      /* kind:'posts' puts a shelf of posts in section 3 instead of the event
         banner. Every post in the MME Program Library (QA, 1 Oct 2026); it
         used to keep only posts tagged `featured`, and none were, so the
         section never showed. */
      featuredEvent:{ label:'Inside the Vault', spaceId:2361522, space_type:'basic', kind:'posts', count:6, url:'https://members.themillionairemother.com/c/mme-program-library', placeholders:'resource' },
      postFeed:     { label:'Foundry Celebrations!', spaceId:2349052, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/celebrations-f9f0b0' },
      eventsGrid:   null,
      share:        null,   // Share MotherHub is not for Foundry (QA, 1 Oct 2026)
    },
    /* Deliberately minimal: the vault only. Sections 4 and 5 and the share
       card are hidden per the content map. */
    inner_circle: {
      label: 'Inner Circle',
      hero:         { label:'Inside the Vault', url:'https://members.themillionairemother.com/c/mme-program-library', placeholders:'resource' },
      contentGrid:  { label:'Coaching Q&A', spaceId:802279, space_type:'basic', count:6, url:'https://members.themillionairemother.com/c/guest-experts', placeholders:'resource' },
      featuredEvent:{ label:'Masterclass Library', spaceId:802277, space_type:'basic', kind:'posts', count:6, url:'https://members.themillionairemother.com/c/masterclass-library', placeholders:'resource' },
      postFeed:     null,
      eventsGrid:   null,
      share:        null,
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
  /* Tiers whose hero shows every featured post rather than the newest five.
     MotherHub's two spaces held 12 featured posts on 1 Oct 2026; capped at
     five, all five were Home & Motherhood and Business & Money never showed.
     20 is a ceiling, not a target. Expert Network sees the same two spaces. */
  /* Tiers whose hero shows every post in its spaces, tagged or not.
     Inner Circle: MME Program Library holds one post, the list of its 21
     programs, and nothing there is tagged `featured` (1 Oct 2026). */
  ALL_POSTS: ['inner_circle'],
  MAX_BY_TIER: {
    mother_hub:     20,
    expert_network: 20,
  },
  SPACES: {
    // Free: Welcome! only. Free members can also open Start Here and Free
    // Resources, but the owner features content for them from Welcome!;
    // Free Resources already has its own section (Starter Library).
    free: [
      2551323, // Welcome!        (welome-library)
    ],
    /* Per the content map (10 Sept): the two library spaces only. Identity,
       Home and Money were merged away by Circle and returned 404 on every
       load; MotherHub Plus 404s too. All four removed. */
    mother_hub: [
      2571704, // Home & Motherhood
      2571705, // Business & Money
    ],
    expert_network: [
      2571704, // Home & Motherhood
      2571705, // Business & Money
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
    /* "Inside the Vault" = every post in the MME Program Library (see
       ALL_POSTS). Guest Experts and Masterclass Library have their own
       sections, so they are not scanned for the hero. */
    inner_circle: [
      2361522, // MME Program Library
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

/* Circle's documented webview API. It is injected into custom HTML rendered
   inside the Circle Plus mobile app:

     window.circleUser = { name, email, publicUid, isAdmin, isModerator }
     window.isInsideCircleMobileWebview

   Note what is NOT there: any numeric id. Every Circle API the gate needs is
   keyed by community_member_id, so publicUid is resolved to one by the worker
   (see /member_context). We never send the email anywhere: publicUid is
   already public, an email address in a query string is not.

   Nothing equivalent is documented for Site Builder pages on the web, so on
   that surface there is no viewer to identify and the page falls back to
   public spaces only. */
function getCurrentMember(){
  const u = window.circleUser;
  if (!u) return { publicUid:null, firstName:'', isStaff:false, inApp:!!window.isInsideCircleMobileWebview };
  return {
    publicUid: u.publicUid || null,
    firstName: (u.name || '').trim().split(/\s+/)[0] || '',
    isStaff:   !!(u.isAdmin || u.isModerator),
    inApp:     !!window.isInsideCircleMobileWebview,
  };
}
/* The old lookup (/community_members?id=) hit Circle's LIST endpoint, which
   ignores `id` and returns the first page — so every member got the same
   person's (empty) tags and landed on Free. This asks for the member's own
   access groups instead. */
/* Everything the page needs about the viewer, in one request, as ids.

   The worker resolves publicUid to a community_member_id, then answers with
   the member's access groups (which tier to show) and every space they may
   open (what may be loaded into it). Doing both here means one round trip and
   no chicken-and-egg: the tier decides the layout, the space list decides the
   content, and the page never has to know which spaces are private.

   Returns null only when the answer is unknown — request failed, timed out,
   malformed. Never guess an allow. */
async function getMemberContext(publicUid){
  const url = `${TMM_CONFIG.WORKER_URL}/member_context`
            + (publicUid ? `?public_uid=${encodeURIComponent(publicUid)}` : '');
  const res = await withTimeout(fetch(url), 6000, null);
  if (!res){
    gateFailure = 'timeout';
    console.error('[tmm-home] member context timed out');
    return null;
  }
  if (!res.ok){
    gateFailure = 'http-' + res.status;
    let detail = '';
    try { detail = (await res.text()).slice(0, 300); } catch(e){}
    console.error('[tmm-home] member context failed:', res.status, detail);
    return null;
  }
  try {
    const data = await res.json();
    if (!Array.isArray(data?.spaces)){ gateFailure = 'bad-answer'; return null; }
    return {
      memberId: data.member_id ?? null,
      joinedAt: data.joined_at || null,          // 'YYYY-MM-DD', or null
      groups:   new Set((data.access_groups || []).map(Number)),
      spaces:   new Set(data.spaces.map(Number)),
    };
  } catch(e){ gateFailure = 'bad-json'; return null; }
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
      // Circle returns past events too. Sections called "Coming Up" and
      // "Upcoming Live Events" must not show finished ones, so drop anything
      // that has already started. Nothing upcoming -> section hides itself.
      const records = (data.records || []).filter(r => {
        if (!isEvent) return true;
        const when = r.starts_at || r.published_at;
        return !when || new Date(when).getTime() > Date.now();
      });
      return records.map(r => isEvent
        ? { ...r, name:r.name||'Untitled Event', user_name:r.user_name||'Host',
            published_at:r.starts_at||r.published_at, body:{ body:r.body?.body||r.description||'' } }
        : r);
    }catch(err){ console.error(`fetchSection ${ep} space ${sp.id} threw:`, err.message); return []; }
  }));

  let records = all.flat();

  // Keep only posts carrying a given tag id. Circle returns `topics` as
  // numbers, e.g. [538336] for `featured`, which the name-matching filter
  // below can never match — hence this one.
  if (cfg.topicId){
    const want = Number(cfg.topicId);
    const tagged = records.filter(r => (r.topics || []).some(x =>
      Number(typeof x === 'object' ? x.id : x) === want));
    if (!tagged.length) console.warn(`fetchSection: nothing tagged ${want} in space ${spaces.map(s=>s.id).join(',')}`);
    records = tagged;
  }

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

  // Card shelves headline every card with the post's title, so a post
  // without one became an "Untitled" card. The Expert Network Directory
  // opens with exactly that: an untitled intro post (preferred-providers),
  // not an expert. The feed shows the author instead, so it keeps them.
  if (cfg.titledOnly) records = records.filter(r => String(r.name||'').trim());

  const isEventCfg = spaces.some(s => s.space_type === 'event');
  return records
    // Events: soonest first. Posts: newest first.
    .sort((a,b)=> isEventCfg
      ? new Date(a.starts_at||a.published_at||0) - new Date(b.starts_at||b.published_at||0)
      : new Date(b.published_at||0) - new Date(a.published_at||0))
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

async function fetchFeatured(tierKey, canSee){
  const all = FEATURED.SPACES[tierKey] || FEATURED.SPACES.free;
  /* The hero scans several spaces. Drop the ones this member cannot open
     before asking for anything, so their posts are never even fetched. */
  const spaceIds = canSee ? all.filter(canSee) : [];
  if (!spaceIds.length){ return []; }
  const lists = await Promise.all(spaceIds.map(fetchOneSpacePosts));
  const seen = new Set();
  return lists.flat()
    .filter(p => FEATURED.ALL_POSTS.includes(tierKey) || (p.topics || []).includes(FEATURED.TOPIC_ID))   // carries `featured`
    .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
    .sort((a,b) => new Date(b.published_at||0) - new Date(a.published_at||0))
    .slice(0, FEATURED.MAX_BY_TIER[tierKey] || FEATURED.MAX);
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
   when the thumbnail is exported at 2:1 (1200x600). The card slots are 2:1
   (see .tmm-card-img), so a 2:1 image shows whole and a 2.8:1 one (840x300,
   the cover shape) loses 120px a side, which still keeps its MM mark.
   Checked Sept 2026: 5 of the 6 Free Resources thumbnails are 840x300. */
function coverImage(x){ return (x && (x.cardview_thumbnail_url || x.cover_image_url)) || ''; }

/* Show or hide a whole section — heading, See all and body — from the id of
   any element inside it. Inline display rather than the hidden attribute,
   so no stylesheet rule can override it. Re-run on every init so switching
   tier in the test banner brings back sections another tier had hidden. */
/* Denying a section must remove its content, not just hide it. init() can run
   again in the same page (Try again, or the test banner), and a hidden node
   still holding another tier's posts is indistinguishable from a leak. */
function denySection(innerId){
  const el = document.getElementById(innerId);
  if (el) el.innerHTML = '';
  showSection(innerId, false);
}

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

   `placeholders:'mark'` is for sections that are neither: a plain sand
   block with the brand mark, no word. The Expert Network Directory used
   `resource`, so an expert's post without a thumbnail read "RESOURCES".

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

   The art is 810x540 (3:2) and the card slot is 2:1, so `contain` and the
   per-variant backgrounds in home.css letterbox it at the sides in its own
   backdrop colour rather than cropping the artwork. Both sets land on the
   same four backdrops, so they share those rules. */
const PLACEHOLDER_SETS = {
  announce: [
    { file:'announce-red.webp',   variant:'red'   },
    { file:'announce-white.webp', variant:'white' },
    { file:'announce-linen.webp', variant:'linen' },
    { file:'announce-sand.webp',  variant:'sand'  },
  ],
  /* One image, cropped to fill like a real thumbnail (840x300, title
     centred, so a 2:1 card keeps all of it). */
  business: [
    { file:'business-channel.webp', variant:'cover' },
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
  if (setName === 'mark') return `<div class="${imgClass}ph tmm-ph-mark"></div>`;
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
  if (!posts.length){ denySection('tmmHero'); return; }
  showSection('tmmHero', true);
  const phStart = placeholderStart(cfg.placeholders);
  const cards = posts.map((p,i)=>{
    const img = coverImage(p);
    const noImg = cfg.placeholders ? placeholderImg(i, phStart, 'tmm-hero-img', cfg.placeholders) : `<div class="tmm-hero-imgph"></div>`;
    return `
    <a class="tmm-hero-card" href="${esc(p.url||'#')}" target="_blank" rel="noopener">
      <span class="tmm-cat">${esc(p.space_name||cfg.label||'Post')}</span>
      ${img ? `<img class="tmm-hero-img" src="${esc(img)}" alt="" loading="lazy">` : noImg}
      <h2 class="tmm-hero-title">${esc(p.name||'Untitled')}</h2>
      <div class="tmm-hero-desc">${esc(strip(p.body?.body||'').slice(0,90))}</div>
    </a>`;
  }).join('');
  const dots = posts.length>1
    ? `<div class="tmm-dots" id="tmmHeroDots">${posts.map((_,j)=>`<button class="tmm-dot${j===0?' is-active':''}" data-i="${j}" aria-label="Slide ${j+1}"></button>`).join('')}</div>`
    : '';
  box.innerHTML = `<div class="tmm-hero-scroll" id="tmmHeroScroll">${cards}</div>${dots}`;
  wirePlaceholderFallbacks(box);
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
  if(!posts.length){ denySection('tmmGrid'); return; }   // empty -> no section
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
  if(!events.length){ denySection('tmmFeat'); return; }   // empty -> no section
  // Was pinned to one August 2026 event by slug, which outranked whatever was
  // actually next. Events now arrive soonest-first, so the next one is [0].
  const ev=events[0];
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
  if(!posts.length){ denySection('tmmFeed'); return; }    // empty -> no section
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
  if(!events.length){ denySection('tmmEvents'); return; } // empty -> no section
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

function renderShare(cfg){
  const el = document.getElementById('tmmShare');
  if (!el) return;
  const ext = (cfg.newTab ? ' target="_blank" rel="noopener"' : '') +
              (cfg.appUrl ? ` data-tmm-app-url="${esc(cfg.appUrl)}"` : '');
  el.innerHTML = `
    <div class="tmm-share">
      <div class="tmm-share-title">${esc(cfg.title)}</div>
      ${cfg.body ? `<div class="tmm-share-body">${esc(cfg.body)}</div>` : ''}
      <a class="tmm-btn" href="${esc(cfg.url)}"${ext}>${esc(cfg.cta || 'Learn More')}</a>
    </div>`;
}

/* Section 3 as a shelf of posts, for tiers where it isn't an event:
   Inner Circle's Masterclass Library, Foundry's Inside the vault. Same card
   as the content grid, in section 3's container. */
function renderFeatPosts(posts,cfg){
  set('tmmS3Label',cfg.label); href('tmmS3Url',cfg.url);
  const el=document.getElementById('tmmFeat');
  if(!posts.length){ denySection('tmmFeat'); return; }
  showSection('tmmFeat', true);
  const phSet = cfg.placeholders;
  const start = placeholderStart(phSet);
  el.innerHTML = `<div class="tmm-scroll">` + posts.map((p,i)=>{
    const img = coverImage(p);
    return `
    <a class="tmm-card" href="${esc(p.url||'#')}" target="_blank" rel="noopener">
      ${img ? `<img class="tmm-card-img" src="${esc(img)}" alt="" loading="lazy">` : placeholderImg(i,start,'tmm-card-img',phSet)}
      <div class="tmm-card-title">${esc(p.name||'Untitled')}</div>
      <div class="tmm-card-desc">${esc(strip(p.body?.body||'').slice(0,80))}</div>
    </a>`;
  }).join('') + `</div>`;
  wirePlaceholderFallbacks(el);
}

/* ---------- Start Here screen ---------- */
/* Remembered per member on this device, so Start Here opens by itself once.
   Storage can be unavailable; then nothing is remembered and, rather than
   send someone to Start Here on every visit, nothing is opened either. */
function tmmStartHereSeenKey(publicUid){ return `tmm-start-here-seen:${publicUid}`; }
function tmmStartHereSeen(publicUid){
  try { return localStorage.getItem(tmmStartHereSeenKey(publicUid)) === '1'; }
  catch(e){ return null; }
}
function tmmMarkStartHereSeen(publicUid){
  try { localStorage.setItem(tmmStartHereSeenKey(publicUid), '1'); return true; }
  catch(e){ return false; }
}
/* Joined within START_HERE.newDays, by the Worker's joined_at. Staff never. */
function tmmIsNewMember(member, ctx){
  const cfg = TMM_CONFIG.START_HERE;
  if (!cfg || member.isStaff || !ctx?.joinedAt) return false;
  const days = (Date.now() - Date.parse(ctx.joinedAt + 'T00:00:00Z')) / 86400000;
  return days >= 0 && days <= cfg.newDays;
}

/* The Start Here shelf on the home screen, for new members only: the Start
   Here space's posts as cards, opening in the post panel. Removed for
   everyone else, so a member who passes newDays loses it on the next load. */
async function renderStartHereShelf(member, ctx, tierKey){
  const cfg  = TMM_CONFIG.START_HERE;
  const root = document.getElementById('tmmHome');
  let box = document.getElementById('tmmNewShelf');
  if (!root || !cfg?.homeShelf || (cfg.homeShelfSkipTiers || []).includes(tierKey) ||
      !tmmIsNewMember(member, ctx)) { if (box) box.remove(); return; }
  if (!box) {
    box = document.createElement('section');
    box.className = 'tmm-section';
    box.id = 'tmmNewShelf';
    box.innerHTML = `
      <div class="tmm-sec-head"><h2 class="tmm-sec-title">${esc(cfg.homeShelfTitle)}</h2></div>
      <div class="tmm-scroll" id="tmmNewShelfList">
        <div class="tmm-skel" style="width:270px;height:230px;flex:0 0 auto"></div>
        <div class="tmm-skel" style="width:270px;height:230px;flex:0 0 auto"></div>
      </div>`;
    root.insertBefore(box, root.querySelector('.tmm-section'));
  }
  const posts = await fetchOneSpacePosts(cfg.spaceId);
  const list = document.getElementById('tmmNewShelfList');
  if (!list) return;
  if (!posts.length) { box.remove(); return; }
  posts.forEach(p => tmmPanelPosts.set(String(p.id), p));
  list.innerHTML = posts.map(p => {
    const img = coverImage(p);
    return `
    <a class="tmm-card" href="${esc(p.url || '#')}" target="_blank" rel="noopener" data-tmm-panel="${esc(String(p.id))}">
      ${img ? `<img class="tmm-card-img" src="${esc(img)}" alt="" loading="lazy">` : `<div class="tmm-card-imgph"></div>`}
      <div class="tmm-card-title">${esc(p.name || 'Untitled')}</div>
      <div class="tmm-card-desc">${esc(strip(p.body?.body || '').slice(0, 80))}</div>
    </a>`;
  }).join('');
}

/* From the home screen: open Start Here for a member who joined recently and
   has not had it yet. True if it navigated. */
function tmmMaybeOpenStartHere(member, ctx){
  const cfg = TMM_CONFIG.START_HERE;
  if (!cfg || !cfg.screenId || !TMM_IN_APP || member.isStaff || !member.publicUid) return false;
  if (typeof window.navigateToOrphanedScreen !== 'function' || !ctx?.joinedAt) return false;
  const days = (Date.now() - Date.parse(ctx.joinedAt + 'T00:00:00Z')) / 86400000;
  if (!(days >= 0 && days <= cfg.newDays)) return false;
  if (tmmStartHereSeen(member.publicUid) !== false) return false;   // seen, or cannot tell
  if (!tmmMarkStartHereSeen(member.publicUid)) return false;
  window.navigateToOrphanedScreen(cfg.screenId);
  return true;
}

function startHereLink(p, cfg){
  const url = p.url || '#';
  if (cfg.open === 'panel') return { href:url, app:'', panel:true };
  if (cfg.open !== 'sheet') return { href:url, app:'' };
  const path = url.replace(/^https:\/\/members\.themillionairemother\.com\/c\//, '');
  if (path === url) return { href:url, app:'' };   // not a /c/ post url
  return { href:url, app:cfg.sheetBase + path };
}

/* ---- Post panel: a sheet this page draws, sliding up over the screen ----
   Post HTML comes from Circle; only plain text formatting, links, images
   and Vimeo/YouTube players are kept, every attribute but href/src/alt is
   dropped, and Circle's button links become our .tmm-btn. */
const PANEL_KEEP = new Set(['P','STRONG','B','EM','I','U','H1','H2','H3','H4','HR','UL','OL','LI','BR','A','BLOCKQUOTE','IMG']);
const PANEL_DROP = new Set(['SCRIPT','STYLE','OBJECT','EMBED','FORM','INPUT','BUTTON','TEXTAREA','SELECT','TEMPLATE','SVG','MATH','LINK','META','NOSCRIPT']);
function cleanPostHtml(html){
  const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html');
  const box = doc.body.firstChild;
  (function walk(node){
    for (const el of [...node.children]) {
      const tag = el.tagName;
      if (tag === 'IFRAME') {
        const src = postVideoSrc(el.outerHTML);
        if (src) {
          const v = doc.createElement('div');
          v.className = 'tmm-sh-video';
          v.innerHTML = `<iframe src="${esc(src)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe>`;
          el.replaceWith(v);
        } else el.remove();
        continue;
      }
      if (PANEL_DROP.has(tag)) { el.remove(); continue; }
      walk(el);
      if (tag === 'DIV' && /(^|\s)cta-/.test(el.className)) {
        const p = doc.createElement('p');
        p.className = 'tmm-panel-cta';
        p.append(...el.childNodes);
        el.replaceWith(p);
        continue;
      }
      if (!PANEL_KEEP.has(tag)) { el.replaceWith(...el.childNodes); continue; }
      const href = el.getAttribute('href') || '', src = el.getAttribute('src') || '', alt = el.getAttribute('alt') || '';
      const isCta = el.classList.contains('tiptap-cta');
      for (const a of [...el.attributes]) el.removeAttribute(a.name);
      if (tag === 'A') {
        if (/^(https?:|mailto:)/i.test(href)) el.setAttribute('href', href);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener');
        if (isCta) el.className = 'tmm-btn';
      }
      if (tag === 'IMG') {
        if (/^https:/i.test(src)) { el.setAttribute('src', src); el.setAttribute('alt', alt); el.setAttribute('loading', 'lazy'); }
        else el.remove();
      }
    }
  })(box);
  return box.innerHTML;
}

const tmmPanelPosts = new Map();       // post id -> post, filled by initStartHere
let tmmPanelLastFocus = null;

function tmmPanelEl(){
  let el = document.getElementById('tmmPanel');
  if (el && el.isConnected) return el;
  const home = document.getElementById('tmmHome');
  if (!home) return null;
  home.insertAdjacentHTML('beforeend', `
    <div class="tmm-panel" id="tmmPanel" aria-hidden="true">
      <div class="tmm-panel-backdrop" data-tmm-panel-close></div>
      <div class="tmm-panel-sheet" role="dialog" aria-modal="true" aria-labelledby="tmmPanelTitle">
        <div class="tmm-panel-bar">
          <span class="tmm-panel-grab" aria-hidden="true"></span>
          <button class="tmm-panel-close" type="button" aria-label="Close" data-tmm-panel-close>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div class="tmm-panel-scroll" id="tmmPanelScroll"></div>
      </div>
    </div>`);
  el = document.getElementById('tmmPanel');
  tmmPanelDrag(el);
  return el;
}

function tmmPanelOpen(post){
  const el = tmmPanelEl();
  if (!el || !post) return;
  const img = coverImage(post);
  document.getElementById('tmmPanelScroll').innerHTML = `
    ${img ? `<img class="tmm-panel-img" src="${esc(img)}" alt="">` : ''}
    <div class="tmm-panel-body">
      <h2 class="tmm-panel-title" id="tmmPanelTitle">${esc(post.name || '')}</h2>
      <div class="tmm-panel-content">${cleanPostHtml(post.body?.body)}</div>
    </div>`;
  document.getElementById('tmmPanelScroll').scrollTop = 0;
  tmmPanelLastFocus = document.activeElement;
  document.documentElement.classList.add('tmm-panel-open');
  el.setAttribute('aria-hidden', 'false');
  void el.offsetWidth;                 // start the slide from below
  el.classList.add('is-open');
  setTimeout(() => el.querySelector('.tmm-panel-close')?.focus({ preventScroll:true }), 320);
}

function tmmPanelClose(){
  const el = document.getElementById('tmmPanel');
  if (!el || !el.classList.contains('is-open')) return;
  el.classList.remove('is-open');
  el.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('tmm-panel-open');
  const sheet = el.querySelector('.tmm-panel-sheet');
  sheet.style.transform = '';
  setTimeout(() => {                   // stop a playing video once it is off screen
    if (!el.classList.contains('is-open')) document.getElementById('tmmPanelScroll').innerHTML = '';
  }, 350);
  if (tmmPanelLastFocus && tmmPanelLastFocus.focus) tmmPanelLastFocus.focus({ preventScroll:true });
}

/* Drag the bar down to close, like the app's own sheets. */
function tmmPanelDrag(el){
  const sheet = el.querySelector('.tmm-panel-sheet');
  const bar   = el.querySelector('.tmm-panel-bar');
  let y0 = null, dy = 0;
  bar.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = 'none'; }, { passive:true });
  bar.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive:true });
  bar.addEventListener('touchend', () => {
    if (y0 === null) return;
    y0 = null;
    sheet.style.transition = '';
    if (dy > 90) tmmPanelClose(); else sheet.style.transform = '';
  }, { passive:true });
}

document.addEventListener('click', e => {
  if (!tmmLive()) return;
  if (e.target.closest && e.target.closest('[data-tmm-panel-close]')) { e.preventDefault(); tmmPanelClose(); return; }
  const card = e.target.closest && e.target.closest('a[data-tmm-panel]');
  if (!card) return;
  const post = tmmPanelPosts.get(card.getAttribute('data-tmm-panel'));
  if (!post) return;                   // unknown: let the link open normally
  e.preventDefault();
  e.stopImmediatePropagation();
  tmmPanelOpen(post);
}, true);
document.addEventListener('keydown', e => { if (tmmLive() && e.key === 'Escape') tmmPanelClose(); });

/* The video in a post body, if it is one we can play here. Only Vimeo and
   YouTube players: the src comes from post HTML. */
function postVideoSrc(html){
  const f = new DOMParser().parseFromString(html || '', 'text/html').querySelector('iframe[src]');
  if (!f) return '';
  try {
    const u = new URL(f.getAttribute('src'));
    return /^(player\.vimeo\.com|www\.youtube(-nocookie)?\.com)$/.test(u.hostname) && u.protocol === 'https:' ? u.href : '';
  } catch(e){ return ''; }
}
function firstParagraph(html){
  const p = new DOMParser().parseFromString(html || '', 'text/html').querySelector('p');
  return (p ? p.textContent : strip(html)).trim();
}
function renderStartHereWelcome(post){
  const el = document.getElementById('tmmShWelcome');
  if (!el) return;
  if (!post) { el.innerHTML = ''; return; }
  const video = postVideoSrc(post.body?.body);
  const img   = coverImage(post);
  const media = video
    ? `<div class="tmm-sh-video"><iframe src="${esc(video)}" title="${esc(post.name || 'Welcome video')}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>`
    : (img ? `<img class="tmm-sh-img" src="${esc(img)}" alt="">` : '');
  el.innerHTML = `
    <div class="tmm-sh-card tmm-sh-card--welcome">
      ${media}
      <div class="tmm-sh-text">
        <div class="tmm-sh-title">${esc(post.name || 'Welcome!')}</div>
        <div class="tmm-sh-desc">${esc(firstParagraph(post.body?.body))}</div>
      </div>
    </div>`;
}

async function initStartHere(){
  const root = document.getElementById('tmmHome');
  const cfg  = TMM_CONFIG.START_HERE;
  if (!root || !cfg) return;
  if (!document.getElementById('tmmStartHere')) {
    root.insertAdjacentHTML('beforeend', `
      <h1 class="tmm-greeting" id="tmmGreeting"></h1>
      <section class="tmm-section" id="tmmShWelcome"></section>
      <section class="tmm-section">
        <div class="tmm-sec-head"><h2 class="tmm-sec-title">${esc(cfg.title)}</h2></div>
        <div class="tmm-sh-list" id="tmmStartHere"></div>
      </section>`);
  }
  const { firstName, publicUid } = getCurrentMember();
  if (publicUid) tmmMarkStartHereSeen(publicUid);
  set('tmmGreeting', firstName
    ? `Welcome to The Millionaire Mother app, ${firstName}!`
    : 'Welcome to The Millionaire Mother app!');

  const list = document.getElementById('tmmStartHere');
  list.innerHTML = '<div class="tmm-skel" style="height:300px"></div><div class="tmm-skel" style="height:300px"></div>';
  if (cfg.welcomeSpaceId && !document.querySelector('#tmmShWelcome .tmm-sh-card')) {
    document.getElementById('tmmShWelcome').innerHTML = '<div class="tmm-skel" style="height:320px"></div>';
  }
  const [posts, welcome] = await Promise.all([
    fetchOneSpacePosts(cfg.spaceId),
    cfg.welcomeSpaceId ? fetchOneSpacePosts(cfg.welcomeSpaceId) : Promise.resolve([]),
  ]);
  /* Pull to refresh reruns this; leave a playing video alone. */
  if (!document.querySelector('#tmmShWelcome iframe')) renderStartHereWelcome(welcome[0]);
  if (!posts.length) {
    list.innerHTML = `<p class="tmm-empty">This didn't load. <button class="tmm-btn tmm-btn--sm" type="button" onclick="tmmSetTier()">Try again</button></p>`;
    return;
  }
  posts.forEach(p => tmmPanelPosts.set(String(p.id), p));
  list.innerHTML = posts.map(p => {
    const link = startHereLink(p, cfg);
    const img  = coverImage(p);         // 16:9 card thumbnail, then the cover
    return `
    <a class="tmm-sh-card" href="${esc(link.href)}" target="_blank" rel="noopener"${link.app ? ` data-tmm-app-url="${esc(link.app)}"` : ''}${link.panel ? ` data-tmm-panel="${esc(String(p.id))}"` : ''}>
      ${img ? `<img class="tmm-sh-img" src="${esc(img)}" alt="" loading="lazy">` : ''}
      <div class="tmm-sh-text">
        <div class="tmm-sh-title">${esc(p.name || 'Untitled')}</div>
        <div class="tmm-sh-desc">${esc(strip(p.body?.body || '').slice(0, 110))}…</div>
      </div>
    </a>`;
  }).join('');
}

/* ---------- init ---------- */
async function init(overrideTierKey){
  if (document.getElementById('tmmHome')?.dataset.page === 'start-here') return initStartHere();
  const member    = await getCurrentMember();
  const firstName = member?.firstName || '';
  /* One request answers both questions. TEST_MODE skips it: that surface has
     no viewer at all. */
  const ctx = TMM_CONFIG.TEST_MODE ? null : await getMemberContext(member.publicUid);
  const detectedTier = ctx
    ? (TMM_CONFIG.TIER_GROUPS.find(t => t.groups.some(id => ctx.groups.has(id)))?.tier || 'free')
    : 'free';
  const tierKey   = overrideTierKey || (TMM_CONFIG.TEST_MODE ? 'free' : detectedTier);
  if (!overrideTierKey) tmmMaybeOpenStartHere(member, ctx);   // the home page still loads behind it
  const tier      = TMM_CONFIG.TIERS[tierKey] || TMM_CONFIG.TIERS.free;
  console.info('[tmm-home] viewer:', member.publicUid || '(no identity)',
    '| in app:', member.inApp, '| staff:', member.isStaff,
    '| member id:', ctx?.memberId ?? '(unresolved)',
    '| groups:', ctx ? [...ctx.groups].join(',') || 'none' : '(unknown)',
    '| tier:', tierKey);
  // Test banner: show the DETECTED tier in its dropdown, so a test login can
  // see what it was matched to. Skipped when the dropdown itself chose it.
  // Show the running build in the test banner (test surfaces only).
  const banner = document.getElementById('tmmTestBanner');
  if (banner && !banner.querySelector('.tmm-build')) {
    const tag = document.createElement('span');
    tag.className = 'tmm-build';
    tag.style.cssText = 'margin-left:auto;font:11px/1.2 ui-monospace,monospace;color:#8A8477;white-space:nowrap';
    banner.appendChild(tag);
  }
  if (banner) banner.querySelector('.tmm-build').textContent = `${TMM_CONFIG.BUILD} · ${tierKey}`;

  // Build the tier options from TIERS, so a new tier (Expert Network) shows
  // up in the dropdown without re-pasting body.html.
  const sel0 = document.querySelector('#tmmTestBanner select');
  if (sel0) {
    const want = Object.keys(TMM_CONFIG.TIERS);
    const have = [...sel0.options].map(o=>o.value);
    if (want.some(k=>!have.includes(k))) {
      const keep = sel0.value;
      sel0.innerHTML = want.map(k=>`<option value="${k}">${esc(TMM_CONFIG.TIERS[k].label || k)}</option>`).join('');
      if (want.includes(keep)) sel0.value = keep;
    }
  }

  const sel = document.querySelector('#tmmTestBanner select');
  if (sel && !overrideTierKey && [...sel.options].some(o => o.value === tierKey)) sel.value = tierKey;

  const root = document.getElementById('tmmHome');
  if (root) root.setAttribute('data-brand', TMM_CONFIG.BRAND_BY_TIER[tierKey] || 'mm');
  /* Greeting line above section 1, built here so none of the three pasted
     bodies needs editing. The name is the first word of the member's Circle
     display name, from window.circleUser — which only the app provides. On
     the web, and for anyone without a name, it reads "Hello." */
  if (root && !document.getElementById('tmmGreeting')) {
    const g = document.createElement('h1');
    g.id = 'tmmGreeting';
    g.className = 'tmm-greeting';
    const sub = document.createElement('p');
    sub.id = 'tmmGreetingSub';
    sub.className = 'tmm-greeting-sub';
    const first = root.querySelector('.tmm-section');
    root.insertBefore(g, first || root.firstChild);
    root.insertBefore(sub, first || null);
  }
  set('tmmGreeting', firstName ? `Hello, ${firstName}.` : 'Hello.');
  set('tmmGreetingSub', "Here's everything new that's happened in The Millionaire Mother app.");
  renderStartHereShelf(member, ctx, tierKey).catch(e => console.error('start here shelf error:', e));

  /* A previous attempt may have left the gate fallback on screen; init can
     run again from the Try again button or the test banner. Put section 1
     back the way it loads so a retry does not inherit the failed state. */
  const seeAll0 = document.getElementById('tmmS1Url');
  if (seeAll0) seeAll0.style.display = '';
  const hero0 = document.getElementById('tmmHero');
  if (hero0 && hero0.querySelector('.tmm-gate')) {
    hero0.innerHTML = '<div class="tmm-skel" style="height:400px"></div>';
  }

  /* ---- access gate ----
     TEST_MODE is a developer surface with no member context, so it is the one
     case that skips the gate. Everything else is decided by what Circle says
     this member is in. An unknown answer denies. */
  const bypass = TMM_CONFIG.TEST_MODE || member.isStaff ||
                 (ctx?.memberId != null && TMM_CONFIG.ADMIN_BYPASS_IDS.includes(ctx.memberId));
  const mySpaces = bypass ? null : (ctx ? ctx.spaces : null);
  const canSee   = (id) => bypass ? true : (mySpaces ? mySpaces.has(id) : false);
  const canSeeCfg = (cfg) => {
    const ids = cfg.spaces ? cfg.spaces.map(sp => sp.id)
                           : (cfg.spaceId ? [cfg.spaceId] : []);
    return ids.length > 0 && ids.every(canSee);
  };
  console.info('[tmm-home] access:', bypass
    ? (TMM_CONFIG.TEST_MODE ? 'bypass (test mode)' : 'bypass (admin or moderator)')
    : (mySpaces ? `${mySpaces.size} spaces openable` : 'UNKNOWN — showing nothing'));

  const shareCfg = (tier.share === undefined) ? TMM_CONFIG.SHARE : tier.share;

  /* Could not establish what this member may open. Show nothing rather than
     risk showing content they cannot. The share card is not gated content. */
  if (!bypass && !mySpaces){
    ['tmmGrid','tmmFeat','tmmFeed','tmmEvents'].forEach(denySection);
    showSection('tmmHero', true);
    set('tmmS1Label', 'Your home');
    const seeAll = document.getElementById('tmmS1Url');
    if (seeAll) seeAll.style.display = 'none';
    const hero = document.getElementById('tmmHero');
    if (hero) hero.innerHTML = `
      <div class="tmm-gate">
        <div class="tmm-gate-title">We couldn&rsquo;t load your library just now.</div>
        <div class="tmm-gate-body">This is a connection hiccup, not a problem with your
          membership. Give it another go.</div>
        <button class="tmm-btn" type="button" onclick="tmmSetTier()">Try again</button>
        <div class="tmm-gate-ref">${esc(gateFailure || 'unknown')} &middot; ${esc(member.publicUid || 'no uid')} &middot; ${esc(TMM_CONFIG.BUILD)}</div>
      </div>`;
    showSection('tmmShare', !!shareCfg);
    if (shareCfg) { try { renderShare(shareCfg); } catch(e){} }
    return;
  }

  // Each section fetches + renders on its own. A slow/empty section can no
  // longer block the others (previously one hung fetch froze the whole page).
  const render = (cfg, fn, boxId, opts) => {
    const ok = !!cfg && canSeeCfg(cfg);
    if (!ok) { denySection(boxId); return; }
    showSection(boxId, true);
    fetchSection(opts ? { ...cfg, ...opts } : cfg)
      .then(d => { try { fn(d, cfg); } catch(e){ console.error('render error:', e); } })
      .catch(e => console.error('section error:', e));
  };

  // Hero = posts tagged `featured` community-wide, filtered to the groups
  // this tier can access. Everything else stays per-space.
  showSection('tmmHero', true);   // skeleton while loading; renderHero decides
  fetchFeatured(tierKey, canSee)
    .then(posts => { try { renderHero(posts, tier.hero); } catch(e){ console.error('hero render error:', e); denySection('tmmHero'); } })
    .catch(e => { console.error('featured error:', e); denySection('tmmHero'); });

  // Share card: tier value wins when present, otherwise the shared default.
  // null for a tier hides it.
  showSection('tmmShare', !!shareCfg);
  if (shareCfg) { try { renderShare(shareCfg); } catch(e){ console.error('share render error:', e); } }

  render(tier.contentGrid,   renderContentGrid, 'tmmGrid', { titledOnly:true });
  render(tier.featuredEvent, (d,c)=> (c.kind==='posts' ? renderFeatPosts(d,c) : renderFeatured(d,c)), 'tmmFeat',
         tier.featuredEvent?.kind === 'posts' ? { titledOnly:true } : null);
  render(tier.postFeed,      renderFeed,        'tmmFeed');
  render(tier.eventsGrid,    renderEvents,      'tmmEvents');
}

/* expose test-tier switcher to window (IIFE hides it otherwise) */
window.tmmSetTier = (k)=>init(k);

/* Published for /docs/home-map.html, the living map of what each tier's home
   screen shows. That page loads this file and reads the config straight from
   here, so the map can never drift from what is actually deployed. Read-only
   copies; nothing in the page reads them back. */
window.__TMM_CONFIG   = TMM_CONFIG;
window.__TMM_FEATURED = FEATURED;

/* ---------- boot ----------
   Circle is a single-page app: it may inject our HTML block AFTER this
   script runs, and DOMContentLoaded may have already fired. So instead of
   relying on that one event, we wait until #tmmHome actually exists, and
   re-init if Circle swaps in a fresh block on navigation (e.g. tapping Home).
   This is why content loaded via the test dropdown but not on nav before. */
let tmmBootedEl = null;

/* In the app, the page scrolls inside a box exactly the screen's height.
   The app sizes its webview from the page's height, but measures once (or
   late) and does not follow changes: sections fill in a second after load,
   so members saw the page cropped mid-hero, or able to scroll a little and
   then spring back, or far taller than the content. A page that is always
   exactly one screen tall reads the same whenever the app measures it.
   Web visitors keep ordinary page scrolling. */
const TMM_IN_APP = !!window.isInsideCircleMobileWebview;
function tmmScroller(){ return document.getElementById('tmmAppScroll'); }
function tmmWrapForApp(home){
  if (!TMM_IN_APP || home.parentElement?.id === 'tmmAppScroll') return;
  document.documentElement.classList.add('tmm-in-app');
  const box = document.createElement('div');
  box.id = 'tmmAppScroll';
  home.parentNode.insertBefore(box, home);
  const banner = document.getElementById('tmmTestBanner');
  if (banner) box.appendChild(banner);
  box.appendChild(home);
}

function tmmTryBoot(){
  if (!tmmLive()) return;
  const home = document.getElementById('tmmHome');
  if (!home) return;
  if (home === tmmBootedEl) return;              // this block already initialised
  tmmBootedEl = home;                            // set before init() so DOM edits don't re-trigger
  tmmWrapForApp(home);
  if(!TMM_CONFIG.SHOW_TEST_BANNER){ const b=document.getElementById('tmmTestBanner'); if(b) b.style.display='none'; }
  init();
}
/* Self-update. The app keeps this page alive between visits and pasting a
   new head into Circle does not reach a page that is already open, so a
   member could sit on an old build until they quit the app. On start and on
   every pull to refresh, version.json says which build is current; if it is
   newer than this one, its CSS and JS are loaded into the page and take
   over (this copy stops: tmmLive). The head snippet's ?v= then only
   matters for a cold start, and need not be re-pasted for each release.
   No window.location.reload(): in the app the page's address is circle.so,
   so a reload could load Circle's website in place of the home screen. */
const TMM_BASE    = 'https://tmm-circle-assets.pages.dev/home/';
const TMM_VERSION = parseInt(String(TMM_CONFIG.BUILD).replace(/^v/, ''), 10);
async function tmmLatestVersion(){
  try{
    const res = await withTimeout(fetch(`${TMM_BASE}version.json?t=${Date.now()}`, { cache:'no-store' }), 1500, null);
    if (!res || !res.ok) return null;
    const v = parseInt((await res.json()).v, 10);
    return Number.isFinite(v) ? v : null;
  }catch(e){ return null; }
}
/* Resolves true when a newer build has loaded and taken over. */
async function tmmUpdateIfNewer(){
  const v = await tmmLatestVersion();
  if (!v || !(v > TMM_VERSION)) return false;
  const tried = (window.__tmmTried = window.__tmmTried || {});
  if (tried[v]) return false;              // tried once already: never loop
  tried[v] = true;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = `${TMM_BASE}home.css?v=${v}`;
  css.onload = () => document.querySelectorAll('link[href*="/home/home.css"]')
    .forEach(l => { if (l !== css) l.remove(); });
  document.head.appendChild(css);
  const ok = await new Promise(res => {
    const js = document.createElement('script');
    js.src = `${TMM_BASE}home.js?v=${v}`;
    js.onload = () => res(true);
    js.onerror = () => res(false);
    document.head.appendChild(js);
  });
  return ok && !tmmLive();
}
function tmmRefresh(){
  return tmmUpdateIfNewer().then(took => took ? null : init());
}

async function tmmStart(){
  if (await tmmUpdateIfNewer()) return;    // a newer build is running instead
  tmmTryBoot();
  // Keep watching: covers Circle injecting the block late AND re-injecting it on navigation.
  new MutationObserver(tmmTryBoot).observe(document.documentElement, {childList:true, subtree:true});
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tmmStart);
else tmmStart();

/* Every link on the home screen goes through the app's own navigation,
   window.navigateToUrl (Custom HTML API reference), when it exists.
   A plain link to a space or post loaded Circle's WEBSITE inside the app:
   a second header, the website's Spaces/Home/Members tabs, and the
   website's bottom bar, whose Home never came back here. Through
   navigateToUrl, Circle content opens as the app's native screen, and
   other pages (the Site Builder /share page) open in the slide-up sheet
   Circle's Button block uses, where Back closes it.
   A link may carry data-tmm-app-url to open a different address in the
   app than on the web (the share card: /go/share on the web, /share in
   the app). On the web, or if the app ever drops the function, links
   behave as ordinary links. */
document.addEventListener('click', e => {
  if (!tmmLive() || !TMM_IN_APP || typeof window.navigateToUrl !== 'function') return;
  const a = e.target.closest && e.target.closest('#tmmHome a[href], a[data-tmm-app-url]');
  if (!a || a.hasAttribute('data-tmm-panel')) return;   // opens the post panel instead
  const url = a.getAttribute('data-tmm-app-url') || a.href;
  if (!/^https?:/i.test(url) || a.getAttribute('href') === '#') return;
  e.preventDefault();
  window.navigateToUrl(url);
}, true);

/* Layout readout (TMM_CONFIG.DEBUG_LAYOUT). `view` is window.innerHeight,
   the height the app gave the webview; `page` is the document's full height.
   If the app sized the webview from the page, they match. The log keeps the
   last few changes, newest first, as seconds-since-load: view/page. */
/* Test accounts only: real members already use this app. Checked on the
   device; the address is never sent anywhere. */
if (TMM_CONFIG.DEBUG_LAYOUT &&
    /@team386556\.testinator\.com$/i.test(window.circleUser?.email || '')) (function(){
  const t0 = performance.now();
  const log = [];
  let box = null, last = '';
  const pageH = () => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  /* Which copy of the home screen this is. There are two (the Home tab's
     screen and the one in the top nav), with the same pasted markup, so
     the readout shows the address the app loaded each one from, plus a
     data-screen label if one is added to #tmmHome in that screen's body. */
  function where(){
    const label = document.getElementById('tmmHome')?.dataset.screen;
    const addr = location.host + location.pathname + location.search + location.hash;
    return `${label ? 'screen ' + label + '\n' : ''}at ${addr || '(no address)'}`;
  }
  function draw(){
    if (!box || !box.isConnected) {
      if (!document.body) return;
      box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:6px;bottom:110px;z-index:2147483647;max-width:70vw;padding:6px 8px;border-radius:6px;background:rgba(15,15,15,.82);color:#EAE4D6;font:10px/1.35 ui-monospace,Menlo,monospace;pointer-events:none;white-space:pre-wrap;word-break:break-all';
      document.body.appendChild(box);
    }
    box.textContent = `${TMM_CONFIG.BUILD}\n${where()}\nview ${window.innerHeight} · page ${pageH()} · inner ${tmmScroller()?.scrollHeight ?? '-'} · scrolled ${Math.round(tmmScroller()?.scrollTop ?? window.scrollY)}\n` + log.slice(0, 8).join('\n');
  }
  function sample(why){
    if (!tmmLive()) { if (box) box.remove(); return; }
    const now = `${window.innerHeight}/${pageH()}`;
    if (now !== last) {
      last = now;
      log.unshift(`${((performance.now() - t0) / 1000).toFixed(1)}s ${now} ${why}`);
    }
    draw();
  }
  window.addEventListener('resize', () => sample('resize'));
  window.addEventListener('load', () => sample('load'));
  window.addEventListener('scroll', () => draw(), { passive:true, capture:true });
  setInterval(() => sample('tick'), 500);
  sample('start');
})();

/* Pull down to refresh. The app keeps the home screen's webview alive
   between visits, so new posts did not show until the app was quit and
   reopened. Pulling down from the top and letting go past the threshold
   reruns init(), which refetches every section, after first loading a
   newer build if version.json names one (tmmRefresh).
   Listeners are passive, so they never block the page's own scrolling; on
   iOS the pull rides on the native rubber-band. Only starts when the page is
   already scrolled to the top, so an ordinary scroll up never triggers it. */
/* The refresh indicator is the brand mark in its two layers, spokes over
   the wavy star, each centred on 0,0 so CSS can turn them about the
   middle. The wavy arms point at 30 + 60n degrees and the spokes at 60n,
   so the full mark is the two 30 degrees apart; see .tmm-ptr in home.css
   for the alternating ticks while it loads. */
const TMM_PTR_MARK =
  '<svg class="tmm-ptr-icon" width="30" height="30" viewBox="-56 -56 112 112" aria-hidden="true">' +
    '<g class="tmm-ptr-wavy"><path fill="currentColor" transform="translate(-48.85 -55.44)" d="M47.9111 0.0643146C51.4024 -0.494625 54.9821 2.67306 54.9824 6.3231C54.9824 8.07941 54.5948 8.86501 52.7256 10.9022C50.3827 13.4467 49.9576 14.3543 49.9668 16.7919C49.979 19.1956 50.6297 20.3473 53.2715 22.6288C55.3424 24.4187 56.204 26.1294 56.2041 28.4598C56.2041 30.6897 55.7156 31.625 53.1191 34.368C50.7641 36.8605 49.8632 38.9957 50.2236 41.2469C50.2353 41.32 50.2521 41.3935 50.2676 41.4686C50.7197 44.9859 53.724 47.704 57.3643 47.704C58.3044 47.7039 59.2011 47.5198 60.0234 47.1903C62.4442 46.3914 63.9053 44.5405 64.9189 41.0145C65.8689 37.7156 66.8007 36.3622 68.8564 35.3114C70.4448 34.4958 72.8857 34.5022 75.6348 35.3299C78.2829 36.1271 79.7947 36.1452 81.4258 35.4061C83.1699 34.6119 84.4684 32.9077 85.0977 30.5741C85.8369 27.8433 86.995 26.1361 88.6445 25.3358C92.4628 23.4909 96.7147 25.7418 97.5303 30.0458C97.9456 32.2237 96.5215 35.0521 94.417 36.2342C92.9906 37.0374 91.5607 37.0744 88.1123 36.3963C85.7117 35.926 85.4645 35.9262 84.1816 36.4149C81.4754 37.4504 80.4092 38.8764 79.5479 42.621C78.9431 45.2477 77.8739 47.087 76.3682 48.0829C74.4102 49.378 73.2705 49.494 69.5166 48.7762C68.9606 48.6708 68.4337 48.5821 67.9453 48.5106C67.367 48.3598 66.7603 48.2792 66.1348 48.2792C65.9593 48.2792 65.7855 48.2873 65.6133 48.2997C65.3433 48.2987 65.1151 48.3109 64.9346 48.3397C64.0678 48.4785 63.2138 48.8213 62.4434 49.3026C62.4185 49.3176 62.3947 49.3342 62.3701 49.3495C62.3509 49.3618 62.3316 49.3741 62.3125 49.3866C60.3094 50.655 58.9785 52.889 58.9785 55.4354C58.9786 57.333 59.7184 59.057 60.9238 60.3378C61.1749 60.6218 61.4461 60.8925 61.7334 61.1385C63.4104 62.5741 65.5976 63.0933 67.8701 62.5985C73.6401 61.3309 74.5841 61.3952 76.7559 63.1913C78.1731 64.3642 78.9736 65.8826 79.5967 68.5858C80.7849 73.7508 83.65 75.6352 88.5859 74.496C90.62 74.0287 93.0881 74.1021 94.2734 74.6639C96.5736 75.7544 98.0185 78.7878 97.4473 81.3231C96.8364 84.0203 94.0541 86.3909 91.5127 86.3788C89.8266 86.3696 87.9263 85.4563 86.8877 84.1551C86.4173 83.5656 85.6688 82.0468 85.2197 80.7792C84.1659 77.7951 83.2249 76.4386 81.6885 75.6903C80.0789 74.9025 78.0753 74.9179 75.3877 75.7333C71.4167 76.9398 67.934 76.0779 66.3486 73.4999C66.0065 72.9406 65.3683 71.3865 64.9316 70.0428C63.9366 66.9794 63.2615 65.7419 61.8672 64.7616C60.6373 63.7644 59.071 63.166 57.3643 63.1659C53.6131 63.1659 50.5371 66.0517 50.2334 69.7245C50.1337 70.5055 50.1831 71.3272 50.3789 72.2049C50.6844 73.5642 51.1124 74.2397 52.9971 76.326C55.7093 79.3254 56.204 80.2876 56.2041 82.5721C56.2041 84.753 55.1446 86.8427 53.2539 88.3944C52.5269 88.99 51.4907 90.1173 50.9531 90.8993C50.101 92.1362 49.9729 92.5764 49.9668 94.3172C49.9576 96.6907 50.2789 97.3598 52.7959 100.259C55.3279 103.176 55.682 104.944 54.2832 107.644C53.8158 108.546 51.8481 110.501 51.3838 110.528C51.2605 110.538 50.6136 110.647 49.9424 110.775C49.2704 110.904 48.2044 110.901 47.5752 110.766C44.6703 110.156 42.6631 107.687 42.6631 104.73C42.6631 102.687 42.9356 102.128 45.1104 99.7635C47.0955 97.6042 47.6513 96.416 47.6514 94.327C47.6514 92.1552 47.0986 91.1037 44.7588 88.828C41.7135 85.8682 40.922 83.9102 41.5635 80.9198C41.8506 79.582 42.2604 78.953 44.2549 76.7997C46.7565 74.1026 47.3457 72.8895 47.3457 70.4491C47.3457 69.9574 47.2414 69.3971 47.0645 68.8231C46.3475 65.6274 43.495 63.2391 40.083 63.2391C37.0118 63.2393 34.3931 65.1743 33.3779 67.8915C33.2315 68.2482 33.0991 68.6256 32.9834 69.0253C32.0457 72.26 31.5138 73.3839 30.4355 74.4286C28.4195 76.3805 25.8935 76.7654 22.1455 75.6932C16.7878 74.1599 13.9132 75.6447 12.3584 80.7489C11.4695 83.6629 10.5107 84.9979 8.71777 85.8104C5.48601 87.2797 1.68546 85.5871 0.469727 82.1415C-0.363965 79.7835 0.0763386 77.6791 1.77148 75.8954C3.48206 74.0962 5.10694 73.7146 8.24707 74.3622C14.2982 75.6145 16.7021 73.995 18.3516 67.5467C18.8677 65.537 19.2103 64.8317 20.1113 63.9276C22.393 61.6367 23.9508 61.3246 28.459 62.2469C32.0845 62.9891 33.3833 62.8461 35.5029 61.4657C35.6884 61.3455 35.8804 61.1857 36.0752 60.9999C37.6701 59.6871 38.6875 57.6981 38.6875 55.4715C38.6874 53.0343 37.4677 50.8829 35.6064 49.5907C34.433 48.7378 33.0301 48.2066 31.6885 48.2049C31.2242 48.2019 29.5742 48.4895 28.0225 48.8378C24.4885 49.6319 22.7383 49.3566 20.8018 47.701C19.2286 46.3509 18.8433 45.6177 18.0186 42.3768C17.2091 39.2063 16.5066 38.0238 14.8633 37.0799C12.9635 35.9865 11.8698 35.8647 9.24609 36.4481C6.04793 37.1598 3.98586 36.9579 2.5166 35.7879C1.17572 34.7188 0 32.5899 0 31.2215C3.33779e-05 28.8269 1.79561 26.0016 3.88477 25.1034C6.08093 24.1626 9.19404 24.9136 10.752 26.7645C11.1918 27.2868 11.855 28.6496 12.2246 29.7889C13.3182 33.149 14.182 34.405 15.9873 35.245C17.8873 36.1308 19.5066 36.1757 21.7334 35.409C24.4791 34.4653 25.7622 34.3556 27.6436 34.9022C30.1971 35.6444 31.4068 37.0497 32.54 40.5926C32.7618 41.2872 32.974 41.9003 33.1826 42.4442C33.4591 43.4523 33.9495 44.3713 34.6035 45.1493C34.9236 45.5559 35.2717 45.8896 35.6709 46.1796C36.8868 47.1334 38.4178 47.7039 40.083 47.704C42.0355 47.704 43.8043 46.9208 45.0957 45.6532C45.3235 45.4435 45.5423 45.192 45.751 44.9129C46.1968 44.3351 46.5578 43.6887 46.8115 42.9901C47.1388 42.1655 47.3398 41.3072 47.3398 40.5653C47.3429 38.1524 46.83 37.0372 44.6064 34.6395C41.5214 31.3132 40.931 29.7951 41.5693 26.8202C41.8717 25.4181 42.2329 24.8769 44.3223 22.702C47.0009 19.9103 47.6514 18.6914 47.6514 16.4647C47.6514 14.3939 47.3551 13.7555 45.3516 11.5106C43.1371 9.03045 42.6758 8.10758 42.6758 6.15904C42.6758 3.22662 44.994 0.531668 47.9111 0.0643146Z"/></g>' +
    '<g class="tmm-ptr-spokes"><path fill="currentColor" transform="translate(-55.34 -48.75)" d="M27.6709 0.826939C30.6197 -0.875323 34.3903 0.135029 36.0928 3.08378C37.6382 5.7609 36.9474 9.11485 34.6006 10.9842L55.3408 46.908L76.082 10.9842C73.735 9.11489 73.0434 5.76102 74.5889 3.08378C76.2914 0.135038 80.0629 -0.875514 83.0117 0.826939C85.9605 2.52953 86.9701 6.30095 85.2676 9.24979C83.7217 11.9265 80.4719 13.0047 77.6797 11.907L56.9395 47.8309H98.4199C98.8654 44.8637 101.425 42.5888 104.517 42.5887C107.921 42.5889 110.683 45.3489 110.683 48.7537C110.682 52.1585 107.921 54.9195 104.517 54.9197C101.425 54.9196 98.8654 52.6437 98.4199 49.6766H56.9395L77.6797 85.5994C80.4719 84.5017 83.7217 85.5809 85.2676 88.2576C86.9701 91.2065 85.9605 94.9779 83.0117 96.6805C80.0628 98.383 76.2914 97.3725 74.5889 94.4236C73.0433 91.7464 73.734 88.3916 76.0811 86.5223L55.3408 50.5984L34.6006 86.5223C36.9475 88.3916 37.6383 91.7465 36.0928 94.4236C34.3904 97.3723 30.6197 98.3835 27.6709 96.6815C24.722 94.9789 23.7105 91.2065 25.4131 88.2576C26.9589 85.5805 30.2105 84.5014 33.0029 85.5994L53.7432 49.6766H12.2617C11.8163 52.6435 9.25699 54.9193 6.16602 54.9197C2.76104 54.9197 0.000197964 52.1586 0 48.7537C9.89535e-05 45.3487 2.76098 42.5887 6.16602 42.5887C9.25696 42.5891 11.8163 44.864 12.2617 47.8309H53.7422L33.002 11.907C30.2096 13.0049 26.9589 11.9268 25.4131 9.24979C23.7105 6.30089 24.722 2.52949 27.6709 0.826939Z"/></g>' +
  '</svg>';

(function(){
  const PULL = 64;                    // px of (damped) pull needed to refresh
  const RESIST = 0.5;                 // indicator moves at half finger speed
  let startY = null, pulled = 0, el = null, busy = false;
  const atTop = () => (tmmScroller()?.scrollTop || window.scrollY || document.scrollingElement?.scrollTop || 0) <= 0;
  function indicator(){
    if (el && el.isConnected) return el;
    const home = document.getElementById('tmmHome');
    if (!home) return null;
    el = home.querySelector('.tmm-ptr');     // left by an older build
    if (el) {
      if (!el.querySelector('.tmm-ptr-spokes')) el.innerHTML = TMM_PTR_MARK;
      return el;
    }
    el = document.createElement('div');
    el.className = 'tmm-ptr';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = TMM_PTR_MARK;
    home.prepend(el);
    return el;
  }
  function settle(h){
    if (!el) return;
    el.style.transition = '';
    el.style.height = h + 'px';
  }
  document.addEventListener('touchstart', e => {
    startY = (tmmLive() && !busy && !document.documentElement.classList.contains('tmm-panel-open') && tmmBootedEl && e.touches.length === 1 && atTop()) ? e.touches[0].clientY : null;
    pulled = 0;
  }, { passive:true });
  document.addEventListener('touchmove', e => {
    if (startY === null) return;
    pulled = Math.max(0, (e.touches[0].clientY - startY) * RESIST);
    const box = indicator();
    if (!box) return;
    box.style.transition = 'none';
    box.style.height = Math.min(pulled, PULL * 1.25) + 'px';
    // 240 = four sixths: at the threshold the mark is back in its logo pose,
    // so the loading ticks start from it without a jump.
    box.style.setProperty('--tmm-ptr-turn', Math.min(pulled / PULL, 1) * 240 + 'deg');
    box.classList.toggle('is-ready', pulled >= PULL);
  }, { passive:true });
  document.addEventListener('touchend', () => {
    if (startY === null) return;
    startY = null;
    if (!el) return;
    if (pulled < PULL) { settle(0); el.classList.remove('is-ready'); return; }
    busy = true;
    el.classList.add('is-loading');
    settle(48);
    /* Hold the mark for whole animation cycles (CYCLE matches the 1.6s
       tmm-ptr-* keyframes in home.css): at least one, and if loading runs
       longer, until the cycle in progress ends. Each cycle ends back on the
       logo pose, so it never vanishes mid-tick. */
    const CYCLE = 1600, t0 = performance.now();
    tmmRefresh().catch(()=>{}).then(() => {
      const spent = performance.now() - t0;
      return new Promise(r => setTimeout(r, Math.max(1, Math.ceil(spent / CYCLE)) * CYCLE - spent));
    }).finally(() => {
      busy = false;
      settle(0);
      el.classList.remove('is-ready', 'is-loading');
    });
  }, { passive:true });
})();

})();
