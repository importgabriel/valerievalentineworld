// ========================================
// STORY DATA — 12 CHAPTERS WITH CHOICES
// Gabriel & Valerie's Story
// ========================================

export const chapters = [
  {
    id: 1,
    date: "July 26, 2025",
    title: "The Follow Request",
    doorLabel: "NYC Apartment",
    storyText:
      "It was a regular day during my internship in New York City when my phone buzzed. valerie.rengifo had requested to follow me. I was genuinely shocked — I screenshotted the notification and sent it straight to my good friend Skylar. Something about it felt different.",
    choicePrompt: "valerie.rengifo just requested to follow you. What do you do?",
    choices: [
      {
        text: "Screenshot it and send to Skylar",
        correct: true,
        response:
          "You screenshot the notification and send it straight to Skylar. Something about this felt different...",
      },
      {
        text: "Follow her back immediately",
        correct: false,
        response: "You follow her back right away. Too eager — she notices and it changes the dynamic...",
      },
      {
        text: "Ignore the request for now",
        correct: false,
        response: "You ignore it. Days pass and the moment slips away...",
      },
      {
        text: "DM her right away",
        correct: false,
        response: "Too forward. She leaves you on read. That's not how this story goes...",
      },
    ],
    quote: null,
    hubPosition: { x: -12, z: 8 },

    // Level scene data
    levelModule: "level01-follow-request",
    sequence: [
      // === PHASE 1: SUBWAY CINEMATIC ===
      { type: "fade", direction: "in", duration: 0.5 },
      { type: "scene_swap", targetPhase: "SUBWAY" },
      { type: "fade", direction: "out", duration: 1.0 },
      {
        type: "camera_move",
        from: { x: 0, y: 1.6, z: -8 },
        to: { x: 0, y: 1.6, z: 8 },
        lookAt: { x: 0, y: 1.5, z: 12 },
        duration: 5.0,
        easing: "easeInOutCubic",
      },
      { type: "wait", duration: 0.5 },
      { type: "fade", direction: "in", duration: 1.0 },

      // === PHASE 2: CITY FREE-ROAM ===
      { type: "scene_swap", targetPhase: "CITY" },
      { type: "fade", direction: "out", duration: 1.0 },
      {
        type: "text_bubble",
        text: "NYC. Summer internship. Just another day.",
        style: "speech",
        duration: 3.0,
        offsetY: 0.8,
      },
      { type: "wait", duration: 0.5 },
      {
        type: "free_roam",
        triggerType: "reach_position",
        targetPosition: { x: 0, y: 0, z: 62 },
        radius: 4.0,
      },

      // === PHASE 3: ENTER BUILDING ===
      { type: "fade", direction: "in", duration: 0.8 },
      { type: "scene_swap", targetPhase: "OFFICE" },
      { type: "custom_callback", callbackName: "playDoorAnimation", duration: 0.5 },
      { type: "fade", direction: "out", duration: 0.8 },

      // === PHASE 4: OFFICE FREE-ROAM ===
      {
        type: "text_bubble",
        text: "Time to get to work.",
        style: "speech",
        duration: 2.5,
        offsetY: 0.8,
      },
      { type: "wait", duration: 0.5 },
      {
        type: "interaction",
        targetId: "chair",
        promptText: "Sit down",
      },
      { type: "custom_callback", callbackName: "sitDown", duration: 1.0 },
      { type: "wait", duration: 0.5 },
      { type: "overlay", overlayId: "computer-screen", action: "show" },
      {
        type: "text_bubble",
        text: "Let's get this code review done...",
        style: "speech",
        duration: 2.5,
        offsetY: 0.5,
      },
      { type: "wait", duration: 3.5 },

      // === PHASE 5: PHONE NOTIFICATION ===
      { type: "custom_callback", callbackName: "phoneBuzz", duration: 0.5 },
      { type: "overlay", overlayId: "computer-screen", action: "hide" },
      { type: "wait", duration: 0.8 },
      { type: "overlay", overlayId: "phone-screen", action: "show" },
      { type: "wait", duration: 2.5 },
      {
        type: "text_bubble",
        text: "valerie.rengifo started following you.",
        style: "notification",
        enterAnimation: "rise",
        duration: 3.0,
        offsetY: 0.5,
      },
      { type: "wait", duration: 1.0 },
      { type: "overlay", overlayId: "phone-screen", action: "hide" },
      {
        type: "reaction",
        kind: "surprise",
        duration: 1.5,
      },
      { type: "custom_callback", callbackName: "cameraToChoice", duration: 1.0 },

      // === PHASE 6: CHOICE ===
      { type: "show_choice" },
    ],
  },
  {
    id: 2,
    date: "July 30, 2025",
    title: "The Book Story",
    doorLabel: "Instagram",
    storyText:
      "Four days later, I posted a photo of a book on my Instagram story. She liked it. By then, I knew she was interested. But I was still in New York City, hundreds of miles away — there wasn't much I could do except wait.",
    choicePrompt: "She liked your book story on Instagram. What's your read on this?",
    choices: [
      {
        text: "She's definitely interested",
        correct: true,
        response:
          "You know what this means. She's interested. But you're still in NYC — there's nothing you can do except wait.",
      },
      {
        text: "She's just being friendly",
        correct: false,
        response: "You dismiss it as nothing. But you're wrong — this was a signal...",
      },
      {
        text: "DM her about the book",
        correct: false,
        response: "You slide in about the book. It falls flat — the timing isn't right yet...",
      },
      {
        text: "Post more stories to get her attention",
        correct: false,
        response: "You start posting constantly. It comes off as try-hard...",
      },
    ],
    quote: null,
    hubPosition: { x: -6, z: 18 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 3,
    date: "August 15, 2025",
    title: "Magnolias",
    doorLabel: "Magnolias",
    storyText:
      "My internship wrapped up and I headed home to Athens, Georgia. That night I went to Magnolias — a bar that AKPsi, her professional fraternity, is known to frequent. I went hoping I'd see her. And I did. We talked, both a little drunk, had a great conversation about HSA. It was short, but it was real.",
    choicePrompt:
      "You're back in Athens. It's Friday night. Where do you go?",
    choices: [
      {
        text: "Magnolias — AKPsi goes there",
        correct: true,
        response:
          "You head to Magnolias hoping she'll be there. And she is. You talk, both a little drunk, but the conversation is real. You talk about HSA. It's short, but it's everything.",
      },
      {
        text: "Stay home and rest",
        correct: false,
        response: "You stay in. Another night passes without seeing her...",
      },
      {
        text: "Go to a different bar downtown",
        correct: false,
        response: "You hit a random bar. She's not there. The night feels empty...",
      },
      {
        text: "Text her directly to hang out",
        correct: false,
        response: "You text her out of nowhere. It's too soon — you barely know each other...",
      },
    ],
    quote: null,
    hubPosition: { x: 0, z: 30 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 4,
    date: "August 16, 2025",
    title: "Close Friends",
    doorLabel: "Dinner Spot",
    storyText:
      "The next day, I posted a photo of my dinner on my close friends story. She liked it. These small interactions were starting to add up — each one a quiet signal that maybe this wasn't one-sided.",
    choicePrompt:
      "You just had dinner. What do you post?",
    choices: [
      {
        text: "Post it on close friends story",
        correct: true,
        response:
          "You post your dinner on close friends. She likes it. Another quiet signal. These small moments are adding up.",
      },
      {
        text: "Post it on your main story",
        correct: false,
        response: "You post publicly. She sees it but doesn't engage — it's not personal enough...",
      },
      {
        text: "Send it directly to her",
        correct: false,
        response: "You send it to her DMs. It's weird — you barely know each other like that yet...",
      },
      {
        text: "Don't post anything",
        correct: false,
        response: "You keep it to yourself. Another chance to connect slips by...",
      },
    ],
    quote: null,
    hubPosition: { x: 8, z: 42 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 5,
    date: "August 19, 2025",
    title: "The Reintroduction",
    doorLabel: "HSA Meeting Hall",
    storyText:
      "The Hispanic Student Association held their first GBM of the year — around 200 people packed the room. I spotted her across the crowd. As the event wound down, I caught her eye and waved her over. I made a joke and reintroduced myself.",
    choicePrompt:
      "The HSA GBM is winding down. You spot Valerie talking to friends. What do you do?",
    choices: [
      {
        text: "Wave her down with a joke and reintroduce yourself",
        correct: true,
        response:
          "You catch her eye and wave her over. You make a joke and reintroduce yourself. \"Haven't we already met?\" she says with a smile. You apologize and you both laugh.",
      },
      {
        text: "Wait for her to come to you",
        correct: false,
        response: "You wait... and wait. She never comes over. The event ends and everyone leaves...",
      },
      {
        text: "Send her a text after the event",
        correct: false,
        response: "You text her later, but the moment's gone. In person was the move...",
      },
      {
        text: "Play it cool and don't approach",
        correct: false,
        response: "You play it too cool. She walks out with her friends and you kick yourself...",
      },
    ],
    quote:
      '"Haven\'t we already met?" she said with a smile. I apologized and we both laughed.',
    hubPosition: { x: -10, z: 55 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 6,
    date: "October 22, 2025",
    title: "Three Hours by the Fire",
    doorLabel: "AKPsi House",
    storyText:
      "We both got busy throughout the semester and never saw each other — until ALPHA and AKPsi hosted their Fall Festival. I found her by the campfire and did the same bit — reintroduced myself with the joke. What was supposed to be a quick hello turned into three hours of talking. The fire crackled and the world shrank to just us. She had to leave for church.",
    choicePrompt:
      "You see Valerie at the Fall Festival campfire. It's been months. What do you do?",
    choices: [
      {
        text: 'Do the joke again — reintroduce yourself',
        correct: true,
        response:
          "You walk up and do the same bit — reintroduce yourself. She laughs. What was supposed to be a quick hello turns into three hours by the fire. She has to leave for church.",
      },
      {
        text: "Play it casual — just say hey",
        correct: false,
        response: "A simple 'hey' doesn't land the same way. The conversation fizzles out quickly...",
      },
      {
        text: "Sit near her but don't say anything",
        correct: false,
        response: "You sit close but stay silent. The fire crackles and the opportunity burns away...",
      },
      {
        text: "Bring up the HSA meeting",
        correct: false,
        response: "You mention HSA but it doesn't hit the same way as your joke...",
      },
    ],
    quote: null,
    hubPosition: { x: 4, z: 68 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 7,
    date: "October 31, 2025",
    title: "Get Your Head in the Game",
    doorLabel: "Halloween",
    storyText:
      "Halloween. I saw her story — she was dressed as Troy Bolton from High School Musical. I couldn't resist. I swiped up quoting the iconic song.",
    choicePrompt:
      "She posted a story dressed as Troy Bolton from High School Musical. What do you do?",
    choices: [
      {
        text: 'Swipe up: "Get your head in the game"',
        correct: true,
        response:
          "\"Get your head in the game\" you type. She replies: \"exactlyy you get it.\" She gets your humor. You get hers.",
      },
      {
        text: "Like the story and move on",
        correct: false,
        response: "You just like it. No personality, no connection. She forgets you liked it...",
      },
      {
        text: "Reply with a generic compliment",
        correct: false,
        response: "\"Cool costume!\" Boring. She gives a polite thanks and that's it...",
      },
      {
        text: "Don't respond",
        correct: false,
        response: "You scroll past. Another missed connection...",
      },
    ],
    quote:
      '"Get your head in the game" I said.\n"Exactlyy you get it" she replied.',
    hubPosition: { x: -8, z: 80 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 8,
    date: "November 15, 2025",
    title: "I Only Asked You",
    doorLabel: "UGA Stadium",
    storyText:
      'I heard AKPsi was having a tailgate for the UGA vs Texas game. I slid into her DMs: "Does AKPsi have a tailgate this weekend?" She said yeah and asked if I planned on going. I said maybe — I was trying to see if you were going.',
    choicePrompt:
      "You hear AKPsi has a tailgate for the UGA game. How do you find out more?",
    choices: [
      {
        text: 'DM her: "Does AKPsi have a tailgate?"',
        correct: true,
        response:
          "You DM her about the tailgate. She asks if you're going. \"Maybe — I was trying to see if you were going.\" \"Is Skylar not going?\" \"I only asked you.\" Bold move.",
      },
      {
        text: "Ask Skylar about the tailgate",
        correct: false,
        response: "You ask Skylar instead. You never directly connect with her...",
      },
      {
        text: "Just show up and hope to see her",
        correct: false,
        response: "You show up randomly. She's not there — she had an exam Monday...",
      },
      {
        text: "Skip the tailgate entirely",
        correct: false,
        response: "You skip it. Another missed chance to talk to her...",
      },
    ],
    quote:
      '"Is Skylar not going?" she asked.\n"I only asked you," I said.',
    hubPosition: { x: 6, z: 92 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 9,
    date: "November 17, 2025",
    title: "Peak Feid",
    doorLabel: "Music Corner",
    storyText:
      "Two days later, I posted a story with a song by one of her favorite Colombian artists — Feid. The song was Chorritos Pa Las Animas. She swiped up immediately.",
    choicePrompt:
      'She swiped up on your Feid story saying "peak feid." What do you say?',
    choices: [
      {
        text: '"You know ball... forgot you was Colombian"',
        correct: true,
        response:
          "\"You know ball,\" you reply. \"I forgot you was Colombian.\" It's smooth. It's natural. She laughs.",
      },
      {
        text: '"Thanks! Love that song"',
        correct: false,
        response: "A safe reply. The conversation dies there...",
      },
      {
        text: '"What other Feid songs do you like?"',
        correct: false,
        response: "You go into music nerd mode. She gives a list and the conversation stalls...",
      },
      {
        text: "Heart react and don't reply",
        correct: false,
        response: "You heart it. Lazy response. She doesn't follow up...",
      },
    ],
    quote:
      '"Peak Feid" she said.\n"You know ball," I replied. "I forgot you was Colombian."',
    hubPosition: { x: -5, z: 105 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 10,
    date: "December 5, 2025",
    title: "A Smile Across the Room",
    doorLabel: "Christmas Party",
    storyText:
      "Time passed. School forced us both to lock in. Then the LUL fraternity threw a Christmas party. I was supposed to be in Virginia visiting my little sister, but I'd fallen ill and was stuck in Athens. My roommate forced me out. We showed up two hours late. They asked me to DJ and things were smooth — until I saw a smile cutting through the dark room. A dark blue top. Beautiful brown hair. It was her. Valerie. I stopped everything.",
    choicePrompt:
      "You're DJing at the Christmas party. Then you see her smile across the dark room. What do you do?",
    choices: [
      {
        text: "Stop DJing and walk straight over",
        correct: true,
        response:
          "You stop everything. Walk over. Tap her shoulder. She turns around and does YOUR joke — \"Have we met before?\" You both laugh. You ask for her number. She says yes to Sunday.",
      },
      {
        text: "Keep DJing, talk to her later",
        correct: false,
        response: "You keep spinning. By the time you're done, she's already left...",
      },
      {
        text: "Wave from the DJ booth",
        correct: false,
        response: "You wave awkwardly from behind the decks. She waves back and turns around...",
      },
      {
        text: "Wait for her to come to you",
        correct: false,
        response: "You wait. She never comes over. The night ends without a word...",
      },
    ],
    quote:
      'I tapped her shoulder. She turned around and did MY joke — reintroduced herself. "Have we met before?" We both laughed. I asked for her number.',
    hubPosition: { x: 10, z: 118 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 11,
    date: "December 5, 2025",
    title: "Cookout at 4 AM",
    doorLabel: "Tropical Bar / Cookout",
    storyText:
      "That same night, I ran into her again at the Tropical bar. No joke — I picked her out through the entire crowd because of that smile. She said she was leaving, so I walked out with her and asked if she was hungry. We got in my car and went to Cookout. I told her I'd never been — I lied. She ordered for both of us.",
    choicePrompt:
      "You spot her at the Tropical bar. She says she's leaving. What do you do?",
    choices: [
      {
        text: "Follow her out and ask if she's hungry",
        correct: true,
        response:
          "You walk out with her. \"Are you hungry?\" You drive to Cookout. You say you've never been (you lied). She orders four chicken quesadillas. You talk until 4 AM.",
      },
      {
        text: "Say goodnight and head home",
        correct: false,
        response: "You say goodnight. She leaves. You spend the ride home wondering what if...",
      },
      {
        text: "Ask for her number again",
        correct: false,
        response: "You already have her number from earlier. Asking again is awkward...",
      },
      {
        text: "Stay at the bar with friends",
        correct: false,
        response: "You watch her walk away. Your friends are having fun but you can't stop thinking about that smile...",
      },
    ],
    quote:
      "Four chicken quesadillas. We talked until 4 AM. I dropped her off and couldn't stop smiling the whole way home.",
    hubPosition: { x: -3, z: 130 },
    levelModule: null,
    sequence: null,
  },
  {
    id: 12,
    date: "December 7, 2025",
    title: "12 Hours of Forever",
    doorLabel: "1000 Faces Coffee",
    storyText:
      "That Sunday, we met at 1000 Faces Coffee Shop for our first date. What was supposed to be coffee turned into 12 hours together. Twelve. Hours. We talked about everything and nothing. I didn't even notice time passing — it just flew. That's when I knew. With her, time doesn't exist. It just... disappears.",
    choicePrompt:
      "It's Sunday. Where do you take her for the first date?",
    choices: [
      {
        text: "1000 Faces Coffee Shop",
        correct: true,
        response:
          "1000 Faces. What's supposed to be coffee turns into 12 hours together. Twelve hours. You talk about everything and nothing. Time doesn't exist with her. It just disappears.",
      },
      {
        text: "A fancy dinner downtown",
        correct: false,
        response: "A fancy dinner is nice but too formal. This isn't your story...",
      },
      {
        text: "A movie",
        correct: false,
        response: "A movie means you can't talk. And talking is everything with her...",
      },
      {
        text: "Cookout again",
        correct: false,
        response: "Cookout was special at 4 AM. During the day? Not the same magic...",
      },
    ],
    quote: null,
    hubPosition: { x: 0, z: 145 },
    levelModule: null,
    sequence: null,
  },
];
