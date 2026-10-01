const TEMEL=[
  {k:"anatomi",n:"Anatomi",s:13},{k:"histoloji",n:"Histoloji-Embriyoloji",s:7},{k:"fizyoloji",n:"Fizyoloji",s:8},
  {k:"biyokimya",n:"Biyokimya",s:18},{k:"mikrobiyoloji",n:"Mikrobiyoloji",s:18},{k:"patoloji",n:"Patoloji",s:18},
  {k:"farmakoloji",n:"Farmakoloji",s:18}];
const KLINIK=[
  {k:"dahiliye",n:"Dahiliye",s:23},{k:"pediatri",n:"Pediatri",s:25},{k:"cerrahi",n:"Genel Cerrahi",s:20},
  {k:"kadindogum",n:"Kadın Doğum",s:10},{k:"kucukstaj",n:"Küçük Stajlar",s:22}];
const ALL=[...TEMEL.map(x=>({...x,b:"t"})),...KLINIK.map(x=>({...x,b:"k"}))];
const COLORS=["#c1323d","#2c5c8c","#2b7a4b","#a86b12","#7a4aa8","#1f8a8a"];
const WINDOW=5;

const KEY="tus-deneme-defteri-v1";
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
let kisiler=[], denemeler=[], aktif=null, demo=false, formOpen=false, editing=null, busy=false, confirmDel=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>(Math.round(n*100)/100).toLocaleString("tr-TR",{maximumFractionDigits:2});
const fdate=s=>{if(!s)return"";const[y,m,d]=s.split("-");return`${d}.${m}.${y}`};
const sdate=s=>{if(!s)return"";const[y,m,d]=s.split("-");return`${d}.${m}`};
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function store(k,v){try{v===undefined?localStorage.getItem(k):localStorage.setItem(k,v)}catch(e){}}
function load(k){try{return localStorage.getItem(k)}catch(e){return null}}
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3200)}

/* ---------- hesaplar ---------- */
const net=r=>r?(r.d||0)-(r.y||0)/4:0;
function branchNet(dn,b){let n=0,any=false;for(const s of ALL){if(s.b!==b)continue;const r=dn.r?.[s.k];if(r&&(r.d||r.y)){any=true}n+=net(r)}return any?n:null}
function tot(dn){const t=branchNet(dn,"t"),k=branchNet(dn,"k");return{t,k,all:(t??0)+(k??0)}}
function listFor(id){return denemeler.filter(d=>d.kisi===id).sort((a,b)=>(a.tarih||"").localeCompare(b.tarih||"")||(a.at||0)-(b.at||0))}

/* ---------- örnek veri (sadece ekranda, kaydedilmez) ---------- */
function demoData(){
  let seed=7;const rnd=()=>(seed=(seed*9301+49297)%233280)/233280;
  const ks=[{id:"demo1",ad:"Örnek: Zeynep",renk:0},{id:"demo2",ad:"Örnek: Emre",renk:1}];
  const ds=[];const base={demo1:.55,demo2:.48};const weak={demo1:"mikrobiyoloji",demo2:"pediatri"};
  for(const k of ks){for(let i=0;i<7;i++){
    const r={};for(const s of ALL){let p=base[k.id]+i*.025+(rnd()-.5)*.18;if(s.k===weak[k.id])p-=.2;p=Math.max(.1,Math.min(.95,p));
      const d=Math.round(s.s*p),y=Math.min(s.s-d,Math.round((s.s-d)*(.5+rnd()*.3)));r[s.k]={s:s.s,d,y}}
    const dt=new Date(2026,6,5+i*12);
    ds.push({id:k.id+"-"+i,kisi:k.id,tarih:dt.toISOString().slice(0,10),ad:["Kurum A","Kurum B"][i%2]+" Deneme "+(i+1),r,at:i})}}
  return{ks,ds}
}

