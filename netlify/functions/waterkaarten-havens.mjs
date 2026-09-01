const BASE='https://vindeenjachthaven.nl';
const PROVINCES=['utrecht','noord-holland','zuid-holland','noord-brabant','friesland','groningen','overijssel','drenthe','gelderland','flevoland','zeeland','limburg'];
const CACHE_TTL=10*60*1000;
const cache=globalThis.__msWaterkaartenHavenCache||(globalThis.__msWaterkaartenHavenCache=new Map());

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'public, max-age=120, stale-while-revalidate=600',
      'x-content-type-options':'nosniff',
      ...headers
    }
  });
}

function decodeHtml(value=''){
  return String(value)
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)||32))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)||32));
}

function stripHtml(value=''){
  return decodeHtml(String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h\d>/gi,'\n')
    .replace(/<[^>]+>/g,' '))
    .replace(/[ \t]+/g,' ')
    .replace(/\n\s+/g,'\n')
    .replace(/\n{2,}/g,'\n')
    .trim();
}

function absUrl(href=''){
  try{return new URL(href,BASE).toString()}catch{return ''}
}

function validDetailUrl(raw=''){
  try{
    const url=new URL(raw,BASE);
    if(url.origin!==BASE)return null;
    if(!/^\/nl\/[a-z0-9-]+\/[a-z0-9%()'._-]+\/[a-z0-9%()'._-]+\/\d+\/?$/i.test(url.pathname))return null;
    return url;
  }catch{return null}
}

async function upstream(url,ttl=CACHE_TTL){
  const now=Date.now();
  const hit=cache.get(url);
  if(hit&&now-hit.at<ttl)return hit.text;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  try{
    const response=await fetch(url,{
      signal:controller.signal,
      headers:{
        accept:'text/html,application/xhtml+xml',
        'accept-language':'nl-NL,nl;q=0.9,en;q=0.7',
        'user-agent':'MijnSerenity/8.22 (+persoonlijke havengids; publieke bron)'
      },
      redirect:'follow'
    });
    if(!response.ok)throw Object.assign(new Error(`Havenbron gaf ${response.status}`),{status:response.status});
    const text=await response.text();
    cache.set(url,{at:now,text});
    while(cache.size>120){cache.delete(cache.keys().next().value)}
    return text;
  }finally{
    clearTimeout(timer);
  }
}

function parseProvincePage(html,province){
  const found=[];
  const seen=new Set();
  const anchor=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while((match=anchor.exec(html))){
    const href=decodeHtml(match[1]);
    let url;
    try{url=new URL(href,BASE)}catch{continue}
    const m=url.pathname.match(/^\/nl\/([^/]+)\/([^/]+)\/([^/]+)\/(\d+)\/?$/i);
    if(!m||m[1].toLowerCase()!==province||seen.has(url.pathname))continue;
    const label=stripHtml(match[2]);
    if(!label||label.length<3)continue;
    seen.add(url.pathname);
    const normalized=label.replace(/\s+/g,' ').trim();
    const ratingMatch=normalized.match(/(?:^|\s)([1-5](?:[.,]\d)?)\s*$/);
    const noReviews=/geen reviews/i.test(normalized);
    const rating=ratingMatch&&!noReviews?Number(ratingMatch[1].replace(',','.')):null;
    const priceMatch=normalized.match(/(?:^|\s)(\d+[.,]\d{2})(?=\s|$)/);
    const name=(normalized
      .replace(/\s+Geen faciliteiten bekend.*$/i,'')
      .replace(/\s+Geen reviews.*$/i,'')
      .replace(/\s+\d+[.,]\d{2}\s+[1-5](?:[.,]\d)?\s*$/,'')
      .replace(/\s+[1-5](?:[.,]\d)?\s*$/,'')
      .trim())||m[3].replace(/-/g,' ');
    found.push({
      id:m[4],
      name,
      city:decodeURIComponent(m[2]).replace(/-/g,' '),
      province,
      rating,
      pricePerMeter:priceMatch?Number(priceMatch[1].replace(',','.')):null,
      hasReviews:!noReviews,
      label:normalized,
      url:url.toString(),
      path:url.pathname
    });
  }
  let totalPages=1;
  for(const m of html.matchAll(new RegExp(`/nl/${province}/(?:page/)?(\\d+)`, 'gi'))){
    totalPages=Math.max(totalPages,Number(m[1])||1);
  }
  for(const m of html.matchAll(/[?&](?:page|paged)=(\d+)/gi)){
    totalPages=Math.max(totalPages,Number(m[1])||1);
  }
  return {items:found,totalPages};
}

