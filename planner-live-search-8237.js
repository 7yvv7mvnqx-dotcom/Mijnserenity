/* MijnSerenity - gecombineerde plaats-/havensuggesties voor de routeplanner.
 * De bestaande POI's blijven beschikbaar; plaatsnamen en OSM-havens komen erbij. */
(() => {
  'use strict';
  if (window.__msPlannerLiveSearch8237) return;
  window.__msPlannerLiveSearch8237 = true;

  const MIN_CHARS = 2, MAX_LOCAL = 5, DEBOUNCE_MS = 500;
  const controls = new Map();
  const remoteCache = new Map();
  const API = '/.netlify/functions/route-place-suggest';

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }
  function addStyles() {
    if (document.getElementById('ms8237Styles')) return;
    const style = document.createElement('style');
    style.id = 'ms8237Styles';
    style.textContent = [
      '.ms8237-native{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important}',
      '.ms8237-shell{position:relative;width:100%;min-width:0}',
      '.ms8237-input-wrap{position:relative;display:flex;align-items:center}',
      '.ms8237-input{width:100%!important;min-height:48px!important;padding-left:42px!important;padding-right:42px!important;-webkit-appearance:none!important;appearance:none!important}',
      '.ms8237-input::-webkit-search-cancel-button{display:none}',
      '.ms8237-icon{position:absolute;left:14px;pointer-events:none;opacity:.72}',
      '.ms8237-clear{position:absolute!important;right:7px!important;top:50%!important;transform:translateY(-50%)!important;width:34px!important;height:34px!important;min-height:34px!important;padding:0!important;border:0!important;border-radius:50%!important;background:transparent!important;color:inherit!important;font-size:22px!important;box-shadow:none!important;display:none!important}',
      '.ms8237-shell.has-value .ms8237-clear{display:block!important}',
      '.ms8237-list{position:absolute;z-index:12040;left:0;right:0;top:calc(100% + 7px);max-height:min(45vh,400px);overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid rgba(122,190,221,.36);border-radius:16px;background:#e8f1f8;color:#061321;box-shadow:0 18px 44px rgba(0,0,0,.38);padding:6px}',
      '.ms8237-list[hidden]{display:none!important}',
      '.ms8237-heading{padding:8px 12px 4px;font-size:.76rem;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#416476}',
      '.ms8237-result{width:100%!important;min-height:54px!important;display:block!important;text-align:left!important;padding:10px 12px!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#061321!important;box-shadow:none!important}',
      '.ms8237-result:hover,.ms8237-result.is-active{background:rgba(20,111,169,.14)!important}',
      '.ms8237-result strong{display:block;font-size:1rem;line-height:1.2;white-space:normal;overflow-wrap:anywhere}',
      '.ms8237-result small{display:block;color:#577080;font-size:.75rem;margin-top:3px}',
      '.ms8237-result mark{background:transparent;color:inherit;font-weight:900;text-decoration:underline;text-decoration-thickness:2px}',
      '.ms8237-note{padding:10px 12px;color:#577080;font-size:.82rem;line-height:1.35}',
      '.planner-stop-add-row.ms8237-stop-ready{align-items:start!important}',
      '.planner-stop-add-row.ms8237-stop-ready>.ms8237-shell{flex:1 1 auto;min-width:0}',
      '@media(max-width:700px){.planner-stop-add-row.ms8237-stop-ready{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important}.ms8237-list{max-height:43vh}}'
    ].join('\n');
    document.head.appendChild(style);
  }
  function optionRecords(select) {
    return [...select.options].filter(o => String(o.value || '').trim() && !o.disabled)
      .map(o => {
        const label = String(o.textContent || '').replace(/\s+/g, ' ').trim();
        const group = o.parentElement?.tagName === 'OPTGROUP' ? o.parentElement.label : '';
        return {
          value: String(o.value), label, group,
          current: o.value === 'current',
          favorite: label.includes('⭐'),
          search: normalize(label + ' ' + group)
        };
      });
  }
  function highlighted(parent, label, query) {
    const i = normalize(label).indexOf(normalize(query));
    // Alleen gewone substringmarkering gebruiken, nooit gebruikersinvoer als HTML.
    const rawIndex = label.toLowerCase().indexOf(String(query).toLowerCase());
    if (i < 0 || rawIndex < 0 || !query) { parent.textContent = label; return; }
    parent.append(document.createTextNode(label.slice(0, rawIndex)));
    const mark = document.createElement('mark');
    mark.textContent = label.slice(rawIndex, rawIndex + query.length);
    parent.append(mark, document.createTextNode(label.slice(rawIndex + query.length)));
  }
  function close(control) {
    control.list.hidden = true;
    control.input.setAttribute('aria-expanded', 'false');
    control.activeIndex = -1;
    control.results = [];
  }
  function choose(control, record) {
    if (!record) return;
    let ref = record.value;
    if (record.remote) ref = window.msPlannerRegisterPlaceSuggestion?.(record);
    if (!ref) { note(control, 'Deze locatie kan momenteel niet worden toegevoegd.'); return; }
    control.select.value = ref;
    control.select.dispatchEvent(new Event('input', { bubbles: true }));
    control.select.dispatchEvent(new Event('change', { bubbles: true }));
    control.input.value = record.label;
    control.input.dataset.selectedValue = ref;
    control.shell.classList.toggle('has-value', !!record.label);
    control.controller?.abort();
    clearTimeout(control.timer);
    close(control);
  }
  function heading(control, label) {
    const div = document.createElement('div');
    div.className = 'ms8237-heading';
    div.textContent = label;
    control.list.appendChild(div);
  }
  function note(control, message) {
    const div = document.createElement('div');
    div.className = 'ms8237-note';
    div.textContent = message;
    control.list.appendChild(div);
  }
  function result(control, record, query, subtitle) {
    const index = control.results.length;
    control.results.push(record);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ms8237-result';
    button.dataset.index = String(index);
    button.setAttribute('role', 'option');
    button.id = control.input.id + '-option-' + index;
    const title = document.createElement('strong');
    highlighted(title, record.label, query);
    const small = document.createElement('small');
    small.textContent = subtitle;
    button.append(title, small);
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => choose(control, control.results[index]));
    control.list.appendChild(button);
  }
  function remoteRecords(data) {
    const valid = p => p && p.name && /^osm-[nwrp]-\d+$/.test(String(p.id))
      && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon));
    const map = p => ({
      ...p, label: p.name, value: '', remote: true,
      group: [p.type, p.place].filter(Boolean).join(' · ')
    });
    const places = (data?.places || []).filter(valid).map(map).slice(0, 5);
    const harbours = (data?.harbours || []).filter(valid).map(map).slice(0, 18);
    return { places, harbours, place: data?.place || '', harboursAvailable: data?.harboursAvailable };
  }
  function render(control) {
    const raw = control.input.value;
    const query = normalize(raw);
    const all = optionRecords(control.select);
    const current = control.pinCurrent && query.length < MIN_CHARS
      ? all.find(p => p.current) : null;
    const local = query.length < MIN_CHARS ? [] : all
      .filter(p => !p.current && p.search.includes(query))
      .sort((a, b) => {
        const favorite = Number(!a.favorite) - Number(!b.favorite);
        if (favorite) return favorite;
        const prefix = Number(!normalize(a.label).startsWith(query))
          - Number(!normalize(b.label).startsWith(query));
        return prefix || a.label.localeCompare(b.label, 'nl');
      }).slice(0, MAX_LOCAL);
    const online = query.length >= MIN_CHARS ? control.remote : null;
    control.list.replaceChildren();
    control.results = [];
    control.activeIndex = -1;
    if (current) result(control, current, '', 'Huidige positie');
    if (local.length) {
      heading(control, 'Mijn havens en opgeslagen locaties');
      local.forEach(item => result(control, item, raw, item.group || control.contextLabel));
    }
    if (online?.places?.length) {
      heading(control, 'Plaatsen en buurten');
      online.places.forEach(item => {
        if (!local.some(p => normalize(p.label).includes(normalize(item.name) + ' · ')))
          result(control, item, raw, item.group);
      });
    }
    if (online?.harbours?.length) {
      heading(control, 'Havens en aanlegplaatsen bij ' + (online.place || raw));
      online.harbours.forEach(item => result(control, item, raw,
        item.type + ' · ' + (Number.isFinite(Number(item.distanceKm))
          ? Number(item.distanceKm).toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + ' km van ' + online.place
          : item.place)));
    }
    if (query.length < MIN_CHARS) note(control, 'Typ minimaal 2 letters om steden, dorpen, havens en plaatsen te zoeken.');
    else if (control.loading) note(control, 'Meer plaatsen en havens zoeken…');
    else if (control.error) note(control, local.length ? 'Online suggesties tijdelijk niet beschikbaar.' : 'Zoeken is tijdelijk niet beschikbaar. Probeer later opnieuw.');
    else if (!control.results.length) note(control, 'Geen plaatsen of havens gevonden.');
    else if (online && online.place && !online.harboursAvailable)
      note(control, 'De havenlijst is tijdelijk niet beschikbaar. Kies een plaats of probeer opnieuw.');
    else if (online) note(control, 'Locatiegegevens © OpenStreetMap-bijdragers');
    control.list.hidden = false;
    control.input.setAttribute('aria-expanded', 'true');
  }
  function searchRemote(control) {
    const q = normalize(control.input.value);
    if (q.length < MIN_CHARS || control.input.dataset.selectedValue) return;
    control.controller?.abort();
    control.controller = new AbortController();
    const controller = control.controller;
    const cached = remoteCache.get(q);
    if (cached && Date.now() - cached.time < 15 * 60 * 1000) {
      control.remote = remoteRecords(cached.data);
      control.loading = false;
      render(control);
      return;
    }
    control.loading = true;
    render(control);
    fetch(API + '?q=' + encodeURIComponent(control.input.value.trim()), {
      signal: controller.signal, headers: { accept: 'application/json' }
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Locatieservice niet beschikbaar');
      if (controller.signal.aborted || normalize(control.input.value) !== q) return;
      remoteCache.set(q, { data, time: Date.now() });
      if (remoteCache.size > 50) remoteCache.delete(remoteCache.keys().next().value);
      control.remote = remoteRecords(data);
      control.loading = false;
      render(control);
    }).catch(error => {
      if (error.name === 'AbortError' || controller.signal.aborted) return;
      control.loading = false;
      control.error = true;
      render(control);
    });
  }
  function syncFromSelect(control) {
    if (document.activeElement === control.input) return;
    const selected = control.select.selectedOptions?.[0];
    const value = String(selected?.value || '');
    control.input.value = value ? String(selected.textContent || '').replace(/\s+/g, ' ').trim() : '';
    if (value) control.input.dataset.selectedValue = value;
    else delete control.input.dataset.selectedValue;
    control.shell.classList.toggle('has-value', !!control.input.value);
  }
  function installOne(config) {
    if (controls.has(config.selectId)) return;
    const select = document.getElementById(config.selectId);
    if (!select || document.getElementById(config.inputId)) return;
    addStyles();
    const shell = document.createElement('div');
    shell.className = 'ms8237-shell';
    const wrap = document.createElement('div');
    wrap.className = 'ms8237-input-wrap';
    const icon = document.createElement('span');
    icon.className = 'ms8237-icon';
    icon.textContent = '⌕';
    icon.setAttribute('aria-hidden', 'true');
    const input = document.createElement('input');
    Object.assign(input, {
      id: config.inputId, className: 'ms8237-input', type: 'search',
      autocomplete: 'off', autocapitalize: 'words', spellcheck: false,
      placeholder: config.placeholder
    });
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    const clear = document.createElement('button');
    Object.assign(clear, { type: 'button', className: 'ms8237-clear', textContent: '×' });
    clear.setAttribute('aria-label', 'Zoekveld wissen');
    const list = document.createElement('div');
    list.className = 'ms8237-list';
    list.id = config.inputId + '-suggestions';
    list.hidden = true;
    list.setAttribute('role', 'listbox');
    input.setAttribute('aria-controls', list.id);
    wrap.append(icon, input, clear);
    shell.append(wrap, list);
    select.parentNode.insertBefore(shell, select);
    select.classList.add('ms8237-native');
    if (config.stop) select.closest('.planner-stop-add-row')?.classList.add('ms8237-stop-ready');
    const label = document.querySelector('label[for="' + config.selectId + '"]');
    if (label) label.setAttribute('for', input.id);
    const control = {
      select, shell, input, list, pinCurrent: !!config.pinCurrent, stop: !!config.stop,
      contextLabel: config.contextLabel, remote: null, loading: false, error: false,
      timer: null, controller: null, results: [], activeIndex: -1
    };
    controls.set(config.selectId, control);
    input.addEventListener('focus', () => {
      if (input.dataset.selectedValue) setTimeout(() => input.select(), 0);
      render(control);
    });
    input.addEventListener('input', () => {
      delete input.dataset.selectedValue;
      select.value = '';
      shell.classList.toggle('has-value', !!input.value);
      clearTimeout(control.timer);
      control.controller?.abort();
      control.remote = null;
      control.error = false;
      control.loading = false;
      render(control);
      if (normalize(input.value).length >= MIN_CHARS)
        control.timer = setTimeout(() => searchRemote(control), DEBOUNCE_MS);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { close(control); return; }
      if (event.key === 'Enter' && !list.hidden && control.results.length) {
        event.preventDefault();
        choose(control, control.results[control.activeIndex >= 0 ? control.activeIndex : 0]);
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      if (list.hidden) render(control);
      const buttons = [...list.querySelectorAll('.ms8237-result')];
      if (!buttons.length) return;
      if (event.key === 'ArrowDown')
        control.activeIndex = Math.min(buttons.length - 1, control.activeIndex + 1);
      else control.activeIndex = control.activeIndex <= 0 ? buttons.length - 1 : control.activeIndex - 1;
      buttons.forEach((button, i) => button.classList.toggle('is-active', i === control.activeIndex));
      buttons[control.activeIndex]?.scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', buttons[control.activeIndex]?.id || '');
    });
    clear.addEventListener('click', () => {
      control.controller?.abort();
      clearTimeout(control.timer);
      select.value = '';
      input.value = '';
      delete input.dataset.selectedValue;
      shell.classList.remove('has-value');
      control.remote = null;
      input.focus();
      render(control);
    });
    select.addEventListener('change', () => syncFromSelect(control));
    new MutationObserver(() => syncFromSelect(control)).observe(select, { childList: true, subtree: true });
    if (config.stop)
      select.closest('.planner-stop-add-row')?.querySelector('button.secondary')?.addEventListener('click', () => {
        setTimeout(() => {
          select.value = '';
          input.value = '';
          delete input.dataset.selectedValue;
          shell.classList.remove('has-value');
          close(control);
        }, 0);
      });
    syncFromSelect(control);
  }
  function install() {
    installOne({ selectId: 'plannerFrom', inputId: 'plannerFromSearch', placeholder: 'Zoek vertrekpunt…', pinCurrent: true, contextLabel: 'Vertrekpunt' });
    installOne({ selectId: 'plannerTo', inputId: 'plannerToSearch', placeholder: 'Zoek stad, haven of bestemming…', contextLabel: 'Bestemming' });
    installOne({ selectId: 'plannerStopSelect', inputId: 'plannerStopSearch', placeholder: 'Zoek een tussenstop…', contextLabel: 'Tussenstop', stop: true });
  }
  function start() {
    install();
    let n = 0;
    const interval = setInterval(() => {
      install();
      if (controls.size === 3 || ++n > 50) clearInterval(interval);
    }, 250);
  }
  document.addEventListener('pointerdown', event => {
    controls.forEach(c => { if (!c.shell.contains(event.target)) close(c); });
  }, { passive: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('mijnserenity:routechange', () => setTimeout(install, 0));
  window.addEventListener('mijnserenity:modules-ready', () => setTimeout(install, 0), { passive: true });
})();
