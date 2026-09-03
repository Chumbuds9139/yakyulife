/* 日本沒有兵役列管。經典賽／12 強一律由玩家自行決定是否披上國家隊戰袍。 */
export function intlEventName(wbc){
  return wbc?'世界棒球經典賽':'世界12強賽';
}
export function intlInviteCopy(wbc){
  const name=intlEventName(wbc);
  return {
    name,
    title:`日本代表邀請你參加${name}`,
    accept:'披上國家隊戰袍',
    decline:'考量身體狀況婉拒',
    acceptHint:'自願參賽｜依成績獲得能力點｜下季受傷機率 +10%',
    declineHint:'完全自由選擇，不影響日後再次受邀',
    declineCardTitle:'國家隊邀請',
    declineBody:`你決定這次不參加<b class="hl">${name}</b>。這是你的生涯選擇；未來國際賽仍可再次接受代表隊邀請。`
  };
}
