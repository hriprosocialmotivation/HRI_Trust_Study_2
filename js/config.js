/* =========================================================================
   CONFIG.js
   Everything a researcher needs to edit lives in this file:
   video paths, condition labels, and the questionnaire items.
   App logic (js/app.js) should not need to change when you edit this.
   ========================================================================= */

const CONFIG = {
  // Paste a Google Apps Script Web App URL here to auto-submit each
  // participant's data to a Google Sheet. Leave as '' to skip network
  // submission and rely on the in-browser JSON/CSV download only.
  // See README.md > "Collecting data centrally" for setup steps.
  SUBMIT_URL: 'https://script.google.com/macros/s/AKfycby8HXlrtf4lYCzI8cmSPV465yYNZaf-TIH6Yy1QugNbaVrYvtylDzIFr0N5kHyP4YL3OA/exec',

  STUDY_TITLE: 'Human-Robot Interaction Study in Trust',
  STUDY_INTRO: `You will watch a series of short video clips showing a robot assisting a person. 
  As you watch each clip, please vividly imagine yourself in the role of the person interacting with the robot. 
  After each clip, you will be asked a few questions about your experience.
    There are no right or wrong answers - please respond based on your
    honest impressions.`,

  CONSENT_TEXT: `By clicking "I agree" you confirm that you are 18 years of
    age or older, that you have read the participant information, and that
    you voluntarily agree to take part in this study. Your responses are
    confidential and will be used for research purposes only. You may
    withdraw at any time by closing this window.`,
   
   PROLIFIC_COMPLETION_CODE: 'C1DG7W4Q',
   PROLIFIC_COMPLETION_URL: 'https://app.prolific.com/submissions/complete?cc=C1DG7W4Q'
};

/* -------------------------------------------------------------------------
   HRI SETTINGS (counterbalanced order)
   ---------------------------------------------------------------------- */
const SETTINGS = [
  { id: 'social_care', label: 'Social-care scenario' }, // companion robot
  { id: 'industrial',  label: 'Industrial scenario'  }  // construction robot
];

/* -------------------------------------------------------------------------
   STUDY 1 conditions - motivational autonomy (preprogrammed / cost-benefit /
   empathy-driven). Internal ids are recorded in the data but NEVER shown
   to participants, to avoid tipping them off to the manipulation.
   ---------------------------------------------------------------------- */
const STUDY1_CONDITIONS = [
  { id: 'preprogrammed' },
  { id: 'costbenefit'   },
  { id: 'empathy'       }
];

/* -------------------------------------------------------------------------
   STUDY 2 conditions - motivational orientation (altruistic / egoistic).
   ---------------------------------------------------------------------- */
const STUDY2_CONDITIONS = [
  { id: 'altruistic' },
  { id: 'egoistic'   }
];

/* -------------------------------------------------------------------------
   VIDEO FILES (Google Drive)
   Condition mapping confirmed with the researcher:
     study1_condition1 = preprogrammed, condition2 = cost-benefit, condition3 = empathy
     study2_condition1 = altruistic,    condition2 = egoistic

   Videos are embedded via Google Drive's own preview player (an iframe),
   since Drive's direct-download link does not reliably serve raw video
   for a <video> tag - it intermittently returns an HTML page instead of
   the file. The iframe preview is the format Google actually built for
   embedding, and is the one that has reliably played in testing.
   ---------------------------------------------------------------------- */
function driveVideoUrl(id) {
  return `https://drive.google.com/file/d/${id}/preview`;
}

const VIDEO_FILES = {
  context: {
    social_care: driveVideoUrl('1X6UYIpS6-mSna1Acj3CePO4feTI9uXCi'), // context_companion_robot
    industrial:  driveVideoUrl('1Dqg9ag-H17_WUmW2C4_lmhwnN3Cmjh0x')  // construction_context_video
  },
  study1: {
    social_care: {
      preprogrammed: driveVideoUrl('1nBmuEWeIeqNU7SKor2eShyuvsU0IayJe'), // study1_condition1_companion_robot
      costbenefit:   driveVideoUrl('1ca8oX76dx_cl2jnVWWvDHOAveEhM5JNB'), // study1_condition2_companion_robot
      empathy:       driveVideoUrl('1OASxHZdpegi8gp2wQnau4jFZnptQklAw')  // study1_condition3_companion_robot
    },
    industrial: {
      preprogrammed: driveVideoUrl('15avpumsAk8OrKL_vbs0335ECUhYHaCUK'), // study1_condition1_construction_robot
      costbenefit:   driveVideoUrl('1-GBRYXg41UBjRQ_X-24e83eCwHEl2UZs'), // study1_condition2_constrcution_robot (typo in original filename)
      empathy:       driveVideoUrl('1NuMQvukXD8-BFvVc6wdh300Z3v8l7nx7')  // study1_condition3_constrcution_robot (typo in original filename)
    }
  },
  study2: {
    social_care: {
      altruistic: driveVideoUrl('1ZEeb2fdYZMny2d96uaPgMBFCr_e3DJLR'), // study2_condition1_companion_robot
      egoistic:   driveVideoUrl('1otPUWAznBeEvRYEVPQwrGjkTv-tAjw1t')  // study2_condition2_companion_robot
    },
    industrial: {
      egoistic: driveVideoUrl('1n40zMqPW7iy5EUk0Jt6dQG2-B5D4EzCQ'), 
      altruistic:   driveVideoUrl('1ZyRQYU-FQuSH8ScBlC5OIVM-cAXbHPsl')  
    }
  }
};

