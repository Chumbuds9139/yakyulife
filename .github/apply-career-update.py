from pathlib import Path
import re


def replace(path, pattern, repl, flags=re.S):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    ns, n = re.subn(pattern, repl, s, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f'pattern not found in {path}: {pattern[:100]!r}')
    p.write_text(ns, encoding='utf-8', newline='')

# CSS: remove the community and sponsor selectors without depending on comment whitespace.
replace('css/style.css', r'/\* community link:.*?#community a:focus-visible\{[^}]*\}\s*', '')
replace('css/style.css', r'/\* ---------- 贊助入口 ----------.*?a\.btn#md-sponsor small\{[^}]*\}\s*', 'a.btn{text-decoration:none;color:var(--text)}\n')

replace('index.html', r'\s*<!-- 贊助入口：.*?</a>\s*', '\n')
replace('index.html', r'\s*<div id="community">.*?</div>\s*', '\n')
replace('index.html', r'<div class="start-meta">Produced by .*?</div>', '<div class="start-meta"><span id="ver-badge">v1.5.11</span></div>')

replace('src/config.js', r'/\* 贊助頁：.*?export const SPONSOR_URL=.*?;\s*', '')

replace('src/engine/contract.js', r"import \{LV, PATHS, CPBL_TEAMS, NPB_TEAMS, MLB_TEAMS\} from '../data/teams\.js\?v=1\.5\.11';", "import {LV, PATHS, CPBL_TEAMS, NPB_TEAMS, MLB_TEAMS, CORPORATE_TEAMS, INDEP_TEAMS} from '../data/teams.js?v=1.5.11';", re.M)
replace('src/engine/contract.js', r'/\* 引退時若沒回中職,補一場大巨蛋開球告別 \*/.*?\n\}', '''/* 引退時若曾經打過中職、但退休當下人不在中職，補一場台北大巨蛋開球告別；
   從沒踏進中職的生涯（例如純日職／純美職）就不套用這段彩蛋。 */
export function daibaFarewell(cont){
  if(S.stage==='PRO'&&S.org!=='CPBL'&&S.lastCpblTeam&&!S._daiba){ S._daiba=true;
    card('gold','最後一球',`雖然沒能在 <b class="hl">${S.lastCpblTeam}</b> 完成告別賽，台北大巨蛋還是邀你回去，當一日中職球員開球。四萬人的注視下，你投出了生涯的最後一球——不為勝負，只為那個曾經在紅土上作夢的自己。`);
  }
  cont();
}''')
replace('src/engine/contract.js', r"        if\(o>=LV\.NPB1\.min&&chance\(Math\.round\(60\*ageGateJP\(\)\)\)\)alts\.push\(\{t:'跳槽日職一軍'.*?\n        alts\.push\(\{t:'返台加盟中職一軍'.*?\}\);", "        if(o>=LV.NPB1.min&&chance(Math.round(60*ageGateJP())))alts.push({t:'跳槽日職一軍',s:'旅日合約',f:()=>{buyoutRemaining();signTo('NPB','NPB1',returnTeam('NPB').team);advance();}});\n        else if(o>=LV.NPB2.min&&chance(50))alts.push({t:'轉戰日職二軍（支配下）',f:()=>{buyoutRemaining();signTo('NPB','NPB2',returnTeam('NPB').team);advance();}});\n        else alts.push(...homecomingFallbackOptions(o,{pre:buyoutRemaining,done:advance}));")
replace('src/engine/contract.js', r"  if\(S\.org!=='CPBL'\)\{ if\(o>=41\).*?else if\(o>=30\).*?\}\s*\}", "  offers.push(...homecomingFallbackOptions(o,{pre:()=>buyoutRemaining(1)}));")
replace('src/engine/contract.js', r'/\* 多隊報價選擇:opts=\[\{team,bonus,yrs,mult,lv\}\] \*/', '''/* ---------- 日職路走不通時的其他出路 ----------
   日本出身球員的預設順位是先設法回日職；只有在日職沒人要時，才輪到這裡：
   社會人／獨立聯盟是留在日本國內的路，中職洋將則是跨海挑戰。
   三個選項各自用 chance() 模擬「球團願不願意開價」，門檻不到或運氣不好就不會出現，
   全部落空時呼叫端要自己準備「留在原地」或「引退」的收尾。 */
export function homecomingFallbackOptions(o,cfg){
  const pre=(cfg&&cfg.pre)||null, done=(cfg&&cfg.done)||null;
  const run=fn=>{ if(pre)pre(); fn(); if(done)done(); };
  const opts=[];
  if(o>=LV.CORP.min&&chance(75))opts.push({t:'加入社會人球隊',s:'職棒沒有位置，社會人球隊向你招手',f:()=>run(()=>{
    const team=pick(CORPORATE_TEAMS);
    S.org='CORP'; S.lv='CORP'; S.orgTeam=team; S.team=team; S.svc=0; S.faElig=false;
    S.ct=makeContract(1,1,'CORP',0,48,null,'業餘球團合約');
    card('info','加盟社會人',`職業球團都沒有留位置給你，社會人球隊卻向你伸出手——你決定加入 <b class="hl">${team}</b>，在企業隊延續棒球生涯。`); board(2);
  })});
  if(o>=LV.INDEP.min&&chance(80))opts.push({t:'加入獨立聯盟',s:'獨立聯盟球隊願意給你舞台',f:()=>run(()=>{
    const team=pick(INDEP_TEAMS);
    S.org='INDEP'; S.lv='INDEP'; S.orgTeam=team; S.team=team; S.svc=0; S.faElig=false;
    S.ct=makeContract(1,1,'INDEP',0,36,null,'業餘球團合約');
    card('info','加盟獨立聯盟',`沒有職棒球團開價，獨立聯盟球隊卻願意給你舞台——你決定加入 <b class="hl">${team}</b>，繼續留在球場上。`); board(2);
  })});
  if(o>=LV.CPBL1.min&&chance(60))opts.push({t:'挑戰中職洋將名額',s:'台灣中華職棒開出洋將合約',f:()=>run(()=>{
    const dest=returnTeam('CPBL');
    signTo('CPBL','CPBL1',dest.team,ri(1,2),1,undefined,true);
    card('info','海外挑戰',`台灣中華職棒的 <b class="hl">${dest.team}</b> 開出洋將合約，邀你跨海挑戰——你把握這個機會，前進台灣職棒。`); board(2);
  })});
  return opts;
}
/* 多隊報價選擇:opts=[{team,bonus,yrs,mult,lv}] */''')
replace('src/engine/contract.js', r"  /\* 5b 旅外球員合約到期:多一個返台加盟中職的選項\(落葉歸根\) \*/.*?\n  \}", "  /* 5b 日職路走不通時，海外／國內的其他出路（社會人／獨立聯盟／中職洋將） */\n  if(S.org!=='CPBL')faOpts.push(...homecomingFallbackOptions(o,{done:advance}));")
replace('src/engine/contract.js', r'export function homecomingAfterRejectedOffer\(o\)\{.*?\n\}', '''export function homecomingAfterRejectedOffer(o){
  const opts=homecomingFallbackOptions(o,{done:advance});
  opts.push({t:'就此引退',warn:true,s:'不再簽下新合約，結束球員生涯',f:retireFromMarket});
  choose(`何去何從 · 婉拒報價後，綜合能力 ${o}`,opts);
}''')
replace('src/engine/contract.js', r"org==='CPBL'\?'拒絕合約，宣布引退':'落葉歸根'.*?of\.mult\|\|1,false", "org==='CPBL'?'拒絕合約，宣布引退':'婉拒，另尋出路',org==='CPBL'?'不接受這份合約，直接結束球員生涯':'婉拒這份合約，看看還有沒有其他球隊願意開價',of.mult||1,false")

