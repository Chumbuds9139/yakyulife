/* 球隊年資與神主牌的純判斷，集中在這裡避免顯示、交易與結算各自解讀。 */
export function isMrTeamEligible(topSeasons,starSeasons){
  const top=Math.max(0,Number(topSeasons)||0),star=Math.max(0,Number(starSeasons)||0);
  return top>=15&&star*3>=top*2;
}

export function hasActiveFranchise(state){
  return !!(state&&state.traits&&state.traits.franchise&&state.franchiseActive);
}
