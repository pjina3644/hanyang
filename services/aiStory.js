const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";

// 랜덤 재미 테마 풀
export const STORY_THEMES = [
  { id: 'idol', name: '🎤 아이돌의 비밀 연애', desc: '최애 아이돌 그룹 멤버가 나에게 갑자기 고백을?! 비밀 연애를 지켜내야 한다!' },
  { id: 'drama', name: '📺 로맨스 드라마 빙의', desc: '눈떠보니 어제 욕하면서 보던 막장 로맨스 드라마 속 서브 주인공이 되었다!' },
  { id: 'school', name: '🏫 학교 서열 1위의 집착', desc: '조용히 살고 싶었는데 전교 서열 1위 일진이 나에게 집착하기 시작했다!' },
  { id: 'beauty', name: '✨ 신비한 뷰티 앱', desc: '걸음수만큼 얼굴이 예뻐지고 능력이 올라가는 기묘한 뷰티 시스템을 얻었다!' },
  { id: 'rofan', name: '👸 판타지 소설 속 악녀', desc: '남주들을 파멸시키는 소설 속 최고 부자 악역 영애로 환생해 버렸다!' },
  { id: 'superpower', name: '⚡ 수능 대박 초능력', desc: '전교 꼴찌였던 내가 수능 일주일 전에 기적의 만렙 초능력을 각성했다!' },
  { id: 'game', name: '🎮 현실의 게임화', desc: '눈앞에 퀘스트 창이 뜨기 시작했다! 하루 만보를 걷지 않으면 패널티가 온다?!' },
  { id: 'cat', name: '🐱 냥펀치 길들이기', desc: '하찮고 포악한 길고양이가 나를 집사로 간택했다! 냥이 비위 맞추기 대작전!' },
];

export function getRandomTheme() {
  return STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
}