function parseTables(html){
  const info={};
  const row=/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while((match=row.exec(html))){
    const cells=[...match[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(x=>stripHtml(x[1]));
    if(cells.length>=2&&cells[0]&&cells[1]&&cells[0].length<90){
      info[cells[0]]=cells.slice(1).join(' · ');
    }
  }
  return info;
}

function parseJsonLd(html){
  const objects=[];
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{
      const parsed=JSON.parse(decodeHtml(m[1]).trim());
      if(Array.isArray(parsed))objects.push(...parsed); else objects.push(parsed);
    }catch{}
  }
  return objects;
}

function flattenJsonLd(objects){
  const all=[];
  const walk=value=>{
    if(!value)return;
    if(Array.isArray(value)){value.forEach(walk);return}
    if(typeof value!=='object')return;
    all.push(value);
    if(value['@graph'])walk(value['@graph']);
  };
  objects.forEach(walk);
  return all;
}

function parseDetail(html,url){
  const text=stripHtml(html);
  const info=parseTables(html);
  const jsonLd=flattenJsonLd(parseJsonLd(html));
  const entity=jsonLd.find(x=>/Marina|LocalBusiness|Place/i.test(String(x['@type']||'')))||{};
  const agg=entity.aggregateRating||jsonLd.find(x=>x.aggregateRating)?.aggregateRating||{};
  const titleMatch=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)||html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const name=stripHtml(titleMatch?.[1]||entity.name||info.Naam||'Jachthaven').replace(/\s*[•|-]\s*Vind een Jachthaven.*$/i,'').trim();
  const rating=Number(String(agg.ratingValue||'').replace(',','.'))||(()=>{
    const m=text.match(/(?:^|\n)\s*([1-5](?:[.,]\d)?)\s*\n(?:.*\n){0,3}?\s*(\d+)\s+reviews?/i);
    return m?Number(m[1].replace(',','.')):null;
  })();
  const reviewCount=Number(agg.reviewCount||agg.ratingCount)||(()=>{
    const m=text.match(/(\d+)\s+reviews?/i);return m?Number(m[1]):0;
  })();

  const reviews=[];
  const reviewObjects=[];
  for(const x of jsonLd){
    if(Array.isArray(x.review))reviewObjects.push(...x.review);
    else if(x.review)reviewObjects.push(x.review);
    if(/Review/i.test(String(x['@type']||'')))reviewObjects.push(x);
  }
  const seen=new Set();
  for(const r of reviewObjects){
    if(!r||typeof r!=='object')continue;
    const body=stripHtml(r.reviewBody||r.description||'');
    if(!body||seen.has(body))continue;
    seen.add(body);
    reviews.push({
      author:stripHtml(r.author?.name||r.author||''),
      body,
      rating:Number(String(r.reviewRating?.ratingValue||r.ratingValue||'').replace(',','.'))||null,
      date:r.datePublished||''
    });
  }

  if(!reviews.length){
    const marker=text.toLowerCase().indexOf('rate & review');
    if(marker>=0){
      const tail=text.slice(Math.max(0,marker-1500),marker+15000);
      const lines=tail.split('\n').map(x=>x.trim()).filter(Boolean);
      for(let i=0;i<lines.length;i++){
        const author=lines[i].match(/^(.{1,70}),\s*(\d+\s+(?:dagen?|maanden?|jaren?)\s+geleden)$/i);
        if(!author||i===0)continue;
        const body=lines[i-1];
        if(body.length<12||seen.has(body))continue;
        seen.add(body);
        reviews.push({author:author[1],date:author[2],body,rating:null});
        if(reviews.length>=25)break;
      }
    }
  }

  const facilities=[];
  for(const [key,value] of Object.entries(info)){
    if(/^(Naam|Website|Telefoon|E-mail|Adres|Postcode|Woonplaats|Provincie|Land|Ligging|Havenmeester|Toelichting|Plaatsen tarief nacht)/i.test(key))continue;
    if(/✔|ja|aanwezig/i.test(value))facilities.push(key);
  }

  let coordinates=null;
  const geo=entity.geo||jsonLd.find(x=>x.geo)?.geo;
  if(geo&&Number.isFinite(Number(geo.latitude))&&Number.isFinite(Number(geo.longitude))){
    coordinates={lat:Number(geo.latitude),lon:Number(geo.longitude)};
  }else{
    const lat=html.match(/(?:latitude|lat)["'\s:=]+(-?\d{1,2}\.\d{3,})/i);
    const lon=html.match(/(?:longitude|lng|lon)["'\s:=]+(-?\d{1,3}\.\d{3,})/i);
    if(lat&&lon)coordinates={lat:Number(lat[1]),lon:Number(lon[1])};
  }

  return {
    name,
    url:url.toString(),
    source:'Waterkaarten / Vind een Jachthaven',
    rating:rating||null,
    reviewCount,
    info,
    facilities,
    reviews:reviews.slice(0,25),
    coordinates
  };
}

function provincePageUrl(province,page){
  if(page<=1)return `${BASE}/nl/${province}/`;
  return `${BASE}/nl/${province}/page/${page}/`;
}

export default async request=>{
  if(request.method!=='GET')return json({error:{code:'method_not_allowed',message:'Alleen GET wordt ondersteund.'}},405,{allow:'GET'});
  const u=new URL(request.url);
  const mode=String(u.searchParams.get('mode')||'province').toLowerCase();
  try{
    if(mode==='status'){
      return json({ok:true,provider:'Waterkaarten / Vind een Jachthaven',publicSource:true,provinces:PROVINCES});
    }
    if(mode==='province'){
      const province=String(u.searchParams.get('province')||'overijssel').toLowerCase();
      if(!PROVINCES.includes(province))return json({error:{code:'invalid_province',message:'Onbekende provincie.'}},400);
      const page=Math.max(1,Math.min(99,Number(u.searchParams.get('page')||1)||1));
      let html;
      try{
        html=await upstream(provincePageUrl(province,page));
      }catch(error){
        if(page>1){
          html=await upstream(`${BASE}/nl/${province}/?page=${page}`);
        }else throw error;
      }
      const parsed=parseProvincePage(html,province);
      const q=String(u.searchParams.get('q')||'').trim().toLowerCase();
      const items=q?parsed.items.filter(item=>`${item.name} ${item.city} ${item.label}`.toLowerCase().includes(q)):parsed.items;
      return json({provider:'Waterkaarten / Vind een Jachthaven',province,page,totalPages:parsed.totalPages,items,fetchedAt:new Date().toISOString()});
    }
    if(mode==='detail'){
      const target=validDetailUrl(u.searchParams.get('url')||'');
      if(!target)return json({error:{code:'invalid_url',message:'Ongeldige havenlink.'}},400);
      const html=await upstream(target.toString(),5*60*1000);
      return json({provider:'Waterkaarten / Vind een Jachthaven',harbor:parseDetail(html,target),fetchedAt:new Date().toISOString()});
    }
    return json({error:{code:'invalid_mode',message:'Onbekende havenopdracht.'}},400);
  }catch(error){
    return json({error:{code:'waterkaarten_source_error',message:error?.message||'Havenbron kon niet worden gelezen.'}},Number(error?.status)||502);
  }
};
