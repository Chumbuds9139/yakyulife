import {S} from '../core/state.js?v=1.5.23';
import {R, ri, chance, clamp, N0} from '../core/rng.js?v=1.5.23';
import {LV} from '../data/teams.js?v=1.5.23';
import {card, choose, board} from '../ui/dom.js?v=1.5.23';
import {tlNote} from '../ui/timeline.js?v=1.5.23';
import {isSP, fmtIP, outsFromIP, ipFromOuts, normalizeIP, baseballERA} from './season.js?v=1.5.23';
import {ovr} from './ability.js?v=1.5.23';
import {intlFinishIndex} from './championship.js?v=1.5.23';
import {checkChampionTrait} from '../flow/events.js?v=1.5.23';
import {intlInviteCopy, intlEventName} from '../data/intl-copy.js?v=1.5.23';
export {intlInviteCopy, intlEventName};

export function intlWalks(st){
  if(!st)return 0;
  if(Number.isFinite(st.BB))return Math.max(0,Math.round(st.BB));
  if(Number.isFinite(st.PA)&&Number.isFinite(st.AB))return Math.max(0,Math.round(st.PA-st.AB));
  return 0;
}
export function intlStatLine(st){
  if(S.pos==='P'){
    const era=baseballERA(st);
    return `出賽 ${st.G}｜${fmtIP(st.IP)} 局｜${st.W} 勝｜${st.SV} 救援｜${st.SO} 三振｜${intlWalks(st)} 保送｜ERA ${era==null?'-':era.toFixed(2)}`;
  }
  const avg=st.AB>0?(st.H/st.AB).toFixed(3).replace(/^0/,''):'-';
  return `出賽 ${st.G}｜${st.PA} 打席｜打擊率 ${avg}｜${st.H} 安｜${st.HR} 轟｜${st.RBI} 打點｜${intlWalks(st)} 保送`;
}
export function addIntlStat(st){
  if(!Number.isFinite(S.intlStat.BB))S.intlStat.BB=(S.intlLog||[]).reduce((n,r)=>n+intlWalks(r.st),0);
  const oldOuts=outsFromIP(S.intlStat.IP);
  Object.keys(st).forEach(k=>{if(k!=='IP')S.intlStat[k]=(S.intlStat[k]||0)+st[k];});
  if(Object.prototype.hasOwnProperty.call(st,'IP'))S.intlStat.IP=ipFromOuts(oldOuts+outsFromIP(st.IP));
}
export function intlMvpRate(st,finish){
  if(finish>1)return 0;
  let score=0;
  if(S.pos==='P'){
    const era=baseballERA(st)??9;
    score=st.IP+st.SO*1.5+st.W*8+st.SV*6+Math.max(0,3.5-era)*5-Math.max(0,era-3.5)*4;
  }else{
    const avg=st.AB>0?st.H/st.AB:0;
    score=st.H*2+st.HR*8+st.RBI*2+Math.max(0,avg-.250)*100;
  }
  const finalistMult=finish===0?1:.2;
  return Math.round(clamp((score-28)*1.7,0,75)*finalistMult);
}
export function intlFormat(wbc){
  return wbc
    ?{minOvr:55,par:LV.MLB.par,ranks:['冠軍','亞軍','四強止步','八強止步','預賽出局'],games:[7,7,6,5,4]}
    :{minOvr:52,par:LV.NPB1.par,ranks:['冠軍','亞軍','季軍','殿軍','預賽出局'],games:[9,9,9,9,5]};
}
/* 日本長期是世界一線強權：這裡不是「真實勝率」，而是給國際賽引擎使用的歷史底蘊係數。
   2006/2009/2023 是經典賽冠軍年份；2017、2026 仍維持強隊級距，而不是被單一場敗戰打成弱隊。 */
const JAPAN_INTL_STRENGTH={
  wbc:{2006:8,2009:10,2013:7,2017:7,2023:10,2026:8},
  p12:{2015:7,2019:9,2024:9}
};
export function japanIntlStrength(year,wbc){
  const table=wbc?JAPAN_INTL_STRENGTH.wbc:JAPAN_INTL_STRENGTH.p12;
  if(table[year]!=null)return table[year];
  const ys=Object.keys(table).map(Number).filter(y=>y<year).sort((a,b)=>a-b);
  return ys.length?table[ys[ys.length-1]]:7;
}

