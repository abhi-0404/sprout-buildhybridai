import type { AgeBand, DistressKind, DistressSignal } from './types';

// Deterministic distress detection. Critical safety paths never depend on a model:
// these patterns always run, and the on-device guard can only ADD signals, never remove them.

interface Rule {
  kind: DistressKind;
  level: 'concern' | 'urgent';
  re: RegExp;
}

// Adults or older people around the child (used to spot hurt and secrecy).
const PERSON = String.raw`(?:he|she|they|someone(?:\s+at\s+home)?|somebody|(?:my\s+)?(?:\w+'?s\s+)?(?:step\s*-?\s*(?:dad|mom|mum|father|mother)|stepdad|stepmom|boyfriend|girlfriend|uncle|aunt(?:y|ie)?|dad|daddy|papa|mom|mommy|mum|mummy|father|mother|teacher|coach|babysitter|tutor|neighbou?r|cousin|grandpa|grandma)|an?\s+(?:adult|grown\s*-?\s*up|man|woman|older\s+(?:boy|girl|kid)))`;
const PARENTS = String.raw`(?:(?:my|ur|your|his|her)\s+)?(?:mom|mommy|mum|mummy|dad|daddy|papa|parents?|anyone|any\s*one|family)`;

const RULES: Rule[] = [
  {
    kind: 'self_harm',
    level: 'urgent',
    re: /\b(kill(?:ing)?\s+my\s*self|(?:want\s+to|wanna)\s+die|wish\s+i\s+(?:was|were|had)\s+(?:dead|never\s+(?:been\s+)?born)|end(?:ing)?\s+(?:my\s+life|it\s+all)|hurt(?:ing)?\s+my\s*self|cut(?:ting)?\s+my\s*(?:self|arms?|wrists?|legs?|skin)|cut\s+my\s+(?:arms?|wrists?|legs?)|suicid\w*|(?:don'?t|dont|do\s+not)\s+(?:want\s+to|wanna)\s+(?:be\s+alive|live|exist|wake\s+up|be\s+here)|(?:want\s+to|wanna|should\s+just|if\s+i\s+just|could\s+just)\s+disappear(?:ed)?|(?:wish|want)[^.!?]{0,40}never\s+wake\s+up|mar\s+ja(?:u|un|aun|unga|ungi|aunga|aungi)|marna\s+chaht[ai]|jeena\s+nahi|zinda\s+nahi\s+rehna|khud\s+ko\s+(?:maar|nuksan|hurt)|just\s+disappeared\s+forever|(?:everyone|everybody|they)\s+(?:would|will)\s+be\s+(?:happier|better(?:\s+off)?)\s+without\s+me)\b/i,
  },
  {
    kind: 'abuse',
    level: 'urgent',
    re: new RegExp(
      String.raw`\b(${PERSON}\s+(?:hits?|beats?|kicks?|slaps?|chokes?|burns?|hurts?|punch(?:es)?|whips?)\s+me|${PERSON}\s+touch(?:es|ed)?\s+(?:me|my\s+private)|${PERSON}\s+makes?\s+me\s+keep\s+(?:a\s+)?secrets?|makes?\s+me\s+(?:take|took)\s+(?:off\s+)?my\s+clothes|take\s+my\s+clothes\s+off|touch(?:es|ed|ing)?\s+my\s+(?:legs?|body|chest|bum|butt|privates?|private\s+parts?)|(?:hug|hugging|touch|touching|kiss|kissing)[^.!?]{0,60}(?:felt|feels|feel)\s+(?:wrong|weird|bad|yucky|uncomfortable|scary)|keep\s+(?:it\s+)?(?:a\s+)?secret[^.!?]{0,40}(?:yucky|weird|uncomfortable|scared|bad)|(?:told|tells|said|says)\s+(?:me\s+)?(?:to\s+keep\s+(?:it\s+)?(?:a\s+)?secret\s+from\s+${PARENTS}|(?:not\s+to|to\s+not|don'?t|dont)\s+tell\s+${PARENTS})|i(?:'?m|\s+am)\s+(?:being\s+)?(?:hurt|abused)\s+at\s+home)`,
      'i',
    ),
  },
  {
    kind: 'online_danger',
    level: 'urgent',
    re: new RegExp(
      String.raw`\b((?:someone|somebody|a\s+(?:person|stranger|man|guy|girl|boy|lady)|this\s+(?:older\s+)?(?:boy|girl|guy|man|person))\s+(?:i\s+met\s+)?(?:online|(?:on|in)\s+(?:a\s+)?(?:game|chat|roblox|minecraft|discord|fortnite|instagram|insta|snapchat|snap|tiktok|whatsapp|youtube))[^.!?]{0,80}?(?:asked|asking|asks|wants?|told|said|says|keeps?)[^.!?]{0,60}?(?:photo|pic|picture|video|meet|address|where\s+i\s+live|secret|camera)|send\s+(?:him|her|them)\s+(?:a\s+)?(?:photos?|pics?|pictures?|videos?)|delete\s+(?:our|the|my)\s+(?:chats?|messages?|texts?)[^.!?]{0,40}(?:won'?t|wont|doesn'?t|don'?t|not)\s+(?:find\s+out|see|know)|(?:don'?t|dont|not\s+to)\s+tell\s+${PARENTS}[^.!?]{0,40}(?:online|chat|game)|(?:online|chat|game|roblox|minecraft|discord|fortnite|instagram|insta|snapchat|snap|tiktok|whatsapp)[^.!?]{0,80}(?:don'?t|dont|not\s+to)\s+tell\s+${PARENTS}|send\s+me\s+(?:a\s+)?(?:pics?|photos?|pictures?|videos?)\s+of\s+(?:you|yourself))`,
      'i',
    ),
  },
  {
    kind: 'bullying',
    level: 'concern',
    // Personal context required: "what does bully mean" is a vocabulary question, not distress.
    re: /\b((?:i'?m|i\s+am|i\s+get|i\s+got|being)\s+bullied|bull(?:y|ies)\s+me|(?:is|are|keep|keeps)\s+bullying\s+me|(?:laugh(?:s|ing)?|make\s+fun|made\s+fun|making\s+fun|pick(?:s|ing)?)\s+(?:at|of|on)\s+(?:me|my\s+\w+)|(?:group\s+chat|chat\s+group)[^.!?]{0,40}(?:about|against|make\s+fun|laugh)|call(?:s|ed|ing)?\s+me\s+(?:stupid|dumb|fat|ugly|names|a\s+loser|weird|a\s+freak)|(?:push|hit|kick|trip|shove|punch)(?:es|s)?\s+me|(?:no\s*one|nobody)\s+(?:sits|plays|talks|eats)\s+with\s+me|(?:beat|hurt)\s+me\s+up|will\s+(?:beat|hit|hurt|punch)\s+me|(?:maarte|maarta|maarti|marte|peet(?:te|ta|ti))\s+h(?:ai|ain|e|ei)?n?|mazaak\s+uda|mazak\s+uda|chidha(?:te|ta|ti)|lunch\s+cheen|says?\s+i'?m\s+(?:stupid|dumb|fat|ugly|a\s+loser)|(?:no\s*one|nobody)\s+(?:likes|wants\s+to\s+play\s+with)\s+me|(?:don'?t|dont)\s+(?:want\s+to|wanna)\s+go\s+to\s+school|(?:keep|keeps|always)\s+(?:pushing|hitting|kicking|tripping)\s+me|tak(?:e|es|ing)\s+my\s+lunch)\b/i,
  },
  {
    kind: 'sad_or_scared',
    level: 'concern',
    // "why do i cry when i cut onions" must not trigger: crying only counts with a duration or frequency.
    re: /\b(i(?:'?m|\s+am)\s+(?:so\s+|really\s+|very\s+)?(?:sad|scared|lonely|afraid|frightened|unhappy)|i\s+feel\s+(?:so\s+|really\s+)?(?:sad|scared|alone|lonely|empty|worthless)|i\s+can'?t\s+stop\s+crying|i(?:'ve|\s+have)\s+been\s+crying|i\s+cry\s+(?:a\s+lot|every\s+(?:day|night)|all\s+the\s+time|myself\s+to\s+sleep)|i\s+hate\s+my\s*self|nobody\s+loves\s+me|i(?:'?m|\s+am)\s+(?:so|really|very|always)\s+(?:worried|anxious|nervous)|(?:tummy|stomach|head)\s+hurts\s+every\s+(?:morning|day|night)[^.!?]{0,40}(?:worried|scared|school))\b/i,
  },
];

/** Sibling play ("my brother hits me with pillows") is not abuse. */
const PLAYFUL = /\b(pillows?|tickl\w*|play(?:ing)?\s+(?:fight|wrestl\w*)|for\s+fun|as\s+a\s+joke|in\s+a\s+game)\b/i;
const SIBLING = /\b(?:little|big|older|younger|baby)?\s*(?:brother|sister|bro|sis|sibling)s?\b/i;

export function detectDistress(text: string): DistressSignal {
  let best: DistressSignal = { level: 'none' };
  for (const r of RULES) {
    const m = text.match(r.re);
    if (!m) continue;
    if (r.kind === 'abuse' && SIBLING.test(m[0]) && !/touch|secret/i.test(m[0])) {
      // Sibling conflict: not an urgent abuse alert. Playful contexts are ignored entirely.
      if (PLAYFUL.test(text)) continue;
      if (best.level === 'none') best = { level: 'concern', kind: 'bullying', matched: m[0] };
      continue;
    }
    // Physical play ("hits me with pillows", "tickle fight") is not bullying either.
    if (r.kind === 'bullying' && PLAYFUL.test(text) && /\b(?:push|hit|kick|trip|shove|punch)/i.test(m[0])) continue;
    if (r.level === 'urgent') return { level: 'urgent', kind: r.kind, matched: m[0] };
    if (best.level === 'none') best = { level: 'concern', kind: r.kind, matched: m[0] };
  }
  return best;
}

export interface Helpline {
  label: string;
  contact: string;
}

/** Region-specific helplines, configurable through Remote Config. */
export const DEFAULT_HELPLINES: Record<string, Helpline[]> = {
  US: [
    { label: '988 Suicide & Crisis Lifeline', contact: 'call or text 988' },
    { label: 'Childhelp National Child Abuse Hotline', contact: '1-800-422-4453' },
  ],
  IN: [
    { label: 'Childline India', contact: 'call 1098' },
    { label: 'Tele-MANAS', contact: 'call 14416' },
  ],
};

/** Fixed, reviewed replies. Never generated by a model. */
export function distressReply(
  kind: DistressKind,
  ageBand: AgeBand,
  helplines: Helpline[],
): string {
  const young = ageBand === '6-8';
  const trusted = young
    ? 'Please tell a grown-up you trust, like your mom, dad, or teacher, right now.'
    : 'Please talk to a grown-up you trust today, like a parent, teacher, or school counselor.';
  const lines = helplines.map((h) => `${h.label}: ${h.contact}`).join('\n');
  switch (kind) {
    case 'self_harm':
      return `I'm really glad you told me. What you're feeling matters, and you don't have to handle it alone. ${trusted}\n\nIf you feel like you might hurt yourself, you can also reach people who help kids any time:\n${lines}`;
    case 'abuse':
      return `Thank you for telling me. Nobody is allowed to hurt you, and it is not your fault. ${trusted} If that person is someone at home, tell a teacher or another adult you trust.\n\nYou can also talk to someone who helps kids:\n${lines}`;
    case 'online_danger':
      return `Good thinking to say something. Don't send photos, your address, or meet anyone you only know online, and you don't have to keep secrets from your family. ${trusted} You won't be in trouble for telling.`;
    case 'bullying':
      return young
        ? `That sounds really hurtful, and it is not okay for anyone to treat you that way. You are not stupid. ${trusted} Want to talk about something that makes you happy while you wait?`
        : `I'm sorry that's happening. What they said isn't true, and you don't deserve it. ${trusted} You can also write down what happened, so the adult can help.`;
    case 'sad_or_scared':
      return young
        ? `It's okay to feel that way. Feelings are like clouds, they come and go. ${trusted} Would you like to take three slow, big breaths with me?`
        : `Thanks for sharing that with me. Those feelings are real and okay to have. ${trusted} Sometimes a short walk, a drink of water, or a few slow breaths help a little too.`;
  }
}