// 테마별 오프라인 백업 스토리 (API 키 없을 때 사용)
const OFFLINE_STORIES = {
  idol: [
    {
      content: `최애 아이돌이 나에게 갑자기 문자를 보냈다. "오늘 ${'{steps}'}보 걸었네? 좀 귀엽다." 이게 꿈이야 생시야? 우리 둘만 아는 비밀 계정으로 온 연락. 심장이 터질 것 같지만, 사생팬들과 파파라치의 눈을 피해 최애를 만나러 가야 한다. 마스크와 모자를 푹 눌러쓰고 무작위 골목길을 빠른 걸음으로 걷기 시작했다.`,
      options: [
        { text: "최애의 대기실로 몰래 들어가는 변장 루트를 선택한다.", costPoints: 30 },
        { text: "파파라치를 속이기 위해 완전히 반대 방향으로 도망친다.", costPoints: 50 }
      ]
    }
  ],
  drama: [
    {
      content: `눈을 떴더니 화려한 샹들리에와 드레스룸이 보였다. 어제 침대에 누워 욕하며 보던 드라마 [상속자들의 로맨스] 속 시한부 악역 서브 여주가 된 것이다! 내가 죽을 운명을 피하려면 드라마 스토리라인을 꼬아야 한다. 마침 오늘 드라마 속 여주인공을 괴롭히는 첫 장면이 시작되려 한다.`,
      options: [
        { text: "여주인공을 괴롭히는 대신 돈 봉투를 쥐여주며 친해진다.", costPoints: 40 },
        { text: "남자 주인공의 뺨을 때려 스토리 전개를 아예 박살 낸다.", costPoints: 25 }
      ]
    }
  ],
  school: [
    {
      content: `전교 서열 1위 '강해진'이 복도에서 내 앞을 가로막았다. "너 왜 나 피해 다녀?" 심지어 나를 향해 싸늘하게 웃고 있다. 그냥 전학 와서 조용히 급식만 먹고 싶었는데, 내 덤덤한 태도가 그의 소유욕을 자극했나 보다. 녀석의 눈빛이 심상치 않다.`,
      options: [
        { text: `"급식 먹으러 가는 길이라 바빠."라며 녀석을 밀치고 지나간다.`, costPoints: 35 },
        { text: `"귀엽네." 한마디를 던지며 녀석의 머리를 쓰다듬어 준다.`, costPoints: 20 }
      ]
    }
  ],
  beauty: [
    {
      content: `내 스마트폰에 [만보 뷰티 메이커]라는 이상한 앱이 설치되었다. 하루 걸음수가 누적될수록 내 외모 스텟이 실시간으로 상승한다! 오늘은 총 ${'{steps}'}보를 걸었더니, 거울 속 내 피부가 물광 피부로 변해 있었다. 그리고 앱에서 새로운 퀘스트가 도착했다: "학교 퀸카의 시기 어린 시선을 극복하라."`,
      options: [
        { text: "상승한 외모 스텟을 활용해 당당하게 정면 승부한다.", costPoints: 45 },
        { text: "안경을 쓰고 미모를 숨겨 상황을 조용히 관망한다.", costPoints: 30 }
      ]
    }
  ],
  rofan: [
    {
      content: `로맨스 판타지 소설 속 희대의 악녀 '진아' 공녀로 빙의했다. 다행히 아버지는 제국 최고 부자 공작이고, 내 통장 잔고는 상상을 초월한다! 어차피 남주들은 원작 여주에게 갈 테니, 나는 이 막대한 부를 누리며 쇼핑이나 즐기기로 결심했다. 오늘 백화점 VIP실로 걷는 발걸음이 너무 가볍다.`,
      options: [
        { text: "백화점을 통째로 인수해서 내 전용 놀이터로 만든다.", costPoints: 20 },
        { text: "원작에서 몰락할 예정인 불쌍한 서브 남주를 돈으로 구원한다.", costPoints: 50 }
      ]
    }
  ],
  superpower: [
    {
      content: `수능 일주일 전, 기적처럼 내 머릿속에 [우주 만물 백과사전] 초능력 시스템 창이 떴다! 걸음수 100보당 1문제의 수능 정답을 미리 알려주는 사기적인 초능력이다. 오늘 ${'{steps}'}보를 걸었으니 이미 50문제의 정답을 확보했다. 그런데 수능 고사장으로 향하는 길, 내 초능력을 눈치챈 의문의 검은 양복들이 나를 둘러싸기 시작했다.`,
      options: [
        { text: "초능력 스텟을 '민첩성'에 몰빵하여 고사장까지 순간 이동급으로 뛰어간다.", costPoints: 25 },
        { text: "당당히 멈춰 서서 수능 3점짜리 수학 문제의 해법을 염력으로 녀석들에게 쏜다.", costPoints: 35 }
      ]
    }
  ],
  game: [
    {
      content: `갑자기 내 시야에 파란색 [퀘스트 창]이 팝업되었다. [일일 퀘스트: 만보 걷기. 미달성 시 24시간 동안 몸이 돼지로 변함]. 장난인 줄 알았는데 귀가 돼지 귀로 변하기 시작했다! 살기 위해 무조건 걸어야 한다. 오늘 ${'{steps}'}보를 걸으며 필사적으로 좀 더 속도를 내기 시작했다.`,
      options: [
        { text: "동네 헬스장으로 뛰어가서 러닝머신 스피드를 최고로 올린다.", costPoints: 20 },
        { text: "이왕 이렇게 된 거 귀여운 아기 돼지 코스프레를 하며 사람들의 관심을 모은다.", costPoints: 40 }
      ]
    }
  ],
  cat: [
    {
      content: `오늘 골목길에서 뚱뚱하고 사나운 치즈 고양이와 마주쳤다. 녀석은 내 발목을 냥펀치로 때리더니 앞장서서 걸어가기 시작했다. "인간, 따라와라. 집사로 간택해주지."라는 듯한 눈빛. 녀석의 꼬리가 도도하게 흔들린다. 간택된 이상 책임져야 한다.`,
      options: [
        { text: "편의점점으로 뛰어가서 최고급 츄르와 캔사료를 바친다.", costPoints: 30 },
        { text: "도도한 척 연기하며 고양이가 먼저 안겨 오도록 밀당을 시도한다.", costPoints: 20 }
      ]
    }
  ],
};