replace('src/flow/phases.js', r"import \{buyoutRemaining, contractAnnual, contractMarketProfile, controlledAnnual, crossOffers, daibaFarewell, extensionOffer, faFlow, fmtMoney, handleDemotion, levelMinAnnual, makeContract, makeOffers, offseasonTradeCheck, pickOfferUI, signTo, teamChampRate\} from '../engine/contract\.js\?v=1\.5\.11';", "import {ageGateJP, buyoutRemaining, contractAnnual, contractMarketProfile, controlledAnnual, crossOffers, daibaFarewell, extensionOffer, faFlow, fmtMoney, handleDemotion, homecomingFallbackOptions, levelMinAnnual, makeContract, makeOffers, offseasonTradeCheck, pickOfferUI, returnTeam, signTo, teamChampRate} from '../engine/contract.js?v=1.5.11';", re.M)
replace('src/flow/phases.js', r"    /\* 旅外老將\(衰退期\):放棄現有合約,落葉歸根返台;ovr<30\(真的打不動\)不給 \*/.*?\n    \}", '''    /* 旅美老將(衰退期):放棄現有合約，設法回日本打最後幾年；日職沒人要，再考慮其他出路。
       身在日職的老將已經在家鄉，不套用這條——直接引退或再戰一年就好。 */
    if(S.org==='MiLB'){
      const o=ovr();
      if(o>=LV.INDEP.min){
        oldOpts.push({t:'放棄合約，設法回日本',s:'想把職業生涯最後幾年留給日本球迷',f:()=>{
          if(o>=LV.NPB1.min&&chance(Math.round(50*ageGateJP()))){
            signTo('NPB','NPB1',returnTeam('NPB').team);
            card('good','回到日本',`狀態雖然已經不在巔峰，但日職球團看重的是你在海外累積的經驗與名氣——你決定放棄合約，回到日本，把職業生涯最後幾年留給球迷。`);
            tlRestage(); afterAsk();
          }else if(o>=LV.NPB2.min&&chance(45)){
            signTo('NPB','NPB2',returnTeam('NPB').team);
            card('good','回到日本',`一軍球團暫時沒有位置，但二軍球隊願意給你舞台——你決定放棄合約，回到日本，從支配下球員重新出發。`);
            tlRestage(); afterAsk();
          }else{
            const opts=homecomingFallbackOptions(o,{done:()=>{tlRestage();afterAsk();}});
            if(opts.length){
              card('info','日職沒有回音','你試著聯繫日本職棒球團，但沒有球隊願意開價——所幸還有其他邀約。');
              choose('還有其他選擇',opts);
            }else{
              card('bad','四處碰壁','日職球團沒有回應，其他聯盟也沒有球隊聯繫你，只能繼續留在原地。');
              afterAsk();
            }
          }
        }});
      }
    }''')
