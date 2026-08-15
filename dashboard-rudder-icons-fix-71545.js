/* MijnSerenity 7.15.45 — roerzones en duidelijke energie-iconen */
(()=>{
  'use strict';
  if(window.__msRudderIconsFix71545)return;
  window.__msRudderIconsFix71545=true;

  const $=id=>document.getElementById(id);
  const COLORS={green:'#69df4d',yellow:'#f1bd37',red:'#ff5a4f'};

  function installStyle(){
    if($('msRudderIconsStyle71545'))return;
    const style=document.createElement('style');
    style.id='msRudderIconsStyle71545';
    style.textContent=`
      .msc-rudder-arc{
        border:0!important;
        background:none!important;
        overflow:visible!important;
      }
      .msc-rudder-arc::after{
        content:'';
        position:absolute;
        inset:0;
        pointer-events:none;
        z-index:0;
        background:conic-gradient(
          from 270deg at 50% 100%,
          ${COLORS.red} 0deg 25.714deg,
          ${COLORS.yellow} 25.714deg 64.286deg,
          ${COLORS.green} 64.286deg 115.714deg,
          ${COLORS.yellow} 115.714deg 154.286deg,
          ${COLORS.red} 154.286deg 180deg,
          transparent 180deg 360deg
        );
        -webkit-mask:radial-gradient(circle at 50% 100%,transparent 0 91px,#000 92px 103px,transparent 104px);
        mask:radial-gradient(circle at 50% 100%,transparent 0 91px,#000 92px 103px,transparent 104px);
      }
      .msc-rudder-arc::before{z-index:1!important}
      #mscRudderNeedle{
        z-index:2!important;
        transition:transform .2s ease,background-color .2s ease,box-shadow .2s ease!important;
      }
      .msc-rudder-foot>span:first-child b,
      .msc-rudder-foot>span:last-child b{color:${COLORS.red}!important}
      #mscRudder{transition:color .2s ease}
      .msc-battery-icon{
        width:34px!important;
        height:21px!important;
        display:block!important;
        flex:0 0 34px!important;
        position:relative!important;
        border:3px solid #70df49!important;
        border-radius:4px!important;
        font-size:0!important;
        line-height:0!important;
        color:transparent!important;
        background:transparent!important;
      }
      .msc-battery-icon::before{
        content:'';
        position:absolute;
        right:-7px;
        top:5px;
        width:4px;
        height:7px;
        border-radius:0 2px 2px 0;
        background:#70df49;
      }
      .msc-battery-icon::after{
        content:'';
        position:absolute;
        left:3px;
        top:3px;
        bottom:3px;
        width:20px;
        border-radius:1px;
        background:#70df49;
      }
    `;
    document.head.appendChild(style);
  }

  function removeCloverIcons(){
    const header=document.querySelector('.msc-head-icons');
    if(header&&header.textContent.includes('♧')){
      header.textContent=header.textContent.replace(/♧/g,'').trim();
    }

    const shore=$('mscShore');
    const row=shore?.closest('.msc-energy-row');
    if(row){
      [...row.children].forEach(child=>{
        if(child.tagName==='B'&&child.textContent.includes('♧'))child.remove();
      });
    }
  }

  function fixBatteryIcon(){
    const soc=$('mscSoc');
    const row=soc?.closest('.msc-energy-row');
    if(!row)return;
    const icon=[...row.children].find(child=>child.tagName==='B');
    if(!icon||icon.classList.contains('msc-battery-icon'))return;
    icon.className='msc-battery-icon';
    icon.textContent='';
    icon.setAttribute('role','img');
    icon.setAttribute('aria-label','Huishoudaccu');
  }

  function rudderAngle(){
    const raw=String($('mscRudder')?.textContent||'');
    const match=raw.replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match?Math.max(-35,Math.min(35,Number(match[0]))):0;
  }

  function rudderColor(angle){
    const value=Math.abs(Number(angle)||0);
    if(value<=10)return COLORS.green;
    if(value<=25)return COLORS.yellow;
    return COLORS.red;
  }

  function syncRudder(){
    const value=$('mscRudder');
    const needle=$('mscRudderNeedle');
    if(!value&&!needle)return;
    const color=rudderColor(rudderAngle());
    if(value)value.style.color=color;
    if(needle){
      needle.style.backgroundColor=color;
      needle.style.boxShadow=`0 0 8px ${color}88`;
    }
  }

  function apply(){
    installStyle();
    removeCloverIcons();
    fixBatteryIcon();
    syncRudder();
  }

  function init(){
    apply();
    const observer=new MutationObserver(()=>requestAnimationFrame(apply));
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(syncRudder,500);
    ['mijnserenity-ha-state-updated','mijnserenity-ha-connected','mijnserenity-ruuvi-vrm-updated']
      .forEach(name=>window.addEventListener(name,apply,{passive:true}));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