/* ---------- çizim ---------- */
function renderPeople(){
  const el=$("#people");const list=demo?demoData().ks:kisiler;
  let h=list.map(k=>`<button class="chip" data-act="sec" data-id="${esc(k.id)}" aria-pressed="${k.id===aktif}"><span class="dot" style="background:${COLORS[k.renk%COLORS.length]}"></span>${esc(k.ad)}</button>`).join("");
  if(!demo){h+=`<form class="addp" data-form="kisi"><input id="yeniKisi" maxlength="30" placeholder="Yeni kişi adı" aria-label="Yeni kişi adı"><button class="btn small" type="submit">Ekle</button></form>`}
  el.innerHTML=h;
}
function renderNotice(){
  const n=$("#notice");
  if(demo){n.innerHTML=`<div class="notice demo"><span><span class="pill warn">Örnek</span> Bunlar uydurma örnek veriler, hiçbir yere kaydedilmez.</span><button class="btn small" data-act="demo-kapat">Örnekten çık</button></div>`;return}
  n.innerHTML="";
}
function chart(list){
  const W=window.innerWidth<600?380:640,H=window.innerWidth<600?250:240,L=30,R=38,T=14,B=30,iw=W-L-R,ih=H-T-B;
  const pts=list.map(d=>tot(d));const n=list.length;
  const x=i=>n===1?L+iw/2:L+i*iw/(n-1);const y=v=>T+ih-(v/100)*ih;
  let g="";for(const v of[0,25,50,75,100]){g+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)" stroke-width="1"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${v}</text>`}
  const step=Math.ceil(n/(W<600?5:8));
  list.forEach((d,i)=>{if(i===n-1||(i%step===0&&n-1-i>=step/2))g+=`<text x="${x(i)}" y="${H-10}" text-anchor="middle">${sdate(d.tarih)}</text>`});
  const line=(key,col)=>{const ps=pts.map((p,i)=>p[key]==null?null:[x(i),y(p[key])]).filter(Boolean);if(!ps.length)return"";
    let s="";if(ps.length>1){s+=`<path d="M${ps.map(p=>p.join(",")).join(" L")} L${ps[ps.length-1][0]},${y(0)} L${ps[0][0]},${y(0)} Z" fill="${col}" opacity=".07"/>`;
      s+=`<polyline points="${ps.map(p=>p.join(",")).join(" ")}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`}
    ps.forEach((p,i)=>{const last=i===ps.length-1;s+=`<circle cx="${p[0]}" cy="${p[1]}" r="${last?5:3}" fill="${last?col:"var(--card)"}" stroke="${col}" stroke-width="2"/>`});
    const lp=ps[ps.length-1];const lv=pts.filter(p=>p[key]!=null).pop()[key];
    s+=`<text x="${lp[0]+8}" y="${lp[1]+4}" style="fill:${col};font-weight:600">${fmt(lv)}</text>`;return s};
  return`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Temel ve Klinik net gelişimi">${g}${line("t","var(--accent)")}${line("k","var(--klinik)")}</svg>`;
}
function subjectStats(list){
  const win=list.slice(-WINDOW);const out={};
  for(const s of ALL){let nn=0,ss=0,c=0,last=null;for(const d of win){const r=d.r?.[s.k];if(r&&(r.d||r.y)){nn+=net(r);ss+=r.s||s.s;c++;last=net(r)/(r.s||s.s)}}
    out[s.k]={ratio:ss?nn/ss:null,avgNet:c?nn/c:null,c,last}}
  return out;
}
function barColor(r){return r<.4?"var(--bad)":r<.6?"var(--warn)":"var(--good)"}
function renderMain(){
  const m=$("#main");
  const data=demo?demoData():{ks:kisiler,ds:denemeler};
  const ks=data.ks;
  if(!ks.length){
    m.innerHTML=`<div class="empty"><h2>Henüz kimse eklenmemiş</h2>
      <p class="muted">Yukarıdan ilk kişiyi ekle (örneğin “Abim” ya da “Ablam”). Sonra her denemeden sonra doğru ve yanlış sayılarını ders ders gir; netler, gelişim grafiği ve en zayıf dersler kendiliğinden çıkar.</p>
      <button class="btn" data-act="demo-ac">Örnek verilerle nasıl göründüğüne bak</button></div>`;return}
  if(!ks.find(k=>k.id===aktif))aktif=ks[0].id;
  const kisi=ks.find(k=>k.id===aktif);
  const all=demo?data.ds:denemeler;
  const list=all.filter(d=>d.kisi===aktif).sort((a,b)=>(a.tarih||"").localeCompare(b.tarih||"")||(a.at||0)-(b.at||0));
  const can=!demo;
  let h="";
  const addBtn=can?`<button class="btn primary" data-act="yeni">+ Yeni deneme gir</button>`:"";
  h+=`<div class="panel-h"><h2>${esc(kisi.ad)} <span class="muted" style="font-weight:500">· ${list.length} deneme</span></h2>${formOpen?"":addBtn}</div>`;
  if(!list.length){
    h+=`<div class="empty"><h2>${esc(kisi.ad)} için ilk denemeyi gir</h2><p class="muted">Deneme bittikten sonra her dersin doğru ve yanlış sayısını yazman yeterli. Boşları ve netleri uygulama hesaplar.</p>${addBtn}</div>`;
  }else{
    const L=list[list.length-1],P=list[list.length-2];const lt=tot(L),pt=P?tot(P):null;
    const dl=(a,b)=>{if(a==null||b==null)return"";const d=a-b;if(Math.abs(d)<.005)return`<span class="delta">öncekiyle aynı</span>`;return`<span class="delta ${d>0?"up":"down"}">${d>0?"▲ +":"▼ "}${fmt(d)} öncekine göre</span>`};
    const avg=list.slice(-WINDOW).reduce((a,d)=>a+tot(d).all,0)/Math.min(WINDOW,list.length);
    h+=`<section class="tiles">
      <div class="tile"><span class="label">Son toplam net</span><span class="big">${fmt(lt.all)}<span class="of"> /200</span></span>${dl(lt.all,pt?.all)}</div>
      <div class="tile"><span class="label">Temel net</span><span class="big" style="color:var(--accent)">${lt.t==null?"–":fmt(lt.t)}<span class="of"> /100</span></span>${dl(lt.t,pt?.t)}</div>
      <div class="tile"><span class="label">Klinik net</span><span class="big" style="color:var(--klinik)">${lt.k==null?"–":fmt(lt.k)}<span class="of"> /100</span></span>${dl(lt.k,pt?.k)}</div>
      <div class="tile"><span class="label">Son ${Math.min(WINDOW,list.length)} deneme ort.</span><span class="big">${fmt(avg)}</span><span class="delta muted">toplam net</span></div>
    </section>`;
    const st=subjectStats(list);
    const ranked=ALL.filter(s=>st[s.k].ratio!=null).sort((a,b)=>st[a.k].ratio-st[b.k].ratio);
    const weak=ranked.slice(0,3).map(s=>s.k);
    const rows=arr=>arr.map(s=>{const x=st[s.k];if(x.ratio==null)return`<div class="srow"><span class="nm">${s.n}</span><div class="bar"></div><span class="pct muted">–</span></div>`;
      const p=Math.max(0,x.ratio);return`<div class="srow ${weak.includes(s.k)?"weak":""}" title="Ortalama net ${fmt(x.avgNet)} / ${s.s} soru"><span class="nm">${s.n}</span><div class="bar"><span style="width:${Math.min(100,p*100)}%;background:${barColor(p)}"></span></div><span class="pct">%${Math.round(p*100)}</span></div>`}).join("");
    h+=`<section class="grid2">
      <div class="panel chart"><div class="panel-h"><h2>Net gelişimi</h2><div class="legend"><span><i style="background:var(--accent)"></i>Temel</span><span><i style="background:var(--klinik)"></i>Klinik</span></div></div>${chart(list)}</div>
      <div class="panel"><div class="panel-h"><h2>Ders ders başarı</h2><span class="hint">son ${Math.min(WINDOW,list.length)} deneme, net ÷ soru</span></div>
        ${ranked.length?`<div class="focus">Öncelik: <b>${ranked.slice(0,3).map(s=>s.n).join(", ")}</b>. Bu derslerde net oranı en düşük.</div>`:""}
        <div class="subj"><h3>Temel Tıp</h3>${rows(TEMEL)}<h3>Klinik Tıp</h3>${rows(KLINIK)}</div></div>
    </section>`;
    const best=Math.max(...list.map(d=>tot(d).all));
    h+=`<section class="panel"><div class="panel-h"><h2>Denemeler</h2><span class="hint">en yüksek toplam yeşil</span></div><div class="tablewrap"><table>
      <thead><tr><th>Tarih</th><th>Deneme</th><th class="n">Temel</th><th class="n">Klinik</th><th class="n">Toplam</th>${can?"<th></th>":""}</tr></thead><tbody>
      ${[...list].reverse().map(d=>{const t=tot(d);const act=can?(confirmDel===d.id?`<td class="act"><span class="hint">Silinsin mi?</span> <button class="btn small" data-act="sil-evet" data-id="${esc(d.id)}">Sil</button> <button class="btn small ghost" data-act="sil-vazgec">Vazgeç</button></td>`:`<td class="act"><button class="btn small ghost" data-act="duzenle" data-id="${esc(d.id)}">Düzenle</button><button class="btn small ghost" data-act="sil" data-id="${esc(d.id)}">Sil</button></td>`):"";
        return`<tr class="${t.all===best?"best":""}"><td class="num">${fdate(d.tarih)}</td><td>${esc(d.ad||"–")}</td><td class="n">${t.t==null?"–":fmt(t.t)}</td><td class="n">${t.k==null?"–":fmt(t.k)}</td><td class="n tot">${fmt(t.all)}</td>${act}</tr>`}).join("")}
      </tbody></table></div></section>`;
  }
  if(ks.length>1){
    const rowsC=ks.map(k=>{const l=all.filter(d=>d.kisi===k.id);const s=[...l].sort((a,b)=>(a.tarih||"").localeCompare(b.tarih||"")).slice(-WINDOW);
      const a=s.length?s.reduce((x,d)=>x+tot(d).all,0)/s.length:null;const b=l.length?Math.max(...l.map(d=>tot(d).all)):null;return{k,n:l.length,a,b}});
    const top=Math.max(...rowsC.map(r=>r.a??-1));
    h+=`<section class="panel compare"><div class="panel-h"><h2>Kardeş tablosu</h2><span class="hint">son ${WINDOW} deneme ortalaması</span></div><div class="tablewrap"><table>
      <thead><tr><th>Kişi</th><th class="n">Deneme</th><th class="n">Ort. toplam</th><th class="n">En iyi</th></tr></thead><tbody>
      ${rowsC.map(r=>`<tr><td><span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${COLORS[r.k.renk%COLORS.length]};margin-right:8px"></span>${esc(r.k.ad)}</td><td class="n">${r.n}</td><td class="n ${r.a!=null&&r.a===top?"lead":""}">${r.a==null?"–":fmt(r.a)}</td><td class="n">${r.b==null?"–":fmt(r.b)}</td></tr>`).join("")}
      </tbody></table></div></section>`;
  }
  if(can&&kisi&&!formOpen){
    h+=confirmDel==="kisi:"+kisi.id
      ?`<div class="notice"><span>${esc(kisi.ad)} ve tüm denemeleri silinsin mi? Bu geri alınamaz.</span><span><button class="btn small" data-act="kisi-sil-evet">Evet, sil</button> <button class="btn small ghost" data-act="sil-vazgec">Vazgeç</button></span></div>`
      :`<div style="text-align:right"><button class="btn small ghost" data-act="kisi-sil">${esc(kisi.ad)} kişisini sil</button></div>`;
  }
  if(!demo)h+=`<section class="panel"><div class="panel-h"><h2>Yedek</h2><span class="hint">Veriler bu tarayıcıda saklanır</span></div>
    <div class="frow"><button class="btn" data-act="yedek-al">Yedek dosyası indir</button><label class="btn" for="yedekDosya" style="display:inline-block">Yedekten geri yükle</label><input type="file" id="yedekDosya" accept="application/json,.json" hidden></div></section>`;
  m.innerHTML=h;
}
function render(){renderPeople();renderNotice();renderMain()}

/* ---------- form ---------- */
function openForm(d){
  formOpen=true;editing=d?d.id:null;
  const r=d?.r||{};
  const sheet=(arr,cls,title)=>`<div class="sheet ${cls}"><div class="sheet-h"><span>${title}</span><span>${arr.reduce((a,s)=>a+s.s,0)} soru</span></div>
    <div class="qhead"><span>Ders</span><span>Soru</span><span>Doğru</span><span>Yanlış</span><span style="text-align:right">Net</span></div>
    ${arr.map(s=>{const v=r[s.k]||{};return`<div class="qrow" data-k="${s.k}"><span class="nm" title="${s.n}">${s.n}</span>
      <input class="s" id="s-${s.k}" inputmode="numeric" value="${v.s??s.s}" aria-label="${s.n} soru sayısı">
      <input class="d" id="d-${s.k}" inputmode="numeric" value="${v.d??""}" aria-label="${s.n} doğru">
      <input class="y" id="y-${s.k}" inputmode="numeric" value="${v.y??""}" aria-label="${s.n} yanlış">
      <span class="net">–</span></div>`}).join("")}
    <div class="sheet-f"><span>Toplam net</span><span class="num" id="sum-${cls}">–</span></div></div>`;
  $("#formWrap").innerHTML=`<form class="form" data-form="deneme">
    <div class="panel-h"><h2>${d?"Denemeyi düzenle":"Yeni deneme"} · ${esc((kisiler.find(k=>k.id===aktif)||{}).ad||"")}</h2><span class="hint">Boş bıraktığın dersler hesaba katılmaz</span></div>
    <div class="frow"><label class="field"><span class="label">Tarih</span><input type="date" id="f-tarih" value="${d?.tarih||today()}" required></label>
      <label class="field" style="flex:2 1 16rem"><span class="label">Deneme adı</span><input id="f-ad" maxlength="60" placeholder="Örn. Kurum adı, 12. deneme" value="${esc(d?.ad||"")}"></label></div>
    <div class="sheets">${sheet(TEMEL,"t","Temel Tıp Bilimleri")}${sheet(KLINIK,"k","Klinik Tıp Bilimleri")}</div>
    <div class="form-f"><span class="hint" id="f-msg">Net = Doğru − Yanlış ÷ 4</span><span><button type="button" class="btn ghost" data-act="iptal">Vazgeç</button> <button type="submit" class="btn primary" id="f-kaydet">Kaydet</button></span></div>
  </form>`;
  calcForm();renderMain();
  $("#formWrap").scrollIntoView({behavior:"smooth",block:"start"});
}
function closeForm(){formOpen=false;editing=null;$("#formWrap").innerHTML="";renderMain()}
const iv=el=>{const t=el.value.trim();if(t==="")return null;const n=Number(t);return Number.isInteger(n)&&n>=0?n:NaN};
function readForm(){
  const r={};let bad=0,any=0;const sums={t:0,k:0};
  for(const s of ALL){const row=document.querySelector(`.qrow[data-k="${s.k}"]`);const S=iv($("#s-"+s.k)),D=iv($("#d-"+s.k)),Y=iv($("#y-"+s.k));
    let err=false;if([S,D,Y].some(Number.isNaN)||S==null||S<1)err=true;else if((D||0)+(Y||0)>S)err=true;
    row.classList.toggle("err",err);const out=row.querySelector(".net");
    if(err){bad++;out.textContent="hata";continue}
    if(D==null&&Y==null){out.textContent="–";continue}
    any++;const n=(D||0)-(Y||0)/4;sums[s.b]+=n;out.textContent=fmt(n);r[s.k]={s:S,d:D||0,y:Y||0}}
  return{r,bad,any,sums};
}
function calcForm(){const f=readForm();$("#sum-t").textContent=fmt(f.sums.t);$("#sum-k").textContent=fmt(f.sums.k);
  const msg=$("#f-msg");msg.textContent=f.bad?"Kırmızı satırlarda doğru + yanlış, soru sayısını geçiyor ya da sayı geçersiz.":`Net = Doğru − Yanlış ÷ 4 · Toplam: ${fmt(f.sums.t+f.sums.k)}`;
  msg.style.color=f.bad?"var(--bad)":"";$("#f-kaydet").disabled=!!f.bad||!f.any||busy}
async function saveForm(){
  const f=readForm();if(f.bad||!f.any||busy||demo)return;busy=true;calcForm();
  const body={kisi:aktif,tarih:$("#f-tarih").value||today(),ad:$("#f-ad").value.trim(),r:f.r,at:Date.now()};
  if(editing){const i=denemeler.findIndex(d=>d.id===editing);if(i>=0)denemeler[i]={id:editing,...body}}
  else denemeler.push({id:uid(),...body});
  busy=false;if(!save())return;toast(editing?"Deneme güncellendi":"Deneme kaydedildi");closeForm();render()
}
/* ---------- kayıt (tarayıcı hafızası) ---------- */
function save(){try{localStorage.setItem(KEY,JSON.stringify({kisiler,denemeler}));return true}catch(e){toast("Kaydedilemedi: tarayıcı hafızasına erişilemiyor.");return false}}
function loadAll(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v){kisiler=v.kisiler||[];denemeler=v.denemeler||[]}}catch(e){}}
function exportJSON(){
  const blob=new Blob([JSON.stringify({kisiler,denemeler},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="tus-yedek-"+today()+".json";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function importJSON(file){
  const r=new FileReader();
  r.onload=()=>{try{const v=JSON.parse(r.result);if(!Array.isArray(v.kisiler)||!Array.isArray(v.denemeler))throw 0;
    kisiler=v.kisiler;denemeler=v.denemeler;aktif=kisiler[0]?.id||null;save();render();toast("Yedek yüklendi")}
    catch(e){toast("Bu dosya bir TUS Deneme Defteri yedeği değil.")}};
  r.readAsText(file);
}

/* ---------- olaylar ---------- */
document.addEventListener("click",async ev=>{
  const b=ev.target.closest("[data-act]");if(!b)return;const a=b.dataset.act,id=b.dataset.id;
  if(a==="sec"){aktif=id;confirmDel=null;if(!demo)store("aktif",id);if(formOpen)closeForm();render()}
  else if(a==="demo-ac"){demo=true;aktif="demo1";render()}
  else if(a==="demo-kapat"){demo=false;aktif=load("aktif");render()}
  else if(a==="yeni")openForm(null);
  else if(a==="iptal")closeForm();
  else if(a==="duzenle"){const d=denemeler.find(x=>x.id===id);if(d)openForm(d)}
  else if(a==="sil"){confirmDel=id;renderMain()}
  else if(a==="kisi-sil"){confirmDel="kisi:"+aktif;renderMain()}
  else if(a==="sil-vazgec"){confirmDel=null;renderMain()}
  else if(a==="sil-evet"){confirmDel=null;denemeler=denemeler.filter(d=>d.id!==id);save();render();toast("Deneme silindi")}
  else if(a==="kisi-sil-evet"){confirmDel=null;const k=aktif;denemeler=denemeler.filter(d=>d.kisi!==k);kisiler=kisiler.filter(x=>x.id!==k);aktif=null;save();render();toast("Kişi silindi")}
  else if(a==="yedek-al")exportJSON();
});
document.addEventListener("input",ev=>{if(ev.target.closest(".qrow"))calcForm()});
document.addEventListener("change",ev=>{if(ev.target.id==="yedekDosya"&&ev.target.files[0]){importJSON(ev.target.files[0]);ev.target.value=""}});
document.addEventListener("submit",async ev=>{
  ev.preventDefault();const f=ev.target.dataset.form;
  if(f==="deneme")saveForm();
  else if(f==="kisi"){const inp=$("#yeniKisi");const ad=inp.value.trim();if(!ad||busy)return;busy=true;
    const id=uid();kisiler.push({id,ad,renk:kisiler.length,at:Date.now()});aktif=id;store("aktif",id);busy=false;save();render();toast(ad+" eklendi")}
});

/* ---------- başlat ---------- */
loadAll();
aktif=load("aktif");
render();

/* ---------- telefona yükleme (PWA) ---------- */
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
let yuklemeIstegi=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();yuklemeIstegi=e;$("#yukleBtn").hidden=false});
$("#yukleBtn").addEventListener("click",async()=>{if(!yuklemeIstegi)return;yuklemeIstegi.prompt();await yuklemeIstegi.userChoice;yuklemeIstegi=null;$("#yukleBtn").hidden=true});
window.addEventListener("appinstalled",()=>{$("#yukleBtn").hidden=true;toast("Uygulama yüklendi")});
