import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=name=>fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const loader=read('start-dashboard-71510.js');
const hotfix=read('runtime-hotfix-8311.js');
const sw=read('sw.js');
const css=read('start-dashboard-71510.css');

assert.match(loader,/runtime-hotfix-8311\.js\?v=831100/,'Runtime-guard wordt niet geladen');
assert.ok(loader.indexOf('runtime-hotfix-8311.js')<loader.indexOf('start-dashboard-core.js'),'Runtime-guard moet vóór de canonieke Start laden');
assert.match(hotfix,/data-ms-start-boot/,'Boot-flash guard ontbreekt');
assert.match(hotfix,/data-ms-phone-landscape/,'iPhone-landscape guard ontbreekt');
for(const id of ['ms71510Dashboard','serenityIvms','msDashboardAnalog7141','msDashboardPremium7143','msStartCockpit7144']){
  assert.ok(hotfix.includes(id),`Legacy dashboard niet geblokkeerd: ${id}`);
}
assert.match(sw,/const BUILD='8\.31\.1'/,'Service-worker cache is niet verhoogd');
assert.match(sw,/runtime-hotfix-8311\.js/,'Runtime-hotfix ontbreekt in offline kerncache');
assert.match(sw,/ignoreSearch:true/,'Cache-fallback voor oude queryversies ontbreekt');
assert.match(css,/#dashboard>:not\(#ms8210Start\)/,'Canonieke Start CSS blokkeert legacy dashboard niet');
console.log('MijnSerenity 8.31.1 runtime-hotfix contract: OK');
