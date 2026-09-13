/* MijnSerenity 8.27.9 */
(()=>{
'use strict';
if(window.__msSettingsNotifications8279)return;
window.__msSettingsNotifications8279=true;
const $=id=>document.getElementById(id);
function mount(){
 const settings=$('settings'); if(!settings||$('ms8279SettingsCard'))return;
 const card=document.createElement('div'); card.id='ms8279SettingsCard'; card.className='card collapsible-card';
 card.innerHTML='<button class="section-toggle" type="button"><span>Alarmen</span><span class="chevron">⌄</span></button><div id="ms8279SettingsWrap" class="hidden"><label><input id="ms8279AlarmMaster" type="checkbox" checked> Alarmbewaking actief</label><div id="ms8279SettingsStatus"></div></div>';
 settings.querySelector('.ms752-app-info-card')?.insertAdjacentElement('afterend',card);
 card.querySelector('button')?.addEventListener('click',()=>{$('ms8279SettingsWrap')?.classList.toggle('hidden')});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.addEventListener('hashchange',mount,{passive:true});
})();