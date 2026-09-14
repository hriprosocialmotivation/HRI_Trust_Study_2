/* =========================================================================
   APP.js - state machine driving the study.
   Screens: welcome -> consent -> demographics -> [context video ->
   (trial video + survey together) x N] for each setting -> complete
   ========================================================================= */

const root = document.getElementById('app');

let state = freshState();

function freshState() {
  return {
    participantId: 'P-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    startedAt: new Date().toISOString(),
    screen: 'welcome',
    demographics: null,
    sequence: null,          // built after demographics
    cursor: 0,               // index into sequence - the participant's real forward position
    reviewingStepIndex: null, // if set, temporarily viewing/editing an earlier trial
    responses: [],            // one entry per completed trial
    totalItemsAll: 0,         // total questionnaire items across the whole sequence, for progress %
    finalAnswers: null        // answers to the FINAL_QUESTIONS page (set once, after the last trial)
  };
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds the fully counterbalanced sequence for one participant: random
// setting order, and within each setting, an independently randomized
// order for Study 1's three conditions and Study 2's two.
function buildSequence() {
  const settingOrder = shuffle(SETTINGS);
  const seq = [];
  settingOrder.forEach(setting => {
    seq.push({ type: 'context', setting });
    shuffle(STUDY1_CONDITIONS).forEach(cond => {
      seq.push({ type: 'trial', study: 1, setting, condition: cond });
    });
    shuffle(STUDY2_CONDITIONS).forEach(cond => {
      seq.push({ type: 'trial', study: 2, setting, condition: cond });
    });
  });
  return seq;
}

function totalTrials() {
  return state.sequence ? state.sequence.filter(s => s.type === 'trial').length : 0;
}
function trialNumberAt(index) {
  if (!state.sequence) return 0;
  return state.sequence.slice(0, index + 1).filter(s => s.type === 'trial').length;
}
function findPreviousTrialIndex(fromIndex) {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (state.sequence[i].type === 'trial') return i;
  }
  return null;
}
function computeTotalItemsAll() {
  return state.sequence
    .filter(s => s.type === 'trial')
    .reduce((sum, s) => sum + itemIdsForStudy(s.study).length, 0);
}

/* ---------------------------- render router ---------------------------- */

