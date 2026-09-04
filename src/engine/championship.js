import {clamp} from '../core/rng.js?v=1.5.19';
import {S} from '../core/state.js?v=1.5.19';

/* 只計國家隊與三個職業頂級聯盟冠軍；高中、大學與業餘冠軍不列入。 */
const MAJOR_CHAMPIONSHIP=/(世界棒球經典賽冠軍|世界12強賽冠軍|中職總冠軍|日本一|世界大賽冠軍)$/;
export function majorChampionshipCount(honors){
  return (honors||[]).filter(h=>MAJOR_CHAMPIONSHIP.test(h)).length;
}
const PRO_CHAMPIONSHIP=/(中職總冠軍|日本一|世界大賽冠軍)$/;
/* 結算年表的皇冠顯示所有層級的冠軍（含學生、業餘、國家隊與職業）。
   生涯評價是否計分是另一件事，不應影響履歷上的冠軍標記。 */
export function isChampionshipYear(honors,year){
  const prefix=String(year)+' ';
  return (honors||[]).some(h=>String(h).startsWith(prefix)&&/冠軍$|日本一$/.test(h));
}
export function isProChampionshipYear(honors,year){
  const prefix=String(year)+' ';
  return (honors||[]).some(h=>String(h).startsWith(prefix)&&PRO_CHAMPIONSHIP.test(h));
}
export function championshipChance(base,active){
  /* 彩蛋球員的「無敵」只影響奪冠判定，不改其他球員的原始機率。 */
  if(S?.invincible)return 100;
  return clamp((Number(base)||0)+(active?5:0),0,100);
}
export function intlFinishIndex(roll,strength,active,invincible){
  if(invincible||S?.invincible)return 0;
  /* strength 是國家隊歷史底蘊係數。提高上限後，強隊不是只得到微小線性加成，
     而是會同時抬高冠軍／亞軍／四強的門檻，避免日本這種長期強隊被單一骰點輕易打成預賽隊。 */
  const r=(Number(roll)||0)+(Number(strength)||0);
  const championCut=94-(active?5:0);
  const runnerCut=84-(active?2:0);
  const semiCut=70;
  const quarterCut=40;
  if(r>=championCut)return 0;
  if(r>=runnerCut)return 1;
  return r>=semiCut?2:r>=quarterCut?3:4;
}