function contextVideoPath(settingId) {
  return VIDEO_FILES.context[settingId];
}
function trialVideoPath(study, settingId, conditionId) {
  return VIDEO_FILES['study' + study][settingId][conditionId];
}

/* -------------------------------------------------------------------------
   DEMOGRAPHICS FORM
   ---------------------------------------------------------------------- */
const DEMOGRAPHIC_FIELDS = [
   {
    id: 'prolific_id', label: 'Prolific ID', type: 'text', required: true,
    placeholder: 'Your Prolific ID'
  },
  { id: 'age', label: 'Age', type: 'number', min: 18, max: 100, required: true },
  {
    id: 'gender', label: 'Gender', type: 'select', required: true,
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other']
  },
  {
    id: 'education', label: "Highest level of education completed", type: 'select', required: true,
    options: ['High school or equivalent', 'Some college', "Bachelor's degree", 'Graduate degree', 'Other']
  },
  {
    id: 'robot_experience', label: 'Prior experience with robots', type: 'select', required: true,
    options: ['None', 'Very little', 'Some', 'A lot']
  },
  {
    id: 'robot_frequency', label: 'How often do you interact with robots?', type: 'select', required: true,
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often']
  }
];

/* -------------------------------------------------------------------------
   QUESTIONNAIRE
   Scale is fixed 1-7 (Strongly Disagree -> Strongly Agree).
   `reverse: true` items are reverse-scored during CSV export
   (recoded value = 8 - raw value) but raw values are also kept.

   `studies` tags which study each section applies to:
     - Trust & Continued Interaction, Ability & Benevolence: shown for BOTH studies
     - Perceived Motivation for Helping: STUDY 1 ONLY (manipulation check for autonomy)
     - Perceived Altruism & Egoism: STUDY 2 ONLY (manipulation check for orientation)
   ---------------------------------------------------------------------- */
const QUESTION_SECTIONS = [
     {
    id: 'motivation',
    title: "Perceived Motivation for Helping. Based on the robot's DIALOGUE In This Video, select the reason why the robot helped.",
    studies: [1],
    items: [
      { id: 'Int2', text: "The robot helped because it wanted to avoid feeling bad about itself." },
      { id: 'Ex1', text: "The robot helped because helping is a pre-defined rule it has to follow." },
      { id: 'Ide2', text: "The robot helped because helping others fits its own value." },
      { id: 'Ide1', text: "The robot helped because it thinks it's important to give help when it's needed." },
      { id: 'Ex2', text: "The robot helped because it was told to, not because it chose to." },
      { id: 'Int1', text: "The robot helped because it would feel bad if it didn't help." }
    ]
  },
  {
    id: 'altruism_egoism',
    title: "Perceived Altruism & Egoism. Based on the robot's DIALOGUE In This Video, select the reason why the robot helped.",
    studies: [2],
    items: [
      { id: 'eg1', text: 'The robot seemed to be helping to relieve its own discomfort, not mine.' },
      { id: 'eg2', text: 'The robot was more focused on how it would feel than on how I would feel.' },
      { id: 'eg3', text: "If helping hadn't benefited the robot itself in some way, it probably wouldn't have bothered." },
      { id: 'al1', text: 'The robot helped because it genuinely cared about how I was doing.' },
      { id: 'al2', text: "The robot's main concern was making things easier for me, not for itself." },
      { id: 'al3', text: 'The robot would have helped me even if it got nothing out of it.' }
    ]
  },
  {
    id: 'trust_interaction',
    title: 'Trust & Continued Interaction. Please respond based on your honest feelings.',
    studies: [1, 2],
    items: [
      { id: 'ti1', text: 'I would be willing to accept help from this robot.' },
      { id: 'ti2', text: "I would feel comfortable relying on this robot's assistance." },
      { id: 'ti3', text: 'I would trust this robot to help me in the future.' },
      { id: 'ci2', text: "I'd really prefer not to interact with the robot in the future.", reverse: true },
      { id: 'ci3', text: 'I feel close to the robot.' }
    ]
  },
  {
    id: 'abi',
    title: 'Ability. Please respond based on your honest feelings.',
    studies: [1, 2],
    items: [
      { id: 'ab1', text: 'The robot is very capable of performing its job.' },
      { id: 'ab2', text: 'The robot is known to be successful at the things it tries to do.' },
      { id: 'ab3', text: 'The robot has much knowledge about the work that needs to be done.' },
      { id: 'ab4', text: "I feel very confident about the robot's skills." },
      { id: 'ab5', text: 'The robot has specialized capabilities that can benefit us.' },
      { id: 'ab6', text: 'The robot is well qualified for its role.' },
    ]
  },
     {
    id: 'ben',
    title: 'Benevolence. Please respond based on your honest feelings.',
    studies: [1, 2],
    items: [
      { id: 'bv1', text: 'The robot is very concerned about my welfare.' },
      { id: 'bv2', text: 'My needs and desires are very important to the robot.' },
      { id: 'bv3', text: 'The robot would not knowingly do anything to hurt me.' },
      { id: 'bv4', text: 'The robot really looks out for what is important to me.' },
      { id: 'bv5', text: "The robot will go out of its way to help me." }
    ]
  },
   {
    id: 'int',
    title: 'Integrity. Please respond based on your honest feelings.',
    studies: [1, 2],
    items: [
      { id: 'in1', text: 'The robot has a strong sense of justice.' },
      { id: 'in2', text: 'I never have to wonder whether the robot will stick to its word.' },
      { id: 'in3', text: 'The robot tries hard to be fair in its dealings with others.' },
      { id: 'in4', text: "The robot's actions and behaviors are not very consistent." },
      { id: 'in5', text: "I like the robot's values." },
      { id: 'in6', text: "Sound principles seem to guide the robot's behavior." },
    ]
     },

];