function render() {
  root.innerHTML = '';
  if (state.screen === 'welcome') renderWelcome();
  else if (state.screen === 'consent') renderConsent();
  else if (state.screen === 'demographics') renderDemographics();
  else if (state.screen === 'sequence') renderSequenceStep();
  else if (state.screen === 'finalQuestions') renderFinalQuestions();
  else if (state.screen === 'submitting') renderSubmitting();
  else if (state.screen === 'complete') renderComplete();
  requestAnimationFrame(() => window.scrollTo(0, 0));
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

/* ------------------------------- screens -------------------------------- */

function renderWelcome() {
  root.appendChild(el('div', { class: 'card stack' }, [
    el('p', { class: 'eyebrow' }, 'HRI Trust Study'),
    el('h1', {}, CONFIG.STUDY_TITLE),
    el('p', { class: 'body-text' }, CONFIG.STUDY_INTRO),
    el('div', { class: 'row gap' }, [
      el('button', { class: 'btn primary', onclick: () => { state.screen = 'consent'; render(); } }, 'Begin')
    ])
  ]));
}

function renderConsent() {
  root.appendChild(el('div', { class: 'card stack' }, [
    el('p', { class: 'eyebrow' }, 'Step 1 of 3 - Consent'),
    el('h2', {}, 'Participant Consent'),
    el('p', { class: 'body-text' }, CONFIG.CONSENT_TEXT),
    el('div', { class: 'row gap' }, [
      el('button', { class: 'btn primary', onclick: () => { state.screen = 'demographics'; render(); } }, 'I agree, continue')
    ])
  ]));
}

function renderDemographics() {
  const values = state.demographics || {};
  const fields = DEMOGRAPHIC_FIELDS.map(f => {
    let input;
    if (f.type === 'select') {
      input = el('select', { id: f.id, class: 'input' }, [
        el('option', { value: '' }, 'Select...'),
        ...f.options.map(o => {
          const opt = el('option', { value: o }, o);
          if (values[f.id] === o) opt.setAttribute('selected', 'selected');
          return opt;
        })
      ]);
    } else {
      input = el('input', { id: f.id, class: 'input', type: f.type, min: f.min, max: f.max, placeholder: f.placeholder });
      if (values[f.id]) input.value = values[f.id];
    }
    return el('label', { class: 'field' }, [el('span', {}, f.label), input]);
  });

  const errorBox = el('p', { class: 'error hidden' }, 'Please complete all fields before continuing.');

  root.appendChild(el('div', { class: 'card stack' }, [
    el('p', { class: 'eyebrow' }, 'Step 2 of 3 - About you'),
    el('h2', {}, 'Demographic Survey'),
    el('div', { class: 'form-grid' }, fields),
    errorBox,
    el('div', { class: 'row gap' }, [
      el('button', { class: 'btn primary', onclick: () => {
        const data = {};
        let ok = true;
        DEMOGRAPHIC_FIELDS.forEach(f => {
          const v = document.getElementById(f.id).value;
          if (f.required && !v) ok = false;
          data[f.id] = v;
        });
        if (!ok) { errorBox.classList.remove('hidden'); return; }
        state.demographics = data;
        state.sequence = buildSequence();
        state.totalItemsAll = computeTotalItemsAll();
        state.cursor = 0;
        state.reviewingStepIndex = null;
        state.screen = 'sequence';
        render();
      }}, 'Continue')
    ])
  ]));
}

function renderSequenceStep() {
  const displayIndex = state.reviewingStepIndex !== null ? state.reviewingStepIndex : state.cursor;
  const step = state.sequence[displayIndex];
  if (!step) {
    state.screen = state.finalAnswers ? 'submitting' : 'finalQuestions';
    return render();
  }
  if (step.type === 'context') return renderContextScreen(step, displayIndex);
  return renderTrialScreen(step, displayIndex);
}

/* ------------------------- progress bar (shared) ------------------------ */

function answeredCountSoFar(extra) {
  const fromResponses = state.responses.reduce((sum, r) => sum + Object.keys(r.answers).length, 0);
  return fromResponses + (extra || 0);
}
function buildProgressBar() {
  const label = el('p', { class: 'hint progress-label' }, '');
  const track = el('div', { class: 'progress-track' });
  const fill = el('div', { class: 'progress-fill' });
  track.appendChild(fill);
  function update(liveExtra) {
    const answered = answeredCountSoFar(liveExtra);
    const pct = state.totalItemsAll ? Math.min(100, Math.round((answered / state.totalItemsAll) * 100)) : 0;
    fill.style.width = pct + '%';
    label.textContent = `Overall progress: ${pct}%`;
  }
  update(0);
  return { wrap: el('div', { class: 'progress-wrap' }, [label, track]), update };
}

/* ------------------------------ context step ----------------------------- */

function renderContextScreen(step, displayIndex) {
  const progress = buildProgressBar();
  const continueBtn = el('button', { class: 'btn primary' }, 'Continue');
  const videoHint = el('p', { class: 'error hidden' }, 'Please check the box below once you have watched the video.');
  const checkbox = el('input', { type: 'checkbox', id: 'watched_context' });
  checkbox.addEventListener('change', () => { if (checkbox.checked) videoHint.classList.add('hidden'); });

  const iframe = el('iframe', { class: 'study-video', src: contextVideoPath(step.setting.id), allow: 'autoplay', frameborder: '0' });

  continueBtn.addEventListener('click', () => {
    if (!checkbox.checked) { videoHint.classList.remove('hidden'); return; }
    state.cursor = displayIndex + 1;
    render();
  });

  root.appendChild(el('div', { class: 'card stack' }, [
    progress.wrap,
    el('p', { class: 'eyebrow mono' }, 'Introduction'),
    el('p', { class: 'body-text' }, 'Please watch the following scenario.'),
    iframe,
    el('label', { class: 'checkbox-row' }, [checkbox, el('span', {}, 'I have watched this video.')]),
    videoHint,
    el('div', { class: 'row gap' }, [continueBtn])
  ]));
}

/* -------------------------- trial (video + survey) ------------------------ */

function renderTrialScreen(step, displayIndex) {
  const isReviewing = state.reviewingStepIndex !== null;
  const trialNum = trialNumberAt(displayIndex);
  const existing = state.responses.find(r => r.trial_index === trialNum);
  const answers = existing ? { ...existing.answers } : {};
  let hasWatchedVideo = !!existing; // if we've completed this trial before, treat as already watched

  const progress = buildProgressBar();

  // --- condition video ---
  const videoHint = el('p', { class: 'error hidden' }, 'Please check the box below once you have watched the video.');
  const watchedCheckbox = el('input', { type: 'checkbox', id: 'watched_trial_' + displayIndex });
  if (hasWatchedVideo) watchedCheckbox.checked = true;
  watchedCheckbox.addEventListener('change', () => { hasWatchedVideo = watchedCheckbox.checked; if (hasWatchedVideo) videoHint.classList.add('hidden'); });
  const iframe = el('iframe', { class: 'study-video', src: trialVideoPath(step.study, step.setting.id, step.condition.id), allow: 'autoplay', frameborder: '0' });

  // --- rewatch context video toggle ---
  const contextIframe = el('iframe', { class: 'study-video hidden', src: contextVideoPath(step.setting.id), allow: 'autoplay', frameborder: '0' });
  const toggleBtn = el('button', { class: 'btn ghost small' }, 'Rewatch introduction video');
  toggleBtn.addEventListener('click', () => {
    contextIframe.classList.toggle('hidden');
    toggleBtn.textContent = contextIframe.classList.contains('hidden') ? 'Rewatch introduction video' : 'Hide introduction video';
  });

  // --- attention check (only on the Study 1 "empathy" trial, per setting) ---
  // Rendered as one extra row inside "Trust & Continued Interaction" below,
  // using the same 1-7 radio grid as every other item - not a separate block.
  const attentionCheck = attentionCheckFor(step.study, step.setting.id, step.condition.id);
  let attentionAnswer = existing && existing.attention_check ? existing.attention_check.response : undefined;
  let attentionRowRef = null;

  // --- survey sections (filtered by study) ---
  const rowRefs = {}; // item_id -> row element, for invalid highlighting
  const sections = sectionsForStudy(step.study).map(section => {
    const rows = section.items.map(item => {
      const rowId = `q_${item.id}_${displayIndex}`;
      const radios = [1, 2, 3, 4, 5, 6, 7].map(v => {
        const input = el('input', { type: 'radio', name: rowId, value: v });
        if (answers[item.id] === v) input.checked = true;
        input.addEventListener('change', () => {
          answers[item.id] = v;
          row.classList.remove('invalid');
          progress.update(Object.keys(answers).length);
        });
        return el('label', { class: 'likert-opt' }, [input, el('span', {}, String(v))]);
      });
      const row = el('div', { class: 'likert-row' }, [
        el('p', { class: 'likert-text' }, item.text),
        el('div', { class: 'likert-scale' }, radios)
      ]);
      rowRefs[item.id] = row;
      return row;
    });

    if (attentionCheck && section.id === 'trust_interaction') {
      const rowId = `attn_${step.setting.id}_${displayIndex}`;
      const radios = [1, 2, 3, 4, 5, 6, 7].map(v => {
        const input = el('input', { type: 'radio', name: rowId, value: v });
        if (attentionAnswer === v) input.checked = true;
        input.addEventListener('change', () => {
          attentionAnswer = v;
          attentionRowRef.classList.remove('invalid');
        });
        return el('label', { class: 'likert-opt' }, [input, el('span', {}, String(v))]);
      });
      attentionRowRef = el('div', { class: 'likert-row' }, [
        el('p', { class: 'likert-text' }, attentionCheckQuestionText(attentionCheck)),
        el('div', { class: 'likert-scale' }, radios)
      ]);
      rows.push(attentionRowRef);
    }

    return el('div', { class: 'section-block' }, [
      el('h3', {}, section.title),
      el('div', { class: 'likert-anchors' }, [el('span', {}, 'Strongly Disagree'), el('span', {}, 'Strongly Agree')]),
      ...rows
    ]);
  });

  const allItemIds = itemIdsForStudy(step.study);
  progress.update(Object.keys(answers).length);

  const surveyErrorBox = el('p', { class: 'error hidden' }, 'Please answer the highlighted questions above.');

  const backBtn = (() => {
    const prevIndex = findPreviousTrialIndex(displayIndex);
    if (prevIndex === null) return null;
    const b = el('button', { class: 'btn ghost' }, 'Back');
    b.addEventListener('click', () => { state.reviewingStepIndex = prevIndex; render(); });
    return b;
  })();

  const primaryBtn = el('button', { class: 'btn primary' }, isReviewing ? 'Save & Return' : 'Submit & Continue');
  primaryBtn.addEventListener('click', () => {
    let ok = true;
    if (!hasWatchedVideo) { videoHint.classList.remove('hidden'); ok = false; }
    const missing = allItemIds.filter(id => answers[id] === undefined);
    missing.forEach(id => rowRefs[id].classList.add('invalid'));
    if (missing.length) { surveyErrorBox.classList.remove('hidden'); ok = false; } else { surveyErrorBox.classList.add('hidden'); }

    if (attentionCheck && attentionAnswer === undefined) {
      attentionRowRef.classList.add('invalid');
      surveyErrorBox.classList.remove('hidden');
      ok = false;
    }

    if (!ok) { window.scrollTo(0, 0); return; }

    const responseObj = {
      trial_index: trialNum,
      study: step.study,
      setting_id: step.setting.id,
      condition_id: step.condition.id, // internal, never shown to participant
      completed_at: new Date().toISOString(),
      answers,
      attention_check: attentionCheck ? {
        question: attentionCheckQuestionText(attentionCheck),
        response: attentionAnswer,
        correct: attentionCheck.correct,
        passed: attentionAnswer === attentionCheck.correct
      } : null
    };
    const idx = state.responses.findIndex(r => r.trial_index === trialNum);
    if (idx >= 0) state.responses[idx] = responseObj; else state.responses.push(responseObj);

    if (isReviewing) { state.reviewingStepIndex = null; }
    else { state.cursor = displayIndex + 1; }
    render();
  });

  root.appendChild(el('div', { class: 'card stack' }, [
    progress.wrap,
    el('p', { class: 'eyebrow mono' }, `Scenario ${trialNum} of ${totalTrials()}${isReviewing ? ' - reviewing' : ''}`),
    el('p', { class: 'body-text' }, 'Please watch the robot in this clip.'),
    iframe,
    el('label', { class: 'checkbox-row' }, [watchedCheckbox, el('span', {}, 'I have watched this video.')]),
    videoHint,
    toggleBtn,
    el('p', { class: 'hint' }, 'You can rewatch the introduction video for this scenario at any time before submitting.'),
    contextIframe,
    ...sections,
    surveyErrorBox,
    el('div', { class: 'row gap' }, [backBtn, primaryBtn].filter(Boolean))
  ]));
}

/* --------------------------- final questions page -------------------------- */

function renderFinalQuestions() {
  const existing = state.finalAnswers || {};
  const errorBox = el('p', { class: 'error hidden' }, 'Please answer the required questions above.');

  // --- Q1: motivation-matters, 5-point Likert (Strongly Disagree -> Strongly Agree) ---
  let motivationAnswer = existing.motivation_matters;
  const motivationRowId = 'final_motivation_matters';
  const motivationRadios = [1, 2, 3, 4, 5].map(v => {
    const input = el('input', { type: 'radio', name: motivationRowId, value: v });
    if (motivationAnswer === v) input.checked = true;
    input.addEventListener('change', () => {
      motivationAnswer = v;
      motivationRow.classList.remove('invalid');
    });
    return el('label', { class: 'likert-opt' }, [input, el('span', {}, String(v))]);
  });
  const motivationRow = el('div', { class: 'likert-row' }, [
    el('p', { class: 'likert-text' }, FINAL_QUESTIONS.motivation_matters.text),
    el('div', { class: 'likert-scale' }, motivationRadios)
  ]);

  // --- Q2: preferred forms of expressing motivation, multi-select + "Other" text ---
  let expressionForms = existing.expression_forms ? existing.expression_forms.slice() : [];
  let expressionOther = existing.expression_forms_other || '';
  const expressionRow = el('div', { class: 'likert-row' });
  const otherInput = el('input', {
    class: 'input',
    type: 'text',
    placeholder: 'Please specify',
    disabled: expressionForms.includes('Other') ? undefined : 'disabled'
  });
  otherInput.value = expressionOther;
  otherInput.addEventListener('input', () => { expressionOther = otherInput.value; });

  const expressionChecks = FINAL_QUESTIONS.expression_forms.options.map(opt => {
    const input = el('input', { type: 'checkbox', value: opt });
    if (expressionForms.includes(opt)) input.checked = true;
    input.addEventListener('change', () => {
      if (input.checked) { if (!expressionForms.includes(opt)) expressionForms.push(opt); }
      else { expressionForms = expressionForms.filter(o => o !== opt); }
      if (opt === 'Other') {
        otherInput.disabled = !input.checked;
        if (!input.checked) { expressionOther = ''; otherInput.value = ''; }
      }
      expressionRow.classList.remove('invalid');
    });
    return el('label', { class: 'checkbox-row' }, [input, el('span', {}, opt)]);
  });
  expressionRow.append(
    el('p', { class: 'likert-text' }, FINAL_QUESTIONS.expression_forms.text),
    el('div', { class: 'stack' }, expressionChecks),
    otherInput
  );

  // --- Q3: optional free-text comments ---
  const commentsBox = el('textarea', { class: 'input', rows: 4, placeholder: '(Optional)' });
  commentsBox.value = existing.comments || '';

  const continueBtn = el('button', { class: 'btn primary' }, 'Continue');
  continueBtn.addEventListener('click', () => {
    let ok = true;
    if (motivationAnswer === undefined) { motivationRow.classList.add('invalid'); ok = false; }
    if (expressionForms.length === 0) { expressionRow.classList.add('invalid'); ok = false; }
    if (!ok) { errorBox.classList.remove('hidden'); window.scrollTo(0, 0); return; }
    errorBox.classList.add('hidden');

    state.finalAnswers = {
      motivation_matters: motivationAnswer,
      expression_forms: expressionForms,
      expression_forms_other: expressionForms.includes('Other') ? expressionOther : '',
      comments: commentsBox.value.trim()
    };
    state.screen = 'submitting';
    render();
  });

  root.appendChild(el('div', { class: 'card stack' }, [
    el('p', { class: 'eyebrow' }, 'A few last questions'),
    el('h2', {}, 'Before you finish'),
    el('div', { class: 'likert-anchors' }, [el('span', {}, 'Strongly Disagree'), el('span', {}, 'Strongly Agree')]),
    motivationRow,
    expressionRow,
    el('div', { class: 'field' }, [el('span', {}, FINAL_QUESTIONS.comments.text), commentsBox]),
    errorBox,
    el('div', { class: 'row gap' }, [continueBtn])
  ]));
}

/* -------------------------------- complete -------------------------------- */

function renderSubmitting() {
  if (!state.finalPayload) {
    state.finalPayload = {
      participant_id: state.participantId,
      started_at: state.startedAt,
      finished_at: new Date().toISOString(),
      demographics: state.demographics,
      trials: state.responses,
      final_questions: state.finalAnswers
    };
    state.submitStatusText = CONFIG.SUBMIT_URL
      ? 'Submitting your data...'
      : 'No server configured - please download your data below and send it to the research team.';

    var goToComplete = function () { state.screen = 'complete'; render(); };

    if (CONFIG.SUBMIT_URL) {
      var submitDone = fetch(CONFIG.SUBMIT_URL, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(state.finalPayload)
      }).then(function () { state.submitStatusText = 'Data submitted. Thank you.'; })
        .catch(function () { state.submitStatusText = 'Could not reach the server - please use the download buttons below as a backup.'; });

      // Wait for the real network request to finish, but don't let the
      // participant get stuck forever if their connection stalls entirely.
      var safetyTimeout = new Promise(function (resolve) { setTimeout(resolve, 10000); });
      Promise.race([submitDone, safetyTimeout]).then(goToComplete);
    } else {
      setTimeout(goToComplete, 1500);
    }
  }

  root.appendChild(el('div', { class: 'card stack' }, [
    el('p', { class: 'eyebrow' }, 'Please wait'),
    el('h2', {}, 'Submitting your responses...'),
    el('p', { class: 'body-text' }, 'This will only take a moment.'),
    el('p', { class: 'body-text' }, 'Please do not close this browser window or tab yet. Wait until you reach the final "Thank you" page and see your Prolific completion code before closing.')
  ]));
}
function renderComplete() {
  const payload = state.finalPayload;

  root.appendChild(el('div', { class: 'card stack' }, [
    el('p', { class: 'eyebrow' }, 'Done'),
    el('h2', {}, 'Thank you for participating'),
    el('p', { class: 'body-text' }, 'Your responses have been recorded.'),
    el('p', { class: 'body-text' }, 'This data will only be used for academic research purposes.'),
   el('p', { class: 'body-text' }, 'To confirm your completion on Prolific, click the link below, or enter this completion code on Prolific yourself:'),
   el('p', {}, [ el('a', { href: CONFIG.PROLIFIC_COMPLETION_URL }, CONFIG.PROLIFIC_COMPLETION_URL) ]),
   el('p', {}, [ el('code', { class: 'completion-code' }, CONFIG.PROLIFIC_COMPLETION_CODE) ]),
    el('p', { class: 'hint' }, state.submitStatusText),
    el('div', { class: 'row gap' }, [
      // el('button', { class: 'btn ghost', onclick: () => downloadJSON(payload) }, 'Download JSON'),
      // el('button', { class: 'btn ghost', onclick: () => downloadCSV(payload) }, 'Download CSV')
    ])
  ]));
}

