/* Sign descriptions. Copy is written to be specific rather than flattering:
   each sign has to say something the reader can disagree with. */
(function (root) {
  'use strict';

  root.SMRC = root.SMRC || {};
  root.SMRC.data = root.SMRC.data || {};

  root.SMRC.data.signs = [
    {
      name: 'Aries',
      symbol: '\u2648',
      element: 'fire',
      modality: 'cardinal',
      polarity: 'yang',
      rulers: ['mars'],
      dateRange: '21 Mar - 19 Apr',
      keyword: 'initiation',
      short: 'Direct, fast, first to move.',
      sun: 'You run on the spark of the moment. Aries starts things, and you '
        + 'lose interest at exactly the moment it stops being a start. Your '
        + 'identity is built on being the one who goes first, and being second '
        + 'is a genuine loss of self, not a style choice.',
      moon: 'Your emotions move as fast as your temper and reset just as '
        + 'abruptly. Anger is the language you reach for first and the one you '
        + 'regret most often. You need a fight worth having and you need it '
        + 'now; what you want less is a long slow conversation about feelings.',
      rising: 'You come across as direct and a little impatient, and people '
        + 'learn quickly that you will not wait. You approach unfamiliar '
        + 'situations head on because hesitation reads to you as weakness, which '
        + 'is not a great defence against your own snap judgments.',
      strengths: 'Courage, decisiveness, appetite for a fresh start, energy '
        + 'when everyone else has lost interest.',
      challenges: 'Impatience, a shorter attention span than your ambition '
        + 'deserves, and starting instead of finishing.',
      bodyParts: 'Head, face, brain'
    },
    {
      name: 'Taurus',
      symbol: '\u2649',
      element: 'earth',
      modality: 'fixed',
      polarity: 'yin',
      rulers: ['venus'],
      dateRange: '20 Apr - 20 May',
      keyword: 'steadiness',
      short: 'Slow, solid, hard to move.',
      sun: 'You build things meant to last, and you decide slowly and then '
        + 'completely. Security, in the plain sense of money, comfort and '
        + 'unshakable routines, is not a materialism problem for you, it is the '
        + 'substrate you need in order to feel safe enough to be yourself.',
      moon: 'You need to be left alone, and you need it on your own schedule. '
        + 'Physical comfort regulates you better than conversation does. Being '
        + 'shouted at, rushed, or asked to talk about your feelings in real time '
        + 'makes you close down rather than open up.',
      rising: 'You present as calm, unhurried and hard to rattle, and people '
        + 'find that reassuring whether or not you are actually calm. You take '
        + 'your time getting into anything, and you are the person others wait '
        + 'for when they need someone not to panic.',
      strengths: 'Reliability, patience with slow processes, sensory '
        + 'judgement, the ability to stay when everything else has collapsed.',
      challenges: 'Stubbornness mistaken for principle, resistance to change, '
        + 'and getting comfort-bound.',
      bodyParts: 'Neck, throat, thyroid'
    },
    {
      name: 'Gemini',
      symbol: '\u264A',
      element: 'air',
      modality: 'mutable',
      polarity: 'yang',
      rulers: ['mercury'],
      dateRange: '21 May - 20 Jun',
      keyword: 'curiosity',
      short: 'Quick, restless, everywhere at once.',
      sun: 'You identify with your mind, and boredom is the one thing you '
        + 'genuinely cannot work through. You are good at seeing six ways a '
        + 'thing could go and less good at committing to the one you like, '
        + 'because the other five are still interesting.',
      moon: 'You process feelings by talking about them, often out loud and '
        + 'often mid-thought. Emotional discomfort makes you curious rather '
        + 'than still, and being stuck inside a feeling with nothing to '
        + 'analyse is genuinely hard for you to do.',
      rising: 'You come across as friendly, quick and easy to talk to, and '
        + 'people hand you information first. You signal availability, and you '
        + 'handle new situations by finding out everything about them before '
        + 'committing to a read.',
      strengths: 'Adaptability, quick study, genuine interest in people, the '
        + 'ability to explain anything clearly.',
      challenges: 'Scattered focus, saying yes to keep the peace, and '
        + 'changing your mind after the conversation.',
      bodyParts: 'Hands, arms, lungs, nervous system'
    },
    {
      name: 'Cancer',
      symbol: '\u264B',
      element: 'water',
      modality: 'cardinal',
      polarity: 'yin',
      rulers: ['moon'],
      dateRange: '21 Jun - 22 Jul',
      keyword: 'belonging',
      short: 'Protective, tidal, remembers everything.',
      sun: 'You build identity around belonging: to a family, a chosen group, '
        + 'a place that feels like yours. You lead by taking care of people, '
        + 'which is a real form of power and not the soft one people assume. '
        + 'The shell you grew is the reason you can be tender at all.',
      moon: 'Your moods run on a cycle you do not fully control and cannot '
        + 'reason your way out of. Home, food, and physical familiarity steady '
        + 'you. Criticising your reactions costs you far more than it costs '
        + 'other people, because you already did the work yourself.',
      rising: 'You come across as approachable and slightly guarded, and you '
        + 'signal safety without meaning to. You read a room fast, you adapt '
        + 'your manner to what it needs, and you defend the people in it '
        + 'quickly and out loud.',
      strengths: 'Emotional intelligence, loyalty, instinct for what a group '
        + 'actually needs, care that lands.',
      challenges: 'Holding grudges, retreating into the shell when hurt, and '
        + 'caring for everyone so you never have to ask.',
      bodyParts: 'Chest, stomach, digestion'
    },
    {
      name: 'Leo',
      symbol: '\u264C',
      element: 'fire',
      modality: 'fixed',
      polarity: 'yang',
      rulers: ['sun'],
      dateRange: '23 Jul - 22 Aug',
      keyword: 'expression',
      short: 'Warm, generous, needs to be seen.',
      sun: 'You need to be recognised for what you actually do, not just what '
        + 'is easy to like. Warmth, generosity and creative nerve come easily '
        + 'to you; so does a hard time with anyone who is indifferent to you, '
        + 'because attention is not vanity for you, it is oxygen.',
      moon: 'You need to be adored and you want to be adored openly. '
        + 'Criticism of your work lands much harder than criticism of your '
        + 'ideas, and you feel your moods physically, loudly, and in a way '
        + 'that reorganises the room.',
      rising: 'You come across as confident and welcoming, and you warm up a '
        + 'space as you enter it. You are comfortable being looked at and '
        + 'uncomfortable being ignored, and you handle new situations by '
        + 'occupying them.',
      strengths: 'Warmth, creative confidence, loyalty to your people, the '
        + 'ability to make other people feel larger.',
      challenges: 'Needing applause, taking criticism personally, and '
        + 'drama when you do not get it.',
      bodyParts: 'Heart, spine, circulation'
    },
    {
      name: 'Virgo',
      symbol: '\u264D',
      element: 'earth',
      modality: 'mutable',
      polarity: 'yin',
      rulers: ['mercury'],
      dateRange: '23 Aug - 22 Sep',
      keyword: 'refinement',
      short: 'Precise, useful, quietly critical.',
      sun: 'You identify with being competent and getting things right, and '
        + 'the standard you hold is usually higher than the one you show. You '
        + 'want to be useful more than you want to be admired, and you have a '
        + 'habit of improving the thing that nobody asked you to improve.',
      moon: 'You feel anxious about things that are not yet under control, and '
        + 'you manage that by fixing, organising or worrying. You need to be '
        + 'useful to feel safe. Being told you did a good job lands less well '
        + 'than you would expect.',
      rising: 'You come across as modest, competent and slightly reserved, and '
        + 'people trust you with the difficult things. You approach new '
        + 'situations by looking for what is wrong with them, which is a '
        + 'strength until it becomes the only thing you look for.',
      strengths: 'Accuracy, thoroughness, real usefulness, the discipline to '
        + 'get detail right at scale.',
      challenges: 'Perfectionism, criticism of others and yourself, and '
        + 'turning your own stress into a physical complaint.',
      bodyParts: 'Digestive system, intestines, spleen'
    },
    {
      name: 'Libra',
      symbol: '\u264E',
      element: 'air',
      modality: 'cardinal',
      polarity: 'yang',
      rulers: ['venus'],
      dateRange: '23 Sep - 22 Oct',
      keyword: 'fairness',
      short: 'Considerate, polished, weighs both sides.',
      sun: 'You orient yourself towards the other person in almost every room, '
        + 'which makes you a natural mediator and a genuine pleasure to be '
        + 'around. What you are not always aware of is how much of your own '
        + 'preference you set aside to keep things level.',
      moon: 'Conflict makes you uncomfortable enough that you will smooth it '
        + 'over before you have felt it. You need harmony in the room and you '
        + 'lose track of what you wanted once everyone else is calm. Peace is '
        + 'not optional for you, it is a need.',
      rising: 'You come across as gracious, easy to talk to and socially '
        + 'attentive, and people tend to put you in the middle of things. You '
        + 'handle new situations by observing the tone first and adjusting '
        + 'yourself to fit it.',
      strengths: 'Diplomacy, taste, fairness, an ability to see both sides '
        + 'clearly enough to be useful in a dispute.',
      challenges: 'Indecision, people-pleasing, resentments you never say '
        + 'out loud, and avoiding necessary friction.',
      bodyParts: 'Kidneys, lower back, skin'
    },
    {
      name: 'Scorpio',
      symbol: '\u264F',
      element: 'water',
      modality: 'fixed',
      polarity: 'yin',
      rulers: ['mars', 'pluto'],
      dateRange: '23 Oct - 21 Nov',
      keyword: 'depth',
      short: 'Intense, private, all or nothing.',
      sun: 'You are not interested in the surface version of anything, '
        + 'including yourself. Power, control, and what people are really '
        + 'motivated by are your permanent subjects, and you would rather lose '
        + 'than be liked by someone you do not respect.',
      moon: 'You feel everything at full volume and reveal almost none of it. '
        + 'Trust is the whole game for you: give it and you are loyal past '
        + 'reason, withhold it and you become watchful. Jealousy and '
        + 'attachment are the same feeling for you.',
      rising: 'You come across as reserved, harder to read than most, and more '
        + 'perceptive than people expect. You do not give yourself away '
        + 'quickly, and you approach new situations by watching for what is '
        + 'being withheld.',
      strengths: 'Emotional courage, focus that other people cannot match, '
        + 'resilience, an unusual ability to see through a situation.',
      challenges: 'Control, suspicion, all-or-nothing thinking, and holding on '
        + 'long after it would be healthier to let go.',
      bodyParts: 'Pelvis, reproductive system, immune system'
    },
    {
      name: 'Sagittarius',
      symbol: '\u2650',
      element: 'fire',
      modality: 'mutable',
      polarity: 'yang',
      rulers: ['jupiter'],
      dateRange: '22 Nov - 21 Dec',
      keyword: 'meaning',
      short: 'Frank, restless, needs somewhere further.',
      sun: 'You need the bigger picture, and a life that only makes sense from '
        + 'the inside starts to feel like a mistake. You are honest to the '
        + 'point of being blunt and philosophically serious in a way that '
        + 'sometimes reads as evasive, because you would rather talk about '
        + 'the world than about your own feelings.',
      moon: 'You need freedom, novelty and a sense of meaning in order to feel '
        + 'secure. Emotional heaviness makes you restless rather than still, and '
        + 'you cope with bad feelings by going somewhere, physically or '
        + 'intellectually.',
      rising: 'You come across as open, upbeat and a bit blunt, and people find '
        + 'your frankness refreshing or exhausting depending on the day. You '
        + 'handle new situations by looking for the exit and the wider view.',
      strengths: 'Honesty, curiosity, enthusiasm that spreads, and the ability '
        + 'to find the meaning in a mess.',
      challenges: 'Tactlessness, restlessness, always planning the next thing, '
        + 'and leaving before the present one is finished.',
      bodyParts: 'Hips, thighs, liver'
    },
    {
      name: 'Capricorn',
      symbol: '\u2651',
      element: 'earth',
      modality: 'cardinal',
      polarity: 'yin',
      rulers: ['saturn'],
      dateRange: '22 Dec - 19 Jan',
      keyword: 'mastery',
      short: 'Ambitious, contained, plays the long game.',
      sun: 'You are built for a long climb and you would rather be respected '
        + 'for what you have actually built than liked for what you say. '
        + 'Responsibility is heavy, and you volunteered for it anyway, which is '
        + 'why you have usually been the reliable one since very young.',
      moon: 'You cope by managing, and you feel most secure when you are '
        + 'in control of the practical side of your life. Being helpless is '
        + 'close to unbearable. You show affection by doing something useful, '
        + 'which people who need words take personally.',
      rising: 'You come across as serious, competent and slightly older than '
        + 'your years. You approach new situations by assessing the cost and '
        + 'your role in them, and you expect the same standard back.',
      strengths: 'Discipline, patience, a long view, and the ability to hold '
        + 'your nerve when it matters.',
      challenges: 'Rigidity, measuring your worth by output, work as a way of '
        + 'avoiding feeling, and forgetting to play.',
      bodyParts: 'Bones, knees, skin, joints'
    },
    {
      name: 'Aquarius',
      symbol: '\u2652',
      element: 'air',
      modality: 'fixed',
      polarity: 'yang',
      rulers: ['uranus', 'saturn'],
      dateRange: '20 Jan - 18 Feb',
      keyword: 'principle',
      short: 'Independent, idealist, on your own side.',
      sun: 'You think in systems and principles rather than in precedents. '
        + 'Being told what everyone else does is not persuasive to you, and you '
        + 'will happily be the odd one out if the group is wrong. Your '
        + 'individuality is a moral position, not a personality quirk.',
      moon: 'You need emotional space and a sense of being unusual, and '
        + 'conventional intimacy makes you itchy. You are warmer than you look; '
        + 'you just express it in ideas, causes and chosen family rather than '
        + 'in expectation. Sudden detachment is your way of protecting '
        + 'yourself.',
      rising: 'You come across as original, a little detached and hard to '
        + 'place. You handle new situations by standing slightly outside the '
        + 'group and watching how it works, and you would rather be unusual '
        + 'than comfortable.',
      strengths: 'Original thinking, principle under pressure, friendship '
        + 'without agenda, detachment that keeps you useful in a crisis.',
      challenges: 'Emotional distance, contrarianism for its own sake, and '
        + 'suddenly going cold on people you were close to.',
      bodyParts: 'Circulation, ankles, nervous system'
    },
    {
      name: 'Pisces',
      symbol: '\u2653',
      element: 'water',
      modality: 'mutable',
      polarity: 'yin',
      rulers: ['jupiter', 'neptune'],
      dateRange: '19 Feb - 20 Mar',
      keyword: 'dissolution',
      short: 'Permeable, intuitive, hard to locate.',
      sun: 'Your boundaries are thin by nature and you have spent much of your '
        + 'life learning where they are. You absorb the mood of a room, '
        + 'imagine other people\'s interior lives vividly, and are most yourself '
        + 'in art, compassion, or any work where ambiguity is the point.',
      moon: 'You feel everything, including what is not yours, and it is hard '
        + 'to tell where your feelings end. You need solitude to recover and '
        + 'art or nature to metabolise; without an outlet the pressure builds '
        + 'until you withdraw.',
      rising: 'You come across as gentle, permeable and a little undefined, '
        + 'and people project onto you more than you would like. You approach '
        + 'new situations by absorbing the atmosphere rather than '
        + 'interrogating it, and you take on more than your share.',
      strengths: 'Empathy, imagination, forgiveness, the ability to see the '
        + 'best in people who are hiding it.',
      challenges: 'Porous boundaries, escapism, martyrdom, and losing track of '
        + 'where you end.',
      bodyParts: 'Feet, lymph system, immune system'
    }
  ];

  root.SMRC.data.elementMeta = {
    fire: {
      label: 'Fire',
      blurb: 'instinct, drive, self-expression',
      missing: 'You are under-indexed on initiative. Starting things, wanting '
        + 'things, and being visible are not natural reflexes for you, which '
        + 'means you have to choose them on purpose. Deliberate action is the '
        + 'only kind that sticks for you.'
    },
    earth: {
      label: 'Earth',
      blurb: 'practicality, body, resources',
      missing: 'You under-index on the practical. Money, routine and concrete '
        + 'next steps are where you are least able to improvise, so build them '
        + 'as systems rather than trusting yourself to remember.'
    },
    air: {
      label: 'Air',
      blurb: 'language, ideas, connection',
      missing: 'You under-index on the mental. Naming what you feel and '
        + 'reasoning your way to a decision are harder for you than doing, so '
        + 'the people who talk you into things are often wrong.'
    },
    water: {
      label: 'Water',
      blurb: 'feeling, instinct, depth',
      missing: 'You under-index on feeling. You process the world by doing and '
        + 'thinking, and emotional undercurrents reach you late, which leaves '
        + 'you sometimes the last to know what was actually going on.'
    }
  };

  root.SMRC.data.modalityMeta = {
    cardinal: 'You start things. Cardinal energy opens doors and gets you to '
      + 'the place where the decision happens.',
    fixed: 'You hold things. Fixed energy sustains what you have begun, which '
      + 'is the part of the cycle nobody sees and everything depends on.',
    mutable: 'You adapt. Mutable energy keeps you responsive, which is a real '
      + 'strength and also the source of most of your scatter.'
  };
})(typeof window !== 'undefined' ? window : globalThis);
