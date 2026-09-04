/* MijnSerenity 8.23.7 — live zoeken in routeplanner */
(() => {
  'use strict';
  if (window.__msPlannerLiveSearch8237) return;
  window.__msPlannerLiveSearch8237 = true;

  const MIN_CHARS = 2;
  const MAX_RESULTS = 6;
  const DEBOUNCE_MS = 225;
  const controls = new Map();

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function addStyles() {
    if (document.getElementById('ms8237Styles')) return;
    const style = document.createElement('style');
    style.id = 'ms8237Styles';
    style.textContent = `
      .ms8237-native { position:absolute!important; width:1px!important; height:1px!important; opacity:0!important; pointer-events:none!important; }
      .ms8237-shell { position:relative; width:100%; min-width:0; }
      .ms8237-input-wrap { position:relative; display:flex; align-items:center; }
      .ms8237-input { width:100%!important; min-height:48px!important; padding-left:42px!important; padding-right:42px!important; -webkit-appearance:none!important; appearance:none!important; }
      .ms8237-input::-webkit-search-cancel-button { display:none; }
      .ms8237-icon { position:absolute; left:14px; pointer-events:none; opacity:.72; }
      .ms8237-clear { position:absolute!important; right:7px!important; top:50%!important; transform:translateY(-50%)!important; width:34px!important; height:34px!important; min-height:34px!important; padding:0!important; border:0!important; border-radius:50%!important; background:transparent!important; color:inherit!important; font-size:22px!important; box-shadow:none!important; display:none!important; }
      .ms8237-shell.has-value .ms8237-clear { display:block!important; }
      .ms8237-list { position:absolute; z-index:12040; left:0; right:0; top:calc(100% + 7px); max-height:min(44vh,390px); overflow:auto; -webkit-overflow-scrolling:touch; border:1px solid rgba(122,190,221,.36); border-radius:16px; background:#e8f1f8; color:#061321; box-shadow:0 18px 44px rgba(0,0,0,.38); padding:6px; }
      .ms8237-list[hidden] { display:none!important; }
      .ms8237-result { width:100%!important; min-height:54px!important; display:block!important; text-align:left!important; padding:10px 12px!important; border:0!important; border-radius:12px!important; background:transparent!important; color:#061321!important; box-shadow:none!important; }
      .ms8237-result:hover, .ms8237-result.is-active { background:rgba(20,111,169,.14)!important; }
      .ms8237-result strong { display:block; font-size:1rem; line-height:1.2; }
      .ms8237-result small { display:block; color:#577080; font-size:.75rem; margin-top:3px; }
      .ms8237-result mark { background:transparent; color:inherit; font-weight:900; text-decoration:underline; text-decoration-thickness:2px; }
      .ms8237-note { padding:13px 12px; color:#577080; font-size:.88rem; line-height:1.3; }
      .planner-stop-add-row.ms8237-stop-ready { align-items:start!important; }
      .planner-stop-add-row.ms8237-stop-ready > .ms8237-shell { flex:1 1 auto; min-width:0; }
      @media (max-width:700px) {
        .planner-stop-add-row.ms8237-stop-ready { display:grid!important; grid-template-columns:minmax(0,1fr) auto!important; gap:8px!important; }
        .ms8237-list { max-height:42vh; }
      }
    `;
    document.head.appendChild(style);
  }

  function optionRecords(select) {
    return Array.from(select.options)
      .filter(option => String(option.value || '').trim() && !option.disabled)
      .map(option => {
        const label = String(option.textContent || '').replace(/\s+/g, ' ').trim();
        const group = option.parentElement && option.parentElement.tagName === 'OPTGROUP'
          ? String(option.parentElement.label || '').trim()
          : '';
        return {
          value: String(option.value),
          label,
          group,
          current: String(option.value) === 'current' || /huidige positie/i.test(label),
          favorite: label.includes('⭐'),
          search: normalize(label + ' ' + group)
        };
      });
  }

  function addHighlightedText(parent, label, query) {
    const raw = String(query || '').trim();
    const lowerLabel = label.toLowerCase();
    const lowerQuery = raw.toLowerCase();
    const index = raw ? lowerLabel.indexOf(lowerQuery) : -1;
    if (index < 0) {
      parent.textContent = label;
      return;
    }
    parent.append(document.createTextNode(label.slice(0, index)));
    const mark = document.createElement('mark');
    mark.textContent = label.slice(index, index + raw.length);
    parent.append(mark, document.createTextNode(label.slice(index + raw.length)));
  }

  function close(control) {
    control.list.hidden = true;
    control.input.setAttribute('aria-expanded', 'false');
    control.results = [];
    control.activeIndex = -1;
  }

  function choose(control, record) {
    if (!record) return;
    control.select.value = record.value;
    control.select.dispatchEvent(new Event('input', { bubbles: true }));
    control.select.dispatchEvent(new Event('change', { bubbles: true }));
    control.input.value = record.label;
    control.input.dataset.selectedValue = record.value;
    control.shell.classList.toggle('has-value', Boolean(record.label));
    close(control);
  }

  function addResult(control, record, index, query, subtitle) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ms8237-result';
    button.dataset.index = String(index);
    button.setAttribute('role', 'option');

    const title = document.createElement('strong');
    addHighlightedText(title, record.label, query);
    const small = document.createElement('small');
    small.textContent = subtitle;
    button.append(title, small);

    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => choose(control, control.results[index]));
    control.list.appendChild(button);
  }

  function addNote(control, text) {
    const note = document.createElement('div');
    note.className = 'ms8237-note';
    note.textContent = text;
    control.list.appendChild(note);
  }

  function render(control) {
    const rawQuery = control.input.value;
    const query = normalize(rawQuery);
    const all = optionRecords(control.select);
    const current = control.pinCurrent ? all.find(item => item.current) : null;

    let found = [];
    if (query.length >= MIN_CHARS) {
      found = all
        .filter(item => !item.current && item.search.includes(query))
        .sort((a, b) => {
          const aLabel = normalize(a.label);
          const bLabel = normalize(b.label);
          const startDifference = Number(!aLabel.startsWith(query)) - Number(!bLabel.startsWith(query));
          if (startDifference) return startDifference;
          const favoriteDifference = Number(!a.favorite) - Number(!b.favorite);
          if (favoriteDifference) return favoriteDifference;
          return aLabel.localeCompare(bLabel, 'nl');
        })
        .slice(0, MAX_RESULTS);
    }

    control.results = current ? [current, ...found] : found;
    control.activeIndex = -1;
    control.list.replaceChildren();

    let offset = 0;
    if (current) {
      addResult(control, current, 0, '', 'Huidige locatie');
      offset = 1;
    }

    if (query.length < MIN_CHARS) {
      addNote(control, `Typ minimaal ${MIN_CHARS} letters om havens en plaatsen te zoeken.`);
    } else if (!found.length) {
      addNote(control, 'Geen havens of plaatsen gevonden.');
    } else {
      found.forEach((record, index) => {
        addResult(control, record, index + offset, rawQuery, record.group || control.contextLabel);
      });
    }

    control.list.hidden = false;
    control.input.setAttribute('aria-expanded', 'true');
  }

  function syncFromSelect(control) {
    if (document.activeElement === control.input) return;
    const selected = control.select.options[control.select.selectedIndex];
    const value = String(selected && selected.value || '');
    control.input.value = value ? String(selected.textContent || '').replace(/\s+/g, ' ').trim() : '';
    if (value) control.input.dataset.selectedValue = value;
    else delete control.input.dataset.selectedValue;
    control.shell.classList.toggle('has-value', Boolean(control.input.value));
  }

  function installOne(config) {
    if (controls.has(config.selectId)) return;
    const select = document.getElementById(config.selectId);
    if (!select) return;
    addStyles();

    const shell = document.createElement('div');
    shell.className = 'ms8237-shell';
    const inputWrap = document.createElement('div');
    inputWrap.className = 'ms8237-input-wrap';
    const icon = document.createElement('span');
    icon.className = 'ms8237-icon';
    icon.textContent = '⌕';
    icon.setAttribute('aria-hidden', 'true');
    const input = document.createElement('input');
    input.id = config.inputId;
    input.className = 'ms8237-input';
    input.type = 'search';
    input.autocomplete = 'off';
    input.autocapitalize = 'words';
    input.spellcheck = false;
    input.placeholder = config.placeholder;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'ms8237-clear';
    clearButton.textContent = '×';
    clearButton.setAttribute('aria-label', 'Zoekveld wissen');
    const list = document.createElement('div');
    list.className = 'ms8237-list';
    list.hidden = true;
    list.setAttribute('role', 'listbox');

    inputWrap.append(icon, input, clearButton);
    shell.append(inputWrap, list);
    select.parentNode.insertBefore(shell, select);
    select.classList.add('ms8237-native');
    if (config.stop) select.closest('.planner-stop-add-row')?.classList.add('ms8237-stop-ready');

    const label = document.querySelector(`label[for="${config.selectId}"]`);
    if (label) label.setAttribute('for', config.inputId);

    const control = {
      select, shell, input, list,
      pinCurrent: Boolean(config.pinCurrent),
      contextLabel: config.contextLabel,
      activeIndex: -1,
      results: [],
      timer: null
    };
    controls.set(config.selectId, control);

    input.addEventListener('focus', () => {
      if (input.dataset.selectedValue) setTimeout(() => input.select(), 0);
      render(control);
    });
    input.addEventListener('input', () => {
      delete input.dataset.selectedValue;
      select.value = '';
      shell.classList.toggle('has-value', Boolean(input.value));
      clearTimeout(control.timer);
      control.timer = setTimeout(() => render(control), DEBOUNCE_MS);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        close(control);
        return;
      }
      if (event.key === 'Enter' && !list.hidden && control.results.length) {
        event.preventDefault();
        choose(control, control.results[control.activeIndex >= 0 ? control.activeIndex : 0]);
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      if (list.hidden) render(control);
      const buttons = Array.from(list.querySelectorAll('.ms8237-result'));
      if (!buttons.length) return;
      if (event.key === 'ArrowDown') control.activeIndex = Math.min(buttons.length - 1, control.activeIndex + 1);
      else control.activeIndex = control.activeIndex <= 0 ? buttons.length - 1 : control.activeIndex - 1;
      buttons.forEach((button, index) => button.classList.toggle('is-active', index === control.activeIndex));
      buttons[control.activeIndex]?.scrollIntoView({ block: 'nearest' });
    });
    clearButton.addEventListener('click', () => {
      select.value = '';
      input.value = '';
      delete input.dataset.selectedValue;
      shell.classList.remove('has-value');
      input.focus();
      render(control);
    });
    select.addEventListener('change', () => syncFromSelect(control));
    new MutationObserver(() => syncFromSelect(control)).observe(select, { childList: true, subtree: true });

    if (config.stop) {
      select.closest('.planner-stop-add-row')?.querySelector('button.secondary')?.addEventListener('click', () => {
        setTimeout(() => {
          select.value = '';
          input.value = '';
          delete input.dataset.selectedValue;
          shell.classList.remove('has-value');
          close(control);
        }, 0);
      });
    }

    syncFromSelect(control);
  }

  function install() {
    installOne({ selectId: 'plannerFrom', inputId: 'plannerFromSearch', placeholder: 'Zoek vertrekpunt…', pinCurrent: true, contextLabel: 'Vertrekpunt' });
    installOne({ selectId: 'plannerTo', inputId: 'plannerToSearch', placeholder: 'Zoek bestemming…', contextLabel: 'Bestemming' });
    installOne({ selectId: 'plannerStopSelect', inputId: 'plannerStopSearch', placeholder: 'Zoek een tussenstop…', contextLabel: 'Tussenstop', stop: true });
  }

  function start() {
    install();
    let attempts = 0;
    const timer = setInterval(() => {
      install();
      attempts += 1;
      if (controls.size === 3 || attempts > 60) clearInterval(timer);
    }, 250);
  }

  document.addEventListener('pointerdown', event => {
    controls.forEach(control => {
      if (!control.shell.contains(event.target)) close(control);
    });
  }, { passive: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.addEventListener('mijnserenity:routechange', () => setTimeout(install, 0));
  window.addEventListener('mijnserenity:modules-ready', () => setTimeout(install, 0), { passive: true });
})();
