from pathlib import Path
p=Path('src/flow/phases.js')
s=p.read_text(encoding='utf-8')
needle="    ];\n    if(o>=reqMiLB)opts.push({t:'洽談旅美合約'"
insert="    ];\n    /* 依原遊戲邏輯保留旅美合約；日本職棒則統一透過日職選秀。 */\n    const agePenalty=Math.max(0,S.age-18);\n    const reqMiLB=50+Math.floor(agePenalty/2);\n    const bonusMiLB=Math.max(150,1500-agePenalty*350);\n    const goPro=finishDecision;\n    if(o>=reqMiLB)opts.push({t:'洽談旅美合約'"
if needle not in s:
    raise SystemExit('target college overseas block not found')
s=s.replace(needle,insert,1)
p.write_text(s,encoding='utf-8')