replace('src/flow/phases.js', r"export function annualHomecomingEligible\(org,lv\)\{.*?\n\}", '''export function annualHomecomingEligible(org,lv){
  /* 只有旅美（小聯盟）才談得上「回不回得去日本」；日職二軍本來就在日本國內，
     不該每季都跳出「返台」選項。 */
  return org==='MiLB'&&!!LV[lv]&&!LV[lv].top;
}''')
replace('src/flow/phases.js', r"  /\* 仍在海外養成層級時，每個球季結束都讓玩家重新決定是否返台。.*?\n    return;\n  \}", '''  /* 仍在小聯盟養成層級時，每個球季結束都讓玩家重新決定要不要試著回日本。
     順位固定：先設法回日職，日職沒人要才輪到社會人／獨立聯盟／中職洋將；
     四處碰壁的話就只能繼續留在小聯盟拚下去，不會被強制引退。 */
  if(annualHomecomingEligible(S.org,S.lv)){
    const tryJapan=()=>{
      if(o>=LV.NPB1.min&&chance(Math.round(50*ageGateJP()))){
        signTo('NPB','NPB1',returnTeam('NPB').team);
        card('gold','轉戰日職一軍',`你決定結束小聯盟的挑戰，帶著累積的經驗回到日本，挑戰日職一軍。`); advance(); return true;
      }
      if(o>=LV.NPB2.min&&chance(45)){
        signTo('NPB','NPB2',returnTeam('NPB').team);
        card('info','轉戰日職二軍',`你決定結束小聯盟的挑戰，回到日本，從日職二軍的支配下球員重新出發。`); advance(); return true;
      }
      return false;
    };
    choose('旅美生涯抉擇',[
      {t:'繼續挑戰小聯盟',main:true,s:`留在${LV[S.lv].n}，繼續朝大聯盟前進`,f:()=>crossOffers(o)},
      {t:'考慮回日本發展',s:'先設法談日職合約，若無人問津再考慮其他出路',f:()=>{
        if(tryJapan())return;
        const opts=homecomingFallbackOptions(o,{done:advance});
        if(opts.length){
          card('info','日職沒有回音','你試著聯繫日本職棒球團，但沒有球隊願意開出合約——所幸還有其他邀約。');
          choose('還有其他選擇',opts);
        }else{
          card('bad','四處碰壁','日職球團沒有回應，其他聯盟也沒有球隊聯繫你。看來，你只能繼續留在小聯盟拚下去。');
          crossOffers(o);
        }
      }}
    ]);
    return;
  }''')

replace('src/ui/dom.js', r"import \{APP_VER, SPONSOR_URL\} from '../config\.js\?v=1\.5\.11';", "import {APP_VER} from '../config.js?v=1.5.11';", re.M)
replace('src/ui/dom.js', r"    \$\{wide\?`<button class=\"btn\" id=\"md-ui\".*?export function creditsModal\(\)\{.*?\n\}\n", '''    ${wide?`<button class="btn" id="md-ui" style="text-align:center;margin-top:14px">${mob?'切回電腦版介面':'改用手機版介面'}</button>`:''}
    <button class="btn warn" id="md-restart0" style="text-align:center;margin-top:14px">重新開始</button>
    <button class="btn" id="md-close" style="text-align:center;margin-top:14px">關閉</button>`);
  $('md-theme').onclick=themeModal;
  $('md-big').onclick=()=>{ applyBigText(!big); menuModal(); };
  const mu=$('md-ui'); if(mu)mu.onclick=()=>{ applyMobileUI(!mob); menuModal(); };
  $('md-restart0').onclick=restartModal;
  $('md-close').onclick=modalClose;
}
''')

# Ensure the temporary trigger is removed by the workflow; leave all requested source edits intact.
