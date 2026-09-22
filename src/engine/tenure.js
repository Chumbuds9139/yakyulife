/* 球隊年資與神主牌的純判斷，集中在這裡避免顯示、交易與結算各自解讀。 */
export function isMrTeamEligible(firstTeamSeasons,starSeasons){
  const firstTeam=Math.max(0,Number(firstTeamSeasons)||0),star=Math.max(0,Number(starSeasons)||0);
  /* 至少 15 個一軍球季；明星級球季只需達一軍年資的 2/3，不是要 15 個明星球季。 */
  return firstTeam>=15&&star>=Math.ceil(firstTeam*2/3);
}

export function hasActiveFranchise(state){
  return !!(state&&state.traits&&state.traits.franchise&&state.franchiseActive);
}

/* 羅力條款：中職一軍年資滿 9 年，洋將改視同本土、不佔洋將名額。
   只計真正站上一軍、且該季有出賽的年（復健年／傷缺過半不算）。年資離隊不歸零。 */
export const CPBL_DOMESTIC_YEARS=9;
export function isCpblDomestic(state){ return !!(state&&state.cpblDomestic); }
export function cpbl1YearQualifies(state){
  if(!state||state.stage!=='PRO'||state.lv!=='CPBL1')return false;
  if(state.skipMid)return false;
  return (state.seasonFactor||0)>=0.5;
}
export function accrueCpbl1Service(state){
  if(!cpbl1YearQualifies(state))return false;
  state.cpbl1Years=(state.cpbl1Years||0)+1;
  if(!state.cpblDomestic&&state.cpbl1Years>=CPBL_DOMESTIC_YEARS){
    state.cpblDomestic=true;
    return true;
  }
  return false;
}