export async function generateNextStorySegment(history, userChoice = "", theme = null, currentSteps = 0, nickname = '주인공') {
  const activeTheme = theme || getRandomTheme();

  // 만약 두 API 키 모두 없으면 오프라인 백업을 사용합니다.
  if (!GEMINI_API_KEY && !OPENROUTER_API_KEY) {
    // 오프라인 분기 사용
    const themeStories = OFFLINE_STORIES[activeTheme.id] || OFFLINE_STORIES['idol'];
    const idx = Math.min(history.length, themeStories.length - 1);
    const branch = themeStories[idx] || themeStories[0];

    await new Promise(resolve => setTimeout(resolve, 1200));

    // 걸음수 + 닉네임 치환
    const content = branch.content
      .replace('{steps}', currentSteps.toLocaleString())
      .replace(/주인공/g, nickname);

    return { content, options: branch.options, themeId: activeTheme.id };
  }

  const historyText = history.length > 0
    ? history.map((h, i) => `[챕터 ${i + 1}] ${h.content} ${h.selectedOption ? `(선택: ${h.selectedOption})` : ''}`).join('\n\n')
    : '(스토리 시작 전)';

  const prompt = `
역할: 너는 10대, 20대 청소년들이 열광하는 카카오페이지/네이버시리즈의 초인기 로맨스 판타지, 학원코믹물 웹소설 작가야.
테마: ${activeTheme.name} — ${activeTheme.desc}
주인공 이름/닉네임: ${nickname}
오늘 주인공의 걸음수: ${currentSteps.toLocaleString()}보

기존 스토리:
${historyText}

사용자의 최신 선택: "${userChoice || '(첫 시작)'}"

지침:
1. 위 테마에 맞게 아주 트렌디하고, 클리셰가 가득하며 몰입감 넘치는 청춘/빙의/로맨스/판타지 웹소설을 이어서 써줘. 독자가 설레거나 빵 터지도록 유머와 독백, 생생한 대사, 감성을 듬뿍 넣어줘.
2. 오늘 걸음수(${currentSteps.toLocaleString()}보)를 이야기 속에 아주 자연스럽게 녹여줘. (예: 너무 뛰어서 숨이 찬 상황, 학교 운동장을 돌고 있는 상황 등)
3. 주인공 이름은 반드시 '${nickname}'으로 불러줘.
4. 한국어로 8~12문장 분량으로 몰입감 있게 써줘. 웹소설 특유의 속도감 있는 독백과 대사를 적극적으로 살려줘.
5. 이야기 끝에 선택지 2개를 만들어줘. 각 선택지는 상황을 더 아슬아슬하거나 코믹하게 만드는 흥미진진한 선택이어야 해.
6. 캐릭터 성장(돼지)이나 진화 이야기는 절대 쓰지 마. 오직 선택한 테마에 집중해줘.

출력: 마크다운 없이 순수 JSON만. 형식:
{"content":"스토리 내용","options":[{"text":"선택지1","costPoints":30},{"text":"선택지2","costPoints":20}]}
`;


  // 1. 제미나이 API 키가 있으면 제미나이를 사용합니다.
  if (GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await response.json();
      const raw = data.candidates[0].content.parts[0].text.trim();
      const clean = raw.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      return { content: result.content, options: result.options, themeId: activeTheme.id };
    } catch (error) {
      console.error("Gemini 호출 실패, OpenRouter/오프라인으로 폴백 시도:", error);
    }
  }

  // 2. 오픈라우터 API 키가 있으면 오픈라우터를 사용합니다 (만 18세 미만 무료 모델 지원).
  if (OPENROUTER_API_KEY) {
    try {
      const url = "https://openrouter.ai/api/v1/chat/completions";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/pjina3644/hanyang',
          'X-Title': 'Pinky Fitness'
        },
        body: JSON.stringify({
          model: "google/gemma-2-9b-it:free",
          messages: [{ role: "user", content: prompt }]
        })
      });

      const data = await response.json();
      const raw = data.choices[0].message.content.trim();
      const clean = raw.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      return { content: result.content, options: result.options, themeId: activeTheme.id };
    } catch (error) {
      console.error("OpenRouter 호출 실패:", error);
    }
  }

  // 3. 둘 다 실패하거나 키가 없으면 오프라인 백업을 사용합니다.
  const themeStories = OFFLINE_STORIES[activeTheme.id] || OFFLINE_STORIES['idol'];
  const branch = themeStories[0];
  return {
    content: branch.content.replace('{steps}', currentSteps.toLocaleString()).replace(/주인공/g, nickname),
    options: branch.options,
    themeId: activeTheme.id,
  };
}