function sectionsForStudy(study) {
  return QUESTION_SECTIONS.filter(s => s.studies.includes(study));
}
function itemIdsForStudy(study) {
  return sectionsForStudy(study).flatMap(s => s.items.map(i => i.id));
}

/* -------------------------------------------------------------------------
   FINAL QUESTIONS
   Shown once, on their own page, after the very last trial video and
   before the data-submission step. Not tied to any particular study.
   ---------------------------------------------------------------------- */
const FINAL_QUESTIONS = {
  // 5-point Likert (separate scale from the 1-7 used in QUESTION_SECTIONS).
  motivation_matters: {
    text: 'Does why the robot helped matter to you?'
  },
  // Multi-select checkboxes; 'Other' reveals a free-text field.
  expression_forms: {
    text: "What forms of expressing the robot's helping motivation do you prefer?",
    options: ['Body Motion', 'Gesture', 'Facial Expression', 'Verbal', 'On-screen text/display', 'Other']
  },
  // Optional free text.
  comments: {
    text: 'Do you have any comments regarding the robot study itself or the survey design?'
  }
};

/* -------------------------------------------------------------------------
   ATTENTION CHECKS
   Shown once per setting, ONLY on the Study 1 "empathy" trial for that
   setting (i.e. study === 1 && condition.id === 'empathy'). Participants
   pick which of three descriptions matches what they just watched.

   IMPORTANT: `correct` must be set to whichever option value (1, 2, or 3)
   actually matches the footage for that setting's empathy-condition video.
   The values below are placeholders - verify against the real clips before
   launching.
   ---------------------------------------------------------------------- */
const ATTENTION_CHECKS = {
  social_care: {
    question: 'What happened in the video you watched?',
    options: [
      { value: 1, text: 'The robot shared snacks with you.' },
      { value: 2, text: 'The robot invited you to play badminton.' },
      { value: 3, text: 'Neither of the above.' }
    ],
    correct: 1 // TODO: confirm against the actual social-care empathy-condition video
  },
  industrial: {
    question: 'What happened in the video you watched?',
    options: [
      { value: 1, text: 'The robot had a fight with you.' },
      { value: 2, text: 'The robot passed a bag of tools to help you.' },
      { value: 3, text: 'The robot asked for your assistance.' }
    ],
    correct: 2 // TODO: confirm against the actual industrial empathy-condition video
  }
};

// Returns the attention check for this trial, or null if this trial
// (study/condition) shouldn't have one.
function attentionCheckFor(study, settingId, conditionId) {
  if (study !== 1 || conditionId !== 'empathy') return null;
  return ATTENTION_CHECKS[settingId] || null;
}

// Builds the single combined question string shown to the participant,
// e.g. "What is happening in the video you just watched? Select 1 if the
// robot is offering apples to the human; Select 2 if the robot is inviting
// the human to play badminton; Select 3 if neither of the above."
function attentionCheckQuestionText(check) {
  const optionText = check.options
    .map(opt => {
      // lowercase the first letter and drop the trailing period so it reads
      // naturally after "Select N if ..." (e.g. "The robot is offering..."
      // -> "if the robot is offering...")
      const text = opt.text.trim().replace(/\.$/, '');
      const lower = text.charAt(0).toLowerCase() + text.slice(1);
      return `Select ${opt.value} if ${lower}`;
    })
    .join('; ');
  return `${check.question} ${optionText}.`;
}
