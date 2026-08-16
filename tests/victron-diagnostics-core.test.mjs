import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(
  new URL('../supabase/functions/victron-diagnostics/index.ts',import.meta.url),
  'utf8'
);
const marker='Deno.serve(async (req) => {';
const withoutImport=source.replace(/^import .*?;\n/,'');
const core=withoutImport.slice(0,withoutImport.indexOf(marker))+
  '\nglobalThis.__test={walkRows,readBattery,readSolar,readHistory,assessBattery};';
const context={URLSearchParams,URL,Response,Request,Headers,fetch,AbortController,setTimeout,clearTimeout};
vm.runInNewContext(core,context,{filename:'victron-diagnostics-core.js'});

const rows=[
  {instance:123,dbusPath:'/Soc',dataAttributeName:'SmartShunt state of charge',valueFloat:82.4},
  {instance:123,dbusPath:'/Dc/0/Voltage',dataAttributeName:'SmartShunt battery voltage',valueFloat:11.87},
  {instance:123,dbusPath:'/Dc/0/Current',dataAttributeName:'SmartShunt battery current',valueFloat:-0.7},
  {instance:123,dbusPath:'/History/MinimumVoltage',dataAttributeName:'Minimum voltage',valueFloat:10.5},
  {instance:123,dbusPath:'/History/FullDischarges',dataAttributeName:'Full discharges',valueFloat:2},
  {instance:278,dbusPath:'/Yield/Power',dataAttributeName:'SmartSolar MPPT yield power',valueFloat:126},
  {instance:278,dbusPath:'/Pv/V',dataAttributeName:'PV voltage',valueFloat:36.4}
];

const battery=context.__test.readBattery(rows);
assert.equal(battery.instance,123);
assert.equal(battery.soc.value,82.4);
assert.equal(battery.voltage.value,11.87);
assert.equal(Math.round(battery.power.value*100)/100,-8.31);

const solar=context.__test.readSolar(rows);
assert.equal(solar.instance,278);
assert.equal(solar.power.value,126);

const now=Date.now();
const history=context.__test.readHistory([{
  records:{
    bv:[[now-6*3600000,12.6],[now,11.9]],
    bs:[[now-6*3600000,85],[now,72]],
    Pdc:[[now-6*3600000,-10],[now,-12]]
  }
}],7);
assert.equal(history.voltage.summary.count,2);
assert.equal(history.soc.summary.count,2);
assert.ok(history.soc.summary.changePerHour < -2);

const assessment=context.__test.assessBattery(battery,history,'lead');
assert.equal(assessment.level,'critical');
assert.ok(assessment.checks.some(check=>check.code==='soc_voltage_mismatch'));
assert.ok(assessment.checks.some(check=>check.code==='historic_deep_voltage'));

console.log('Victron diagnostics core tests: OK');
