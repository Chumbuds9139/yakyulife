import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {APP_VER, CACHE_VER} from '../src/config.js';

assert.equal(APP_VER, 'v'+CACHE_VER);
const root=dirname(fileURLToPath(new URL('../index.html', import.meta.url)));
const ver=CACHE_VER;
const bad=[];
function walk(dir){
  for(const name of readdirSync(dir)){
    if(name==='node_modules'||name==='docs')continue;
    const p=join(dir,name);
    const st=statSync(p);
    if(st.isDirectory())walk(p);
    else if(/\.(js|mjs|html|css)$/.test(name)){
      const txt=readFileSync(p,'utf8');
      const re=/\?v=([0-9]+\.[0-9]+\.[0-9]+)/g;
      let m; while((m=re.exec(txt))){
        if(m[1]!==ver)bad.push(p.replace(root+'/','')+': ?v='+m[1]);
      }
    }
  }
}
walk(join(root,'src'));
walk(join(root,'tests'));
walk(root);
assert.equal(bad.length,0,bad.join('\n'));
console.log('Cache bust aligned to',APP_VER);