export function maybeIntl(done){
  const wbc=(S.year-2026)%4===0;
  let p12=(S.year-2028)%4===0;
  if(S.lv==='MLB')p12=false;
  const intlFmt=intlFormat(wbc);
  if(S.stage!=='PRO'||(!wbc&&!p12)||ovr()<intlFmt.minOvr||S.seasonFactor<0.5||S.rehab>0||S.skipMid){done();return;}
  const copy=intlInviteCopy(wbc);
  const name=copy.name;
  S.intlLock=null; /* 舊存檔可能殘留列管年；日本版不再使用。 */

  /* 日本球員沒有兵役：代表隊是生涯選擇，不存在五年強制報到或列管鎖定。 */
  const participate=()=>{
    const teamStrength=japanIntlStrength(S.year,wbc);
    const personal=Math.round((ovr()-52)*0.45);
    const historical=Math.round((teamStrength-5)*1.2);
    const b=clamp(personal+historical,0,16);
    const i=intlFinishIndex(R()*100,b,!!S.traits.championmaker,!!S.invincible);
    const rk=intlFmt.ranks[i], teamGames=intlFmt.games[i], pts=[6,5,4,2,1][i];
    let gpts=pts;
    if(S.traits.intlace)gpts=Math.max(pts,2);
    S.pool+=gpts;
    S.injNext=S.traits.intlace?0:10;
    S.intlCount++;
    if(!S.traits.samurai&&S.intlCount>5){
      S.traits.samurai=true;
      card('gold','隱藏稱號：武士精神','永遠把日本代表的榮耀放在比個人職涯更高的位置。你在球場上拍著胸口、向看台致意的那一刻，成為球迷心中最驕傲的畫面。');
      board(1);
    }
    let intlSt;
    { const a=S.ab,par=intlFmt.par,clutch=S.traits.clutch?1:0;
      if(S.pos==='P'){
        let g,ip;
        if(isSP()){
          g=teamGames>=6?ri(1,2):1;
          ip=normalizeIP(g*(4.5+R()*2.5));
        }else{
          g=clamp(Math.round(teamGames*(0.55+R()*0.25)),1,teamGames);
          ip=normalizeIP(g*(0.8+R()*0.8));
        }
        const dd=(a.vel+a.ctl+a.brk)/3-par;
        const k9=clamp(7.5+dd*0.12+clutch*.5,4,14);
        const era=clamp(3.6-dd*0.16-clutch*.35,0.8,8);
        const bb9=clamp(4.6-(a.ctl-par)*0.13+N0(0.4),1.2,7.5);
        const h9=clamp(9.2-dd*0.16+N0(0.5),5,13.5);
        intlSt={G:g,IP:ip,H:Math.round(ip/9*h9),BB:Math.round(ip/9*bb9),SO:Math.round(ip/9*k9),ER:Math.round(era*ip/9),W:i<=2&&chance(45+clutch*8)?1:0,SV:!isSP()&&chance(30+clutch*6)?1:0};
      }else{
        const dd=(a.con*0.5+a.pow*0.2+a.eye*0.18+a.spd*0.12)-par-0.5;
        const g=teamGames,pa=g*ri(3,4);
        const bb=Math.round(pa*clamp(0.062+(a.eye-par)*0.0034,0.045,0.17));
        const ab=pa-bb;
        const avg=clamp(0.270+dd*0.006+clutch*.015,0.15,0.5),h=Math.round(ab*avg);
        const hr=Math.round(h*clamp(0.06+Math.max(0,a.pow-par)*0.006+clutch*.01,0.03,0.28));
        intlSt={G:g,PA:pa,AB:ab,H:h,HR:hr,RBI:Math.round((hr*2.1+h*0.35)*(1+clutch*.05)),BB:bb};
      }
    }
    addIntlStat(intlSt);
    (S.intlLog||(S.intlLog=[])).push({year:S.year,name,rank:rk,teamGames,st:{...intlSt}});
    if(i<=1)S.intlTop4=(S.intlTop4||0)+1;
    if(!S.traits.intlace&&S.intlCount>=3&&(S.intlTop4||0)>=2){
      S.traits.intlace=true;
      card('gold','隱藏屬性解鎖：國際賽之鬼','只要穿上代表隊球衣，你的痛覺就會消失——你是為大場面而生的男人。<b class="hl">國際賽不再增加受傷風險，且每次參賽能力點保底 +2</b>。');
    }
    if(i<=2)S.honors.push(`${S.year} ${name}${rk}`);
    if(i===0){tlNote(3,(wbc?'經典賽':'12強')+'冠軍');checkChampionTrait();}
    let ex='';
    const mvpRate=intlMvpRate(intlSt,i);
    if(chance(mvpRate)){S.honors.push(`${S.year} ${name}MVP`);ex='你憑本屆表現被選為<b class="hl">賽會MVP</b>！';}
    card(i<=1?'gold':'info',name,`日本代表最終成績：<b class="hl">${rk}</b>（團隊出賽 ${teamGames} 場）。${ex}<br><b>本屆個人成績：</b>${intlStatLine(intlSt)}。${S.traits.clutch?'<span class="up">（大心臟：大賽表現加成）</span>':''}<br>獲得能力點 <b class="hl">${gpts}</b> 點。${S.traits.intlace?'代表隊英雄不知何謂疲憊。':'國際賽的高強度消耗，讓下季受傷風險上升。'}`);
    done();
  };

  choose(copy.title,[
    {t:copy.accept,main:true,s:copy.acceptHint,f:participate},
    {t:copy.decline,s:copy.declineHint,f:()=>{
      card('info',copy.declineCardTitle,copy.declineBody);
      done();
    }}
  ]);
}