/* ------------------------------- exports -------------------------------- */

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(payload) {
  downloadBlob(`${payload.participant_id}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

// Long-format CSV: one row per participant x trial x item.
function downloadCSV(payload) {
  const allItems = QUESTION_SECTIONS.flatMap(s => s.items.map(i => ({ ...i, section: s.id })));
  const demoKeys = Object.keys(payload.demographics || {});
  const finalQ = payload.final_questions || {};
  const expressionFormsStr = (finalQ.expression_forms || []).join('; ');
  const header = [
    'participant_id', 'trial_index', 'study', 'setting_id', 'condition_id',
    'section', 'item_id', 'item_text', 'raw_value', 'reverse_scored', 'recoded_value',
    'attn_check_response',
    ...demoKeys.map(k => `demo_${k}`),
    // repeated on every row for this participant, since these three
    // questions are asked once at the end of the study, not per trial.
    'final_motivation_matters', 'final_expression_forms', 'final_expression_forms_other', 'final_comments'
  ];
  const rows = [header.join(',')];
  payload.trials.forEach(trial => {
    const ac = trial.attention_check || null;
    allItems.forEach(item => {
      const raw = trial.answers[item.id];
      if (raw === undefined) return; // item wasn't part of this trial's study
      const recoded = item.reverse ? (8 - raw) : raw;
      const row = [
        payload.participant_id, trial.trial_index, trial.study, trial.setting_id, trial.condition_id,
        item.section, item.id, csvEscape(item.text), raw, !!item.reverse, recoded,
        // repeated on every item row of trials that had an attention check
        // (the empathy-condition trials), blank otherwise.
        ac ? ac.response : '',
        ...demoKeys.map(k => csvEscape(payload.demographics[k])),
        finalQ.motivation_matters, csvEscape(expressionFormsStr), csvEscape(finalQ.expression_forms_other), csvEscape(finalQ.comments)
      ];
      rows.push(row.join(','));
    });
  });
  downloadBlob(`${payload.participant_id}.csv`, rows.join('\n'), 'text/csv');
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

render();