export async function generateAIPenaltySMS(currentSteps = 0, nickname = '주인공', theme = null, duoName = null) {
  const activeTheme = theme || STORY_THEMES[0];
  const duoContext = duoName ? `(참고: ${duoName}과 2인 연대책임 듀오 상태로 함께 실패함)` : "";
  const prompt = `
역할: 너는 10대들이 좋아하는 유머러스하고 킹받는 감성의 한국 웹소설 작가야.
상황: 주인공 '${nickname}'이 오늘 목표 걸음수를 달성하지 못해서 친구에게 보내는 반성 사죄 문자메시지를 작성해야 해.
오늘 걸음수: ${currentSteps.toLocaleString()}보
선택한 테마: ${activeTheme.name}
${duoContext}

지침:
1. 친구가 읽자마자 빵 터지거나 킹받을 정도로 처절하고 유머러스한 어조로 작성해줘.
2. 10대 고등학생/대학생 유행어나 억울한 감성을 담아줘.
3. 오늘 걸음수(${currentSteps.toLocaleString()}보)와 닉네임(${nickname}), 그리고 테마(${activeTheme.name})의 컨셉을 문장에 아주 자연스럽게 한 번 녹여줘. (예: 드라마 빙의했는데 주인공이 300보 걷다가 기절했다는 식)
4. 공백 포함 90자 내외(SMS 한 통 분량)로 짧고 강력하게 단 한 줄(혹은 두 줄)로만 작성해줘. 마크다운이나 따옴표 등 일체의 부가 텍스트 없이 오직 문자메시지 본문 텍스트만 출력해줘.
`;

  // 1. Gemini API 키가 있으면 Gemini를 사용합니다.
  if (GEMINI_API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const txt = data.candidates[0].content.parts[0].text.trim();
      return txt.replace(/["']/g, ''); // 따옴표 제거
    } catch (e) {
      console.error("Gemini SMS generation failed:", e);
    }
  }

  // 2. OpenRouter API 키가 있으면 OpenRouter를 사용합니다 (Gemma 2 모델).
  if (OPENROUTER_API_KEY) {
    try {
      const url = "https://openrouter.ai/api/v1/chat/completions";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://github.com/pjina3644/hanyang',
          'X-Title': 'Pinky Fitness'
        },
        body: JSON.stringify({
          model: "google/gemma-2-9b-it:free",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      const txt = data.choices[0].message.content.trim();
      return txt.replace(/["']/g, '');
    } catch (e) {
      console.error("OpenRouter SMS generation failed:", e);
    }
  }

  // 로컬 폴백
  return `📢 [걸음수 실패] ${nickname}이가 오늘 ${activeTheme.name} 세계관에서 단 ${currentSteps.toLocaleString()}보만 걷고 게으름을 부렸습니다. 저 대신 혼내주세요! 🐷`;
}

