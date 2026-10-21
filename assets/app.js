/* DV Social Careers — page behaviour. No framework, no build step. */
(function () {
  'use strict';

  var CFG = window.DV_CONFIG || {};
  var WORDS = ['laugh.', 'screenshot.', 'share it.', 'stop scrolling.'];
  var FAQS = [
    { q: 'Do I need an agency background?', a: "No. We've hired people straight out of college and people who were freelancing from their bedroom. What matters is the work you can show and how fast you learn." },
    { q: 'What should I send along with my resume?', a: 'Your Instagram or LinkedIn profile. If the work you make lives there, that tells us more than any CV.' },
    { q: 'Is the internship paid, and can it turn full-time?', a: "Yes, it's a paid six-month internship, and a full-time seat is on the table at the end if the work holds up. That's how a few of our current full-timers joined." },
    { q: 'Is this remote?', a: 'No — these roles are on-site at our Hyderabad office. Working next to the writers and designers is how the fast turnarounds happen. If you live elsewhere, tell us whether you can relocate.' },
    { q: 'How does hiring work?', a: 'A person reads your application. If it fits, there\'s a short call, then one small task, then a decision in writing. You\'ll hear from us either way — no ghosting, no six-round marathons.' }
  ];
  // Shown under "What we're looking for" when a role doesn't list its own.
  var LOOK_JOB = ['A portfolio of social-first work you made or meaningfully contributed to', 'Speed without dropping craft. Same-day turnarounds are normal here', 'A feel for humour and timing across Hindi and English internet culture', 'Comfort taking feedback and shipping the next version quickly'];
  var LOOK_INTERN = ["Work you can show, even if it's personal or college projects", 'Working knowledge of the core tools for the role', 'Curiosity about trends, memes and what makes people share', 'Availability for a six-month, full-time internship on-site in Hyderabad'];
  var OPEN_ROLE = {
    id: 'R-OPEN', open: true, title: 'Open application', team: 'Any team', level: 'Open',
    blurb: 'No role that fits? Tell us what you make.',
    about: "If none of the listed roles match but you make work that belongs on our pages, apply here. Choose internship or full-time on the right, and we'll read it the same way we read every role-specific application.",
    resp: ['Pick the track that fits you: internship or full-time', 'Share your profile links and resume', "Tell us what you'd bring and which tools you use"],
    looking: LOOK_JOB.slice(0, 3), skills: []
  };
  var ERR = {
    name: 'Enter your full name.', email: 'Enter a valid email address.', phone: 'Include your country code, for example +91.',
    status: 'Choose one option.', profiles: 'Add your Instagram or LinkedIn profile link.', resume: 'Upload your resume.',
    radio: 'Choose Yes or No.', choice: 'Choose one option.', check: 'Please confirm the declaration to submit.',
    answer: 'Please answer this question.'
  };

  var state = {
    roles: [], questions: [], steps: null, emailTypos: {}, maxResumeMb: 5, live: false, openApp: false,
    query: '', level: 'All', location: 'All', team: 'All', faq: 0,
    form: null, // { role, track, step, tried: {}, resume: File|null, idemKey, done, pending }
    completed: {} // roleId → finished form, so reopening a role shows its receipt
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function store(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // ---------------------------------------------------------------- motion
  function startMotion() {
    var i = 0, word = $('#rotWord');
    setInterval(function () {
      i = (i + 1) % WORDS.length;
      var fresh = word.cloneNode(false);
      fresh.textContent = WORDS[i];
      word.parentNode.replaceChild(fresh, word);
      word = fresh;
    }, 2800);

    var reveals = $$('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -6% 0px' });
      reveals.forEach(function (n) { io.observe(n); });
    } else {
      reveals.forEach(function (n) { n.classList.add('in'); });
    }

    var hero = $('#hero'), collage = $('#collage'), a = $('#blobA'), b = $('#blobB');
    if (window.matchMedia('(pointer: fine)').matches) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        collage.style.transform = 'translate3d(' + (x * -20) + 'px,' + (y * -14) + 'px,0)';
        a.style.marginLeft = (x * 44) + 'px';
        b.style.marginLeft = (x * -36) + 'px';
      });
    }
  }

  // ---------------------------------------------------------------- roles
  function loadConfig() {
    renderSkeleton();
    if (!CFG.API_URL) { useConfig({ roles: CFG.FALLBACK_ROLES || [] }, false); return; }
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    fetch(CFG.API_URL + '?action=config', { signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        clearTimeout(timer);
        if (!data || !data.ok || !data.questions) throw new Error('bad config');
        useConfig(data, true);
      })
      .catch(function () {
        clearTimeout(timer);
        useConfig({ roles: CFG.FALLBACK_ROLES || [] }, false);
      });
  }

  function useConfig(data, live) {
    state.live = live;
    state.roles = (data.roles || []).slice();
    state.questions = data.questions || [];
    state.steps = data.steps || null;
    state.emailTypos = data.emailTypos || {};
    // "Pitch yourself" only when the portal says it is open (OPEN_APPLICATIONS = Yes); never on the offline fallback.
    state.openApp = data.openApplication === true;
    if (data.maxResumeMb) state.maxResumeMb = data.maxResumeMb;
    var seats = state.roles.reduce(function (n, r) { return n + (Number(r.openings) || 1); }, 0);
    var locs = uniq('location').slice(1).join(' & ') || 'Hyderabad';
    $('#heroPill').textContent = state.roles.length
      ? state.roles.length + ' open role' + (state.roles.length === 1 ? '' : 's') + ' · ' + seats + ' seat' + (seats === 1 ? '' : 's') + ' · ' + locs + ' · On-site'
      : 'Applications open soon · Hyderabad';
    $$('[data-open-app]').forEach(function (b) { b.hidden = !state.openApp && !b.closest('.topbar'); });
    renderRoles();
    openFromUrl();
  }

  function roleById(id) {
    if (id === OPEN_ROLE.id) return state.openApp ? OPEN_ROLE : null;
    return state.roles.filter(function (r) { return r.id === id; })[0];
  }
  function trackOf(role) { return role.track || (role.level === 'Internship' ? 'intern' : 'job'); }

  function uniq(key) {
    var seen = ['All'];
    state.roles.forEach(function (r) { if (r[key] && seen.indexOf(r[key]) === -1) seen.push(r[key]); });
    return seen;
  }

  function filtered() {
    var q = state.query.trim().toLowerCase();
    return state.roles.filter(function (r) {
      return (state.level === 'All' || r.level === state.level) &&
        (state.location === 'All' || r.location === state.location) &&
        (state.team === 'All' || r.team === state.team) &&
        (!q || [r.title, r.team, r.blurb, (r.skills || []).join(' ')].join(' ').toLowerCase().indexOf(q) !== -1);
    });
  }

  function renderSkeleton() {
    var grid = $('#roleGrid');
    grid.innerHTML = '';
    for (var i = 0; i < 2; i++) grid.appendChild(el('div', { class: 'skeleton', 'aria-hidden': 'true' }));
  }

  function renderFilters() {
    var box = $('#filters');
    box.innerHTML = '';
    [['Type', 'level', ['All', 'Full time', 'Internship']], ['Location', 'location', uniq('location')], ['Team', 'team', uniq('team')]]
      .forEach(function (row) {
        var line = el('div', { class: 'filter-row', role: 'group', 'aria-label': row[0] }, [el('span', { class: 'filter-label', text: row[0] })]);
        row[2].forEach(function (v) {
          line.appendChild(el('button', {
            type: 'button', class: 'chip' + (state[row[1]] === v ? ' on' : ''), 'aria-pressed': String(state[row[1]] === v), text: v,
            onclick: function () { state[row[1]] = v; renderRoles(); }
          }));
        });
        box.appendChild(line);
      });
  }

  function renderRoles() {
    renderFilters();
    var list = filtered(), grid = $('#roleGrid');
    grid.innerHTML = '';
    $('#shownLabel').textContent = list.length + ' of ' + state.roles.length;
    list.forEach(function (r) {
      var intern = r.level === 'Internship';
      grid.appendChild(el('button', { type: 'button', class: 'role-card', 'aria-label': r.title + ', view and apply', onclick: function () { openApply(r); } }, [
        el('div', { class: 'role-top' }, [el('h3', { class: 'role-title', text: r.title }), el('span', { class: 'level-tag' + (intern ? ' intern' : ''), text: r.level })]),
        el('div', { class: 'role-meta' }, [
          el('span', { text: r.team }), el('span', { class: 'dot', text: '·' }), el('span', { text: '◎ ' + r.location }),
          el('span', { class: 'dot', text: '·' }), el('span', { class: 'mode', text: r.workMode || 'On-site' })
        ]),
        el('p', { class: 'role-blurb', text: r.blurb }),
        el('div', { class: 'skills' }, (r.skills || []).map(function (s) { return el('span', { class: 'skill', text: s }); })),
        el('div', { class: 'role-foot' }, [el('span', { class: 'seats', text: (r.openings || 1) + ' seat(s)' + (r.duration && intern ? ' · ' + r.duration : '') }), el('span', { class: 'view-apply', text: 'View & apply →' })])
      ]));
    });
    $('#emptyRoles').hidden = !(state.roles.length && !list.length);
    var err = $('#rolesError');
    err.hidden = state.roles.length > 0;
    if (!state.roles.length) {
      err.innerHTML = '';
      err.appendChild(el('div', { class: 'empty-title', text: 'No open roles right now.' }));
      err.appendChild(el('p', {}, ['New roles open often. Send your work to ', el('a', { href: 'mailto:' + CFG.CAREER_EMAIL, text: CFG.CAREER_EMAIL }), ' and we\'ll keep it on file.']));
    }
  }

  // ---------------------------------------------------------------- the apply window
  var lastFocus = null;

  function openApply(role) {
    lastFocus = document.activeElement;
    var f = state.form;
    var finished = state.completed[role.id];
    if (finished) {
      state.form = finished;
      renderJD(role);
      $('#applyHeading').textContent = role.title;
      renderDone(finished);
      var ov = $('#applyOverlay');
      ov.hidden = false;
      document.body.classList.add('locked');
      return;
    }
    if (!f || f.role.id !== role.id || f.done) {
      state.form = { role: role, track: role.open ? (f && f.role.open ? f.track : 'intern') : trackOf(role), step: 1, tried: {}, resume: null, idemKey: uuid(), done: false };
    }
    renderJD(role);
    $('#applyHeading').textContent = role.title;
    $('#trackToggle').hidden = !role.open;
    paintTrack();
    if (state.live && state.questions.length) {
      buildForm();
      loadDraft();
      showStep(state.form.step);
    } else {
      showOffline(role);
    }
    var o = $('#applyOverlay');
    o.hidden = false;
    o.scrollTop = 0;
    $('#jd').scrollTop = 0;
    document.body.classList.add('locked');
    history.replaceState(null, '', '?role=' + encodeURIComponent(role.id) + location.hash);
    setTimeout(function () { var x = $('#applyOverlay .close-x'); if (x) x.focus(); }, 30);
  }

  function closeApply() {
    if ($('#applyOverlay').hidden) return;
    if (state.form && !state.form.done && state.live) saveDraft();
    $('#applyOverlay').hidden = true;
    document.body.classList.remove('locked');
    history.replaceState(null, '', location.pathname + location.hash);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function renderJD(role) {
    var intern = role.level === 'Internship';
    var tag = $('#jdTag');
    tag.textContent = role.open ? 'Open' : role.level;
    tag.className = 'jd-tag' + (intern ? ' intern' : role.open ? ' open' : '');
    $('#jdTeam').textContent = role.team || '';
    $('#jdTitle').textContent = role.title;
    $('#jdBlurb').textContent = role.blurb || '';
    var facts = role.open
      ? [['Type', 'Internship or full-time'], ['Location', 'Hyderabad office'], ['Languages', 'Hindi and English'], ['Reply', 'Yes or no, in writing']]
      : [['Type', role.level + (intern && role.duration ? ' · ' + role.duration : '')], ['Team', role.team], ['Location', role.location + ' · ' + (role.workMode || 'On-site')],
        ['Experience', role.exp || '—'], ['Openings', (role.openings || 1) + ((role.openings || 1) === 1 ? ' seat' : ' seats')], ['Languages', 'Hindi and English']];
    var box = $('#jdFacts');
    box.innerHTML = '';
    facts.forEach(function (fv) { box.appendChild(el('div', { class: 'jd-fact' }, [el('div', { class: 'jd-fact-k', text: fv[0] }), el('div', { class: 'jd-fact-v', text: fv[1] })])); });
    $('#jdAbout').textContent = role.about || role.blurb || '';
    fillList('#jdResp', '#jdRespWrap', role.resp, 'jd-dash', '');
    var looking = role.looking && role.looking.length ? role.looking : intern ? LOOK_INTERN : LOOK_JOB;
    fillList('#jdLook', '#jdLookWrap', looking, 'jd-check', '✓');
    var tools = $('#jdTools');
    tools.innerHTML = '';
    (role.skills || []).forEach(function (s) { tools.appendChild(el('span', { text: s })); });
    $('#jdToolsWrap').hidden = !(role.skills || []).length;
  }

  function fillList(listSel, wrapSel, items, markClass, mark) {
    var box = $(listSel);
    box.innerHTML = '';
    (items || []).forEach(function (t) {
      box.appendChild(el('div', { class: 'jd-item' }, [el('span', { class: markClass, 'aria-hidden': 'true', text: mark }), el('span', { text: t })]));
    });
    $(wrapSel).hidden = !(items || []).length;
  }

  function paintTrack() {
    $$('#trackToggle button').forEach(function (b) { b.setAttribute('aria-pressed', String(state.form.track === b.getAttribute('data-track'))); });
  }

  function showOffline(role) {
    $('#stepper').hidden = true;
    $('#applyFoot').hidden = true;
    $('#doneView').hidden = true;
    $('#stepFields').innerHTML = '';
    var msg = [el('strong', { text: 'Online applications are opening shortly. ' })];
    if (role.formUrl) msg.push('Apply through ', el('a', { href: role.formUrl, target: '_blank', rel: 'noopener', text: 'this Google Form' }), ', or email ');
    else msg.push('Meanwhile, email your resume and Instagram or LinkedIn profile to ');
    msg.push(el('a', { href: 'mailto:' + CFG.CAREER_EMAIL + '?subject=' + encodeURIComponent('Application: ' + role.title), text: CFG.CAREER_EMAIL }), '.');
    showAlert(msg);
  }

  // ---------------------------------------------------------------- form building
  function questionsFor(track) {
    return state.questions.filter(function (q) { return q.tracks.indexOf(track) !== -1; });
  }
  function stepNames(track) {
    return (state.steps && state.steps[track]) || ['Your details', track === 'intern' ? 'About you' : 'Your experience', 'Final checks'];
  }

  function questionShell(q, num, control, extra) {
    var id = 'f-' + q.key;
    var kids = [el('label', { class: 'q-label', for: q.type === 'radio' || q.type === 'resume' ? null : id, id: id + '-label' },
      [el('span', { class: 'q-num', text: pad2(num) }), el('span', { text: q.label })])];
    if (q.help) kids.push(el('div', { class: 'q-help', id: id + '-help', text: q.help }));
    kids.push(control);
    (extra || []).forEach(function (x) { kids.push(x); });
    kids.push(el('div', { class: 'q-err', id: id + '-err', 'aria-live': 'polite' }));
    return el('div', { class: 'q', 'data-field': q.key }, kids);
  }

  var PLACEHOLDERS = {
    name: 'e.g. Riya Sharma', email: 'you@email.com', phone: '+91 98765 43210',
    profiles: 'instagram.com/yourhandle  linkedin.com/in/you', experienceYears: 'e.g. 1.5'
  };

  function buildQuestion(q, num) {
    var id = 'f-' + q.key, desc = id + '-help ' + id + '-err';
    switch (q.type) {
      case 'select':
        return questionShell(q, num, el('select', { id: id, name: q.key, 'aria-describedby': desc, onchange: function () { applyConditions(); refreshErrors(); } },
          [el('option', { value: '', text: 'Select one' })]
            .concat(q.options.map(function (o) { return el('option', { value: o, text: o }); }))));
      case 'textarea':
        return questionShell(q, num, el('textarea', { id: id, name: q.key, rows: 4, maxlength: q.max, 'aria-describedby': desc }));
      case 'radio': {
        var stack = q.options.some(function (o) { return o.length > 12; });
        var group = el('div', { class: 'opts' + (stack ? ' stack' : ''), role: 'radiogroup', 'aria-labelledby': id + '-label', id: id }, q.options.map(function (o) {
          return el('button', { type: 'button', class: 'opt', role: 'radio', 'aria-checked': 'false', 'data-value': o,
            onclick: function () { pickOption(q.key, o); } }, [el('span', { class: 'opt-dot', 'aria-hidden': 'true' }), el('span', { text: o })]);
        }));
        return questionShell(q, num, group);
      }
      case 'resume':
        return questionShell(q, num, buildResume());
      default: {
        var attrs = { id: id, name: q.key, 'aria-describedby': desc, placeholder: PLACEHOLDERS[q.key] || '' };
        if (q.type === 'email') { attrs.type = 'email'; attrs.autocomplete = 'email'; }
        else if (q.type === 'tel') { attrs.type = 'tel'; attrs.autocomplete = 'tel'; }
        else { attrs.type = 'text'; if (q.key === 'name') attrs.autocomplete = 'name'; }
        if (q.type === 'years') attrs.inputmode = 'decimal';
        if (q.type === 'ctc') attrs.inputmode = 'text';
        if (q.type === 'profiles') { attrs.inputmode = 'url'; attrs.autocapitalize = 'off'; attrs.spellcheck = 'false'; }
        if (q.max) attrs.maxlength = q.max;
        return questionShell(q, num, el('input', attrs));
      }
    }
  }

  function buildConsent(q) {
    return el('div', { class: 'consent q', 'data-field': q.key }, [
      el('div', { class: 'consent-title', text: q.group || 'Declaration and consent' }),
      el('label', { class: 'consent-row' }, [
        el('input', { type: 'checkbox', id: 'f-' + q.key, name: q.key, 'aria-describedby': 'f-' + q.key + '-err' }),
        el('span', { class: 'consent-box', 'aria-hidden': 'true' }),
        el('span', { class: 'consent-text', text: q.label })
      ]),
      el('div', { class: 'q-err', id: 'f-' + q.key + '-err', 'aria-live': 'polite' })
    ]);
  }

  function buildResume() {
    var input = el('input', { type: 'file', id: 'f-resume', class: 'sr-only', accept: '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'aria-describedby': 'f-resume-help f-resume-err' });
    var drop = el('label', { class: 'drop', for: 'f-resume', id: 'resumeDrop' }, [
      el('span', { class: 'drop-ic', 'aria-hidden': 'true', text: '↑' }),
      el('span', { class: 'drop-main' }, [el('span', { class: 'drop-btn', text: 'Upload your resume' }), ' or drag and drop it here.']),
      el('span', { class: 'drop-meta', text: 'PDF or DOCX · Maximum ' + state.maxResumeMb + ' MB' })
    ]);
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { pickResume(e.dataTransfer.files && e.dataTransfer.files[0]); });
    input.addEventListener('change', function () { pickResume(input.files && input.files[0]); input.value = ''; });
    var card = el('div', { class: 'file-card', id: 'resumeCard', hidden: true }, [
      el('span', { class: 'file-ext', id: 'resumeExt' }),
      el('div', { class: 'file-info' }, [el('div', { class: 'file-name', id: 'resumeName' }), el('div', { class: 'file-meta', id: 'resumeMeta' })]),
      el('button', { type: 'button', class: 'pill-btn', text: 'Replace', onclick: function () { input.click(); } }),
      el('button', { type: 'button', class: 'pill-btn', text: 'Remove', onclick: function () { state.form.resume = null; paintResume(); refreshErrors(); } })
    ]);
    return el('div', {}, [input, drop, card]);
  }

  function pickResume(file) {
    if (!file) return;
    var f = state.form;
    f.resumeError = '';
    if (!/\.(pdf|docx)$/i.test(file.name)) f.resumeError = 'Upload a PDF or DOCX file.';
    else if (file.size > state.maxResumeMb * 1024 * 1024) f.resumeError = 'That file is over ' + state.maxResumeMb + ' MB. Upload a smaller version.';
    else f.resume = file;
    if (f.resumeError) f.resume = null;
    paintResume();
    setError('resume', f.resumeError || (f.tried[1] && !f.resume ? ERR.resume : ''));
  }

  function paintResume() {
    var file = state.form && state.form.resume;
    if (!$('#resumeDrop')) return;
    $('#resumeDrop').hidden = !!file;
    $('#resumeCard').hidden = !file;
    if (file) {
      $('#resumeExt').textContent = file.name.split('.').pop().toUpperCase();
      $('#resumeName').textContent = file.name;
      $('#resumeMeta').textContent = (file.size > 1048576 ? (file.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(file.size / 1024)) + ' KB') + ' · ready to upload';
    }
  }

  function pickOption(key, value) {
    $$('#f-' + key + ' .opt').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-value') === value)); });
    applyConditions();
    refreshErrors();
  }

  /** Whether a question applies, by its `when` rule (the server applies the same rule). */
  function applies(q) {
    if (!q.when) return true;
    var dep = state.questions.filter(function (x) { return x.key === q.when.key; })[0];
    return !!dep && q.when.is.indexOf(readValue(dep)) !== -1;
  }
  /** Shows only the questions that apply to the answers so far. */
  function applyConditions() {
    if (!state.form) return;
    questionsFor(state.form.track).forEach(function (q) {
      if (!q.when) return;
      var n = $('[data-field="' + q.key + '"]');
      if (n) n.hidden = !applies(q);
    });
    // Number only what's shown, page by page.
    $$('.step-pane').forEach(function (pane) {
      var i = 0;
      $$('.q:not(.consent)', pane).forEach(function (q) {
        if (q.hidden) return;
        var num = $('.q-num', q);
        if (num) num.textContent = pad2(++i);
      });
    });
  }

  function buildForm() {
    var f = state.form, qs = questionsFor(f.track), names = stepNames(f.track);
    var stepper = $('#stepper');
    stepper.innerHTML = '';
    stepper.hidden = false;
    names.forEach(function (name, i) { stepper.appendChild(el('li', { 'data-step': i + 1, text: (i + 1) + '. ' + name })); });

    var box = $('#stepFields');
    box.innerHTML = '';
    [1, 2, 3].forEach(function (step) {
      var pane = el('div', { class: 'step-pane', 'data-pane': step }, [
        el('div', {}, [el('div', { class: 'page-kicker', text: 'Page ' + step + ' of 3' }), el('div', { class: 'page-title', text: names[step - 1] })])
      ]);
      var list = qs.filter(function (q) { return q.step === step; });
      var num = 0;
      for (var i = 0; i < list.length; i++) {
        var q = list[i];
        if (q.type === 'check') { pane.appendChild(buildConsent(q)); continue; }
        num += 1;
        var pairs = { currentCtc: 'expectedCtc', experienceYears: 'experienceMonths' };
        if (pairs[q.key] && list[i + 1] && list[i + 1].key === pairs[q.key]) {
          pane.appendChild(el('div', { class: 'q-pair' }, [buildQuestion(q, num), buildQuestion(list[i + 1], num + 1)]));
          num += 1;
          i += 1;
          continue;
        }
        pane.appendChild(buildQuestion(q, num));
      }
      box.appendChild(pane);
    });
    showAlert('');
    $('#doneView').hidden = true;
    $('#applyFoot').hidden = false;
    paintResume();
    applyConditions();
  }

  function showStep(step) {
    var f = state.form;
    f.step = step;
    $$('.step-pane').forEach(function (p) { p.hidden = Number(p.getAttribute('data-pane')) !== step; });
    $$('#stepper li').forEach(function (li) {
      var n = Number(li.getAttribute('data-step'));
      li.className = n < step ? 'is-done' : n === step ? 'is-on' : '';
      if (n === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('#backBtn').hidden = step === 1;
    $('#navNote').textContent = 'Step ' + step + ' of 3';
    var next = $('#nextBtn');
    // The button is shared by every form, so its state always comes from the form on screen.
    next.disabled = !!state.form.pending;
    next.textContent = state.form.pending ? 'Submitting…' : step === 3 ? 'Submit application' : 'Continue →';
    next.classList.toggle('submit', step === 3);
    $('#applyForm').scrollTop = 0;
    $('#applyOverlay').scrollTop = window.matchMedia('(max-width: 939px)').matches ? $('.apply-pane').offsetTop : 0;
    refreshErrors();
  }

  // ---------------------------------------------------------------- values & validation
  function readValue(q) {
    if (q.type === 'radio') { var on = $('#f-' + q.key + ' .opt[aria-checked="true"]'); return on ? on.getAttribute('data-value') : ''; }
    if (q.type === 'check') return !!($('#f-' + q.key) || {}).checked;
    if (q.type === 'resume') return state.form.resume;
    var node = $('#f-' + q.key);
    return node ? node.value.trim() : '';
  }

  /** Instagram and/or LinkedIn in one box: the same rule as the server (one of each at most). */
  function checkProfiles(v) {
    var tokens = String(v || '').split(/[\s,;|]+/).map(function (t) { return t.replace(/^[(<"']+|[)>"']+$/g, '').replace(/[.,]$/, ''); })
      .filter(function (t) { return t && !/^(and|or|&|\+|\/|-|ig|insta|instagram|linkedin|profile|profiles|link|links|my|is|here)[:.]?$/i.test(t); });
    if (!tokens.length) return ERR.profiles;
    var seen = { instagram: 0, linkedin: 0 };
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (/linkedin\.com\/in\/[A-Za-z0-9\-_%]{3,100}/i.test(t)) seen.linkedin++;
      else if (/^@[A-Za-z0-9._]{1,30}$/.test(t) || /instagram\.com\/(?!p\/|reels?\/|explore|stories)[A-Za-z0-9._]{1,30}/i.test(t) ||
        (/^[A-Za-z0-9._]{1,30}$/.test(t) && /\./.test(t) && !/\.(com|in|net|org)$/i.test(t))) seen.instagram++;
      else return 'Paste your full profile link, e.g. instagram.com/yourhandle or linkedin.com/in/you.';
    }
    return seen.instagram > 1 || seen.linkedin > 1 ? 'Paste one Instagram link, one LinkedIn link, or one of each.' : '';
  }

  function checkQuestion(q, v) {
    switch (q.type) {
      case 'text':
      case 'textarea':
        return q.required && !v ? (q.key === 'name' ? ERR.name : ERR.answer) : '';
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return ERR.email;
        var dom = v.toLowerCase().split('@')[1];
        return state.emailTypos[dom] ? 'Did you mean ' + v.split('@')[0] + '@' + state.emailTypos[dom] + '?' : '';
      case 'tel':
        return /^\+/.test(v) && v.replace(/\D/g, '').length >= 10 ? '' : ERR.phone;
      case 'select':
        return v ? '' : ERR.status;
      case 'profiles':
        return checkProfiles(v);
      case 'resume':
        return v ? '' : state.form.resumeError || ERR.resume;
      case 'radio':
        if (v) return '';
        return q.options.length === 2 ? ERR.radio : ERR.choice;
      case 'check':
        return v ? '' : ERR.check;
      case 'years': {
        var n = /^(\d{0,2}([.,]\d{1,2})?)\s*(years?|yrs?)?$/i.test(v) && /\d/.test(v) ? Number(v.replace(',', '.').replace(/[^\d.]/g, '')) : NaN;
        return !isNaN(n) && n >= 0 && n <= 50 ? '' : 'Enter your total work experience in years, for example 1.5.';
      }
      case 'ctc':
        if (!v) return ERR.answer;
        if (/\d/.test(v)) return '';
        if (q.key === 'currentCtc' && /^(n\/?a|not applicable)\.?$/i.test(v)) return '';
        if (q.key === 'expectedCtc' && /^open to discussion\.?$/i.test(v)) return '';
        return q.help;
      default:
        return q.required && !v ? ERR.answer : '';
    }
  }

  function stepErrors(step) {
    var errors = {};
    questionsFor(state.form.track).forEach(function (q) {
      if (q.step !== step || !applies(q)) return;
      var msg = checkQuestion(q, readValue(q));
      if (msg) errors[q.key] = msg;
    });
    return errors;
  }

  /** Errors show once someone has tried to continue from a page, then update as they type. */
  function refreshErrors() {
    var f = state.form;
    if (!f || !f.tried[f.step]) {
      if (f && f.resumeError) setError('resume', f.resumeError);
      return {};
    }
    var errors = stepErrors(f.step);
    $$('.step-pane[data-pane="' + f.step + '"] [data-field]').forEach(function (n) {
      var k = n.getAttribute('data-field');
      setError(k, errors[k]);
    });
    return errors;
  }

  function setError(field, msg) {
    var n = $('[data-field="' + field + '"]');
    if (!n) return;
    n.classList.toggle('bad', !!msg);
    var e = $('#f-' + field + '-err');
    if (e) e.textContent = msg || '';
  }

  function showAlert(content) {
    var box = $('#formAlert');
    box.innerHTML = '';
    if (!content || (Array.isArray(content) && !content.length)) { box.hidden = true; return; }
    (Array.isArray(content) ? content : [content]).forEach(function (c) { box.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    box.hidden = false;
  }

  function focusFirstError() {
    var bad = $('.step-pane:not([hidden]) .bad');
    if (!bad) return;
    bad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    var c = bad.querySelector('input:not([type=file]), select, textarea, .opt');
    if (c) c.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- drafts (never the resume or the declaration)
  function draftKey(f) { f = f || state.form; return 'dv-apply-' + f.role.id + '-' + f.track; }
  function saveDraft() {
    var f = state.form, data = { step: f.step, values: {} };
    questionsFor(f.track).forEach(function (q) {
      if (q.type !== 'resume' && q.type !== 'check') data.values[q.key] = readValue(q);
    });
    store(function (ls) { ls.setItem(draftKey(), JSON.stringify(data)); });
  }
  function loadDraft() {
    var raw = store(function (ls) { return ls.getItem(draftKey()); });
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    questionsFor(state.form.track).forEach(function (q) {
      var v = data.values && data.values[q.key];
      if (v === undefined || v === '') return;
      if (q.type === 'radio') pickOption(q.key, v);
      else if ($('#f-' + q.key)) $('#f-' + q.key).value = v;
    });
    applyConditions();
    state.form.step = Math.min(Number(data.step) || 1, 3);
  }
  function clearDraft(f) { store(function (ls) { ls.removeItem(draftKey(f)); }); }

  // ---------------------------------------------------------------- submit
  function readResume(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1]); };
      r.onerror = function () { reject(new Error('read')); };
      r.readAsDataURL(file);
    });
  }

  function onNext(ev) {
    ev.preventDefault();
    var f = state.form;
    if (!f || f.done || f.pending || !state.live) return;
    f.tried[f.step] = true;
    var errors = refreshErrors();
    if (Object.keys(errors).length) { showAlert(''); focusFirstError(); return; }
    saveDraft();
    showAlert('');
    if (f.step < 3) { showStep(f.step + 1); return; }
    submit();
  }

  /**
   * Sends the application. Everything about the reply is tied to this form object `f`: if the
   * person closes the window or opens another role while it's in flight, the reply still completes
   * (or fails) this form only, and never touches whichever form is on screen now.
   */
  function submit(retried) {
    var f = state.form;
    if (f.pending) return;
    var payload = { roleId: f.role.id, idempotencyKey: f.idemKey, website: $('#f-website').value };
    if (f.role.open) payload.track = f.track;
    questionsFor(f.track).forEach(function (q) { if (q.type !== 'resume') payload[q.key] = applies(q) ? readValue(q) : ''; });
    var isCurrent = function () { return state.form === f && !$('#applyOverlay').hidden; };
    f.pending = true;
    $('#trackToggle').classList.add('locked');
    var btn = $('#nextBtn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    readResume(f.resume)
      .then(function (data) {
        payload.resume = { name: f.resume.name, type: f.resume.type, data: data };
        // text/plain keeps this a "simple" request, which Apps Script can answer without a CORS preflight.
        return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'apply', application: payload }) });
      })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        f.pending = false;
        if (res && res.ok) {
          f.done = true;
          f.result = { payload: payload, res: res };
          clearDraft(f);
          state.completed[f.role.id] = f;
          if (isCurrent()) renderDone(f);
          return;
        }
        if (res && res.code === 'CONFLICT' && !retried) {
          // The answers changed after an earlier attempt reached us: send them as a fresh submission.
          f.idemKey = uuid();
          if (isCurrent()) { submit(true); return; }
        }
        if (!isCurrent()) return;
        var errs = (res && res.errors) || {};
        var keys = Object.keys(errs);
        if (keys.length) {
          var steps = keys.map(function (k) {
            var q = state.questions.filter(function (x) { return x.key === k; })[0];
            return q ? q.step : 3;
          });
          showStep(Math.min.apply(null, steps));
          keys.forEach(function (k) { setError(k, errs[k]); });
          focusFirstError();
        }
        showAlert((res && res.message) || 'Something went wrong. Please try again.');
      })
      .catch(function () {
        f.pending = false;
        if (!isCurrent()) return;
        showAlert(['We couldn\'t reach our server. Check your connection and submit again — it won\'t create a duplicate. Still stuck? Email ',
          el('a', { href: 'mailto:' + CFG.CAREER_EMAIL, text: CFG.CAREER_EMAIL }), '.']);
      })
      .then(function () {
        if (f.pending) return;
        if (state.form === f) $('#trackToggle').classList.remove('locked');
        if (isCurrent() && !f.done) {
          btn.disabled = false;
          if (f.step === 3) btn.textContent = 'Submit application';
        }
      });
  }

  function renderDone(f) {
    var payload = f.result.payload, res = f.result.res;
    var first = String(payload.name).trim().split(' ')[0] || 'there';
    var copy = $('#doneCopy');
    copy.innerHTML = '';
    $('#doneTitle').textContent = res.closed ? 'Thanks for applying.' : 'Application received.';
    if (res.closed) {
      var needs = (res.closedReasons || []).join('; ');
      copy.appendChild(document.createTextNode('Thanks, ' + first + '. This internship needs ' + (needs || 'a "Yes" to each final check') +
        ', so we can\'t take your application for '));
      copy.appendChild(el('strong', { text: f.role.title }));
      copy.appendChild(document.createTextNode(' forward. If that changes, you\'re welcome to apply again.'));
    } else {
      copy.appendChild(document.createTextNode('Thanks, ' + first + '. Your application for '));
      copy.appendChild(el('strong', { text: f.role.title }));
      copy.appendChild(document.createTextNode(res.confirmEmail ? ' is in. We\'ll be in touch either way.' : ' is in.'));
    }
    var ref = $('#doneRef');
    ref.innerHTML = '';
    ref.hidden = !res.refCode;
    if (res.refCode) { ref.appendChild(document.createTextNode('Reference ')); ref.appendChild(el('b', { text: res.refCode })); }
    $('#doneNote').textContent = res.confirmEmail
      ? 'We\'ve emailed ' + payload.email + '. If it has a “Confirm my email” button, tap it so we can move your application forward.'
      : '';
    $('#stepFields').innerHTML = '';
    $('#stepper').hidden = true;
    $('#trackToggle').hidden = true;
    $('#applyFoot').hidden = true;
    showAlert('');
    $('#doneView').hidden = false;
    $('#applyForm').scrollTop = 0;
    $('#doneView .btn-dark').focus();
  }

  function openFromUrl() {
    var id = new URLSearchParams(location.search).get('role');
    var role = id && roleById(id);
    if (role) openApply(role);
  }

  // ---------------------------------------------------------------- FAQ
  function renderFaqs() {
    var box = $('#faqs');
    box.innerHTML = '';
    FAQS.forEach(function (f, i) {
      var open = state.faq === i;
      var id = 'faq-a-' + i;
      box.appendChild(el('div', { class: 'faq' + (open ? ' open' : '') }, [
        el('button', { type: 'button', class: 'faq-q', 'aria-expanded': String(open), 'aria-controls': id, onclick: function () { state.faq = state.faq === i ? -1 : i; renderFaqs(); } },
          [el('span', { text: f.q }), el('span', { class: 'faq-icon', 'aria-hidden': 'true', text: '+' })]),
        el('div', { class: 'faq-a', id: id, role: 'region' }, [el('p', { text: f.a })])
      ]));
    });
  }

  // ---------------------------------------------------------------- wire up
  document.addEventListener('click', function (e) {
    var roleBtn = e.target.closest('[data-role]');
    if (roleBtn) { var r = roleById(roleBtn.getAttribute('data-role')); if (r) openApply(r); else location.hash = '#roles'; return; }
    if (e.target.closest('[data-open-app]')) {
      if (state.openApp) openApply(OPEN_ROLE); else location.hash = '#roles';
      return;
    }
    if (e.target.closest('[data-close]')) { closeApply(); return; }
    if (e.target.id === 'applyOverlay') closeApply();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeApply(); });
  $('#trackToggle').addEventListener('click', function (e) {
    var b = e.target.closest('[data-track]');
    if (!b || !state.form || state.form.pending || state.form.done || b.getAttribute('data-track') === state.form.track) return;
    if (state.live) saveDraft();
    state.form.track = b.getAttribute('data-track');
    state.form.step = 1;
    state.form.tried = {};
    var keep = state.form.resume;
    paintTrack();
    if (state.live && state.questions.length) {
      buildForm();
      loadDraft();
      state.form.resume = keep;
      paintResume();
      showStep(1);
    }
  });
  $('#roleSearch').addEventListener('input', function (e) { state.query = e.target.value; renderRoles(); });
  $('#applyForm').addEventListener('submit', onNext);
  $('#backBtn').addEventListener('click', function () {
    if (state.form && state.form.step > 1) { saveDraft(); showAlert(''); showStep(state.form.step - 1); }
  });
  ['input', 'change'].forEach(function (ev) {
    $('#applyForm').addEventListener(ev, function (e) { if (e.target.closest('[data-field]')) refreshErrors(); });
  });

  renderFaqs();
  startMotion();
  // "Pitch yourself" stays hidden until the portal says it is open (the top "Apply now" just goes to the roles).
  $$('[data-open-app]').forEach(function (b) { b.hidden = !b.closest('.topbar'); });
  loadConfig();
})();
