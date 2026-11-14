/*
 * QuickNode documentation: progressive enhancement only, adapted from the
 * personal site's site.js (github.com/DaksonC/DaksonC.github.io). Every page
 * is complete without JavaScript; this adds the [FX] and theme switches, the
 * small-screen [MENU], the back-to-top link and an optional terminal that
 * simulates the CLI with data generated from it (qn-data.js).
 * Rules (ADR-001): no third-party code, no innerHTML, no eval; visitor input
 * is only ever text, matched against fixed lists.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const lang = root.lang.startsWith('pt') ? 'pt' : 'en';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const DATA = window.QN_DATA;

  const STRINGS = {
    en: {
      help: [
        'Simulated QuickNode CLI: nothing runs or is written in your browser.',
        '  qn --help                  general help',
        '  qn help <command>          help for create or ui',
        '  qn create <name> [-ts|-js] [--dry-run]',
        '  qn ui [topic]              go to a page (alias: qn docs)',
        '  qn --version',
        'Page: theme light|dark, fx on|off, lang en|pt, clear'
      ].join('\n'),
      simulated: '(simulated: nothing was written)',
      opening: (url) => `Opening ${url}`,
      fx: (state) => `Visual effects ${state}.`,
      theme: (t) => `${t === 'light' ? 'Light' : 'Dark'} theme on.`,
      themeHint: (next) => ` switch to ${next} theme`,
      usage: (syntax) => `Usage: ${syntax}`,
      soon: 'qn add is coming soon. See the planned recipes:',
      unknown: (cmd) => `Bad command or file name: ${cmd}. Type help.`
    },
    pt: {
      help: [
        'QuickNode CLI simulado: nada roda nem é gravado no seu navegador.',
        '  qn --help                  ajuda geral',
        '  qn help <comando>          ajuda do create ou do ui',
        '  qn create <nome> [-ts|-js] [--dry-run]',
        '  qn ui [tópico]             vai para uma página (apelido: qn docs)',
        '  qn --version',
        'Página: theme light|dark, fx on|off, lang en|pt, clear'
      ].join('\n'),
      simulated: '(simulação: nada foi gravado)',
      opening: (url) => `Abrindo ${url}`,
      fx: (state) => `Efeitos visuais ${state === 'on' ? 'ligados' : 'desligados'}.`,
      theme: (t) => `Tema ${t === 'light' ? 'claro' : 'escuro'} ativado.`,
      themeHint: (next) => ` mudar para o tema ${next === 'light' ? 'claro' : 'escuro'}`,
      usage: (syntax) => `Uso: ${syntax}`,
      soon: 'O qn add vem em breve. Veja as receitas planejadas:',
      unknown: (cmd) => `Comando ou nome de arquivo inválido: ${cmd}. Digite help.`
    }
  }[lang];

  /* localStorage can throw (private mode, blocked storage): never let it break the page. */
  const store = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
    }
  };

  function onMediaChange(query, listener) {
    if (query.addEventListener) query.addEventListener('change', listener);
    else query.addListener(listener);
  }

  /** Short message for screen readers, through the role="status" region in the header. */
  const announce = (text) => { document.getElementById('status').textContent = text; };

  /* ---------- [FX: ON/OFF] (same storage key as the personal site, same origin) ---------- */

  let fx = store.get('fx') === 'off' ? 'off' : 'on';
  const motionAllowed = () => fx === 'on' && !reducedMotion.matches;

  function setFx(value, remember) {
    fx = value;
    if (remember) store.set('fx', value);
    root.classList.toggle('fx', fx === 'on');
    root.classList.toggle('motion', motionAllowed());
    document.getElementById('fx-state').textContent = fx.toUpperCase();
  }

  /* ---------- [LIGHT] / [DARK] (the saved choice is applied before first paint by theme.js) ---------- */

  const THEME_COLOR = { dark: '#000000', light: '#f4f1e6' };
  let theme = root.dataset.theme === 'light' ? 'light' : 'dark';

  function setTheme(value, remember) {
    theme = value;
    if (theme === 'light') root.dataset.theme = 'light';
    else delete root.dataset.theme;
    if (remember) store.set('theme', theme);
    const next = theme === 'light' ? 'dark' : 'light';
    document.getElementById('theme-state').textContent = next.toUpperCase();
    document.getElementById('theme-hint').textContent = STRINGS.themeHint(next);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', THEME_COLOR[theme]);
  }

  /* ---------- Simulated CLI ---------- */

  /** Site root, from the favicon link (works at any depth and on the 404 page). */
  const siteRoot = () => document.querySelector('link[rel="icon"]').href.replace(/assets\/img\/favicon\.svg$/, '');

  /** Same rules as the CLI's projectNameError, minus the Node core module list. */
  function nameError(name) {
    if (name.length > 214) return 'name cannot be longer than 214 characters';
    if (/[/\\]/.test(name)) return 'name cannot contain path separators';
    if (name.includes('..')) return 'name cannot contain ".."';
    if (name.startsWith('.') || name.startsWith('_')) return 'name cannot start with "." or "_"';
    if (name.toLowerCase() !== name) return 'name must be lowercase';
    if (!/^[a-z0-9-][a-z0-9-._]*$/.test(name)) return 'name can only contain lowercase letters, digits, "-", "." and "_"';
    if (name === 'node_modules' || name === 'favicon.ico') return `"${name}" is a reserved name`;
    return undefined;
  }

  const CREATE_FLAGS = {
    '-t': 'typescript', '-ts': 'typescript', '--typescript': 'typescript',
    '-j': 'javascript', '-js': 'javascript', '--javascript': 'javascript',
    '-y': 'yes', '--yes': 'yes', '-f': 'force', '--force': 'force', '--dry-run': 'dry-run',
    '--install': 'install', '--git': 'git', '--no-credits': 'no-credits'
  };

  const commandName = (name) =>
    Object.keys(DATA.commands).find((cmd) => cmd === name || DATA.commands[cmd].aliases.includes(name));

  function simulateCreate(args) {
    const flags = new Set();
    const names = [];
    for (const arg of args) {
      if (arg === '-h' || arg === '--help') return DATA.commands.create.help;
      if (arg.startsWith('-')) {
        if (!CREATE_FLAGS[arg]) return `✖ Unknown option '${arg}'.\nRun "qn create --help" for usage.`;
        flags.add(CREATE_FLAGS[arg]);
      } else names.push(arg);
    }
    if (names.length > 1) return '✖ Only one project name can be given.\nRun "qn create --help" for usage.';
    if (flags.has('typescript') && flags.has('javascript')) {
      return '✖ Choose only one template: --typescript or --javascript.\nRun "qn create --help" for usage.';
    }
    const name = names[0] ?? (flags.has('yes') ? 'my-quicknode-app' : undefined);
    if (!name) return '✖ A project name is required (or pass --yes to use the default).\nRun "qn create --help" for usage.';
    if (name === '.') return '✖ "." creates the project in the current folder: try it in your terminal.';
    const reason = nameError(name);
    if (reason) return `✖ Invalid project name "${name}": ${reason}.`;
    const template = flags.has('javascript') ? 'javascript' : flags.has('typescript') || flags.has('yes') ? 'typescript' : undefined;
    if (!template) return '✖ Choose a template with --typescript or --javascript (or pass --yes).\nRun "qn create --help" for usage.';
    return `${DATA.dryRun[template].split('NAME').join(name)}\n${STRINGS.simulated}`;
  }

  function simulateUi(args) {
    let topic;
    let target = lang;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '-h' || arg === '--help') return { text: DATA.commands.ui.help };
      if (arg === '-p' || arg === '--print') continue;
      if (arg === '--lang') {
        target = args[++i];
        if (target !== 'en' && target !== 'pt') return { text: `✖ Invalid value "${target ?? ''}" for --lang. Choose one of: en, pt.` };
      } else if (Object.hasOwn(DATA.topics, arg) && topic === undefined) topic = arg;
      else return { text: `✖ Unknown topic "${arg}". Choose one of: ${Object.keys(DATA.topics).join(', ')}.` };
    }
    const url = `${siteRoot()}${target === 'pt' ? 'pt/' : ''}${topic ? DATA.topics[topic] : ''}`;
    return { text: STRINGS.opening(url), url };
  }

  /** Runs one simulated `qn` invocation; returns the text to print and, for qn ui, where to go. */
  function simulateQn(args) {
    const [first, ...rest] = args;
    if (first === undefined || first === '--help' || first === '-h') return { text: DATA.help };
    if (first === '--version' || first === '-v') return { text: DATA.version };
    if (first === 'help') {
      if (rest.length === 0) return { text: DATA.help };
      const cmd = commandName(rest[0]);
      return { text: cmd ? DATA.commands[cmd].help : `✖ Unknown command "${rest[0]}".\nRun "qn --help" for usage.` };
    }
    if (first === 'add') return { text: STRINGS.soon, url: `${siteRoot()}${lang === 'pt' ? 'pt/' : ''}${DATA.topics.add}`, wait: true };
    const cmd = commandName(first);
    if (cmd === 'create') return { text: simulateCreate(rest) };
    if (cmd === 'ui') return simulateUi(rest);
    return { text: `✖ Unknown command "${first}".\nRun "qn --help" for usage.` };
  }

  function cli() {
    if (!DATA) return; // qn-data.js failed to load: the page stays as it is
    const form = document.getElementById('cli');
    const input = document.getElementById('cli-input');
    const output = document.getElementById('cli-output');
    const MAX_BLOCKS = 6;

    function print(text, echo = false) {
      const pre = document.createElement('pre');
      pre.textContent = text;
      if (echo) pre.setAttribute('aria-hidden', 'true');
      output.append(pre);
      while (output.childElementCount > MAX_BLOCKS * 2) output.firstElementChild.remove();
    }

    function run(raw) {
      const line = raw.trim();
      const words = line.split(/\s+/);
      if (!line) return;
      print(`C:\\QUICKNODE> ${line}`, true);
      const [cmd, arg] = [words[0].toLowerCase(), (words[1] || '').toLowerCase()];

      // "npx @10565/quicknode-cli ..." behaves like "qn ...".
      if (cmd === 'npx' && /^@10565\/quicknode-cli(@[\w.-]+)?$/.test(words[1] || '')) words.splice(0, 2, 'qn');
      if (words[0] === 'qn') {
        const result = simulateQn(words.slice(1));
        print(result.text);
        if (result.url) {
          const go = () => window.location.assign(result.url);
          if (result.wait) {
            const link = document.createElement('a');
            link.href = result.url;
            link.textContent = result.url;
            output.lastElementChild.append('\n', link);
          } else window.setTimeout(go, motionAllowed() ? 400 : 0);
        }
      } else if (cmd === 'help' || cmd === '?') print(STRINGS.help);
      else if (cmd === 'clear' || cmd === 'cls') output.replaceChildren();
      else if (cmd === 'fx' && (arg === 'on' || arg === 'off')) { setFx(arg, true); print(STRINGS.fx(arg)); }
      else if (cmd === 'fx') print(STRINGS.usage('fx on|off'));
      else if (cmd === 'theme' && (arg === 'light' || arg === 'dark')) { setTheme(arg, true); print(STRINGS.theme(arg)); }
      else if (cmd === 'theme') print(STRINGS.usage('theme light|dark'));
      else if (cmd === 'lang' && (arg === 'en' || arg === 'pt')) {
        window.location.href = document.querySelector(`.lang a[hreflang^="${arg}"]`).href;
      } else if (cmd === 'lang') print(STRINGS.usage('lang en|pt'));
      else print(STRINGS.unknown(words[0]));
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      run(input.value);
      input.value = '';
    });
    document.getElementById('cli-wrap').hidden = false;
  }

  /* ---------- Header [MENU] on small screens ---------- */

  function headerMenu() {
    const button = document.getElementById('menu-toggle');
    const panel = document.getElementById('header-panel');
    const isOpen = () => button.getAttribute('aria-expanded') === 'true';
    const setOpen = (open) => {
      button.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('open', open);
    };

    button.addEventListener('click', () => setOpen(!isOpen()));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        button.focus();
      }
    });
    onMediaChange(window.matchMedia('(max-width: 40rem)'), () => setOpen(false));
    root.classList.add('has-menu');
  }

  /* ---------- Back to top: shown only once the header has scrolled out of view ---------- */

  function backToTop() {
    const link = document.getElementById('to-top');
    if (!('IntersectionObserver' in window)) return;
    link.classList.add('is-off');
    new IntersectionObserver(([entry]) => {
      link.classList.toggle('is-off', entry.isIntersecting);
      window.requestAnimationFrame(() => link.classList.add('ready'));
    }).observe(document.querySelector('header'));
  }

  /* ---------- Init ---------- */

  const fxButton = document.getElementById('fx-toggle');
  fxButton.addEventListener('click', () => {
    setFx(fx === 'on' ? 'off' : 'on', true);
    announce(STRINGS.fx(fx));
  });
  fxButton.hidden = false;

  const themeButton = document.getElementById('theme-toggle');
  themeButton.addEventListener('click', () => {
    setTheme(theme === 'light' ? 'dark' : 'light', true);
    announce(STRINGS.theme(theme));
  });
  themeButton.hidden = false;
  setTheme(theme, false);
  onMediaChange(reducedMotion, () => setFx(fx, false));
  setFx(fx, false);
  cli();
  headerMenu();
  backToTop();
})();
