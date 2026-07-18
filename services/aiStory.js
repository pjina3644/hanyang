const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

// 랜덤 재미 테마 풀
export const STORY_THEMES = [
  { id: 'zombie', name: '🧟 좀비 아포칼립스', desc: '세상이 좀비로 가득 찬 종말 세계에서 살아남아야 한다' },
  { id: 'space', name: '🚀 우주 탐험대', desc: '은하계를 누비는 우주탐험대의 예측불가 우주 어드벤처' },
  { id: 'idol', name: '🎤 아이돌 데뷔 프로젝트', desc: '걸음수로 연습생 생활을 버티며 아이돌 데뷔를 노린다' },
  { id: 'isekai', name: '⚔️ 이세계 전생', desc: '걷다가 갑자기 이세계에 떨어져 용사가 되어야 한다' },
  { id: 'cooking', name: '👨‍🍳 쉐프 서바이벌', desc: '전국 최강의 요리사를 뽑는 서바이벌 쇼에 출전한다' },
  { id: 'timetravel', name: '⏰ 시간여행자', desc: '걸음수로 과거와 미래를 넘나드는 시간여행자의 이야기' },
  { id: 'detective', name: '🔍 탐정 사무소', desc: '이상한 사건만 골라 터지는 엽기 탐정 사무소 운영기' },
  { id: 'magic', name: '🧙 마법학교 낙제생', desc: '마법학교에서 최하위 성적으로 버티며 살아남는 이야기' },
];

export function getRandomTheme() {
  return STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)];
}

// 테마별 오프라인 백업 스토리 (API 키 없을 때 사용)
const OFFLINE_STORIES = {
  zombie: [
    {
      content: `오늘도 좀비들 사이를 뚫고 편의점까지 갔다 왔다. 총 ${'{steps}'}보. 나름 선방이다.\n\n편의점 선반은 텅 비어 있었는데, 구석에서 유통기한 2년 지난 참깨라면 3개를 발견했다. 이게 지금 세상에서는 대한민국 최고급 미식이다. 라면을 품에 안고 돌아오는 길, 좀비 하나가 나를 보더니 코를 킁킁거렸다. 아, 이 녀석도 라면 냄새를 맡은 건지 나를 먹으려는 건지 모르겠지만... 일단 뛰었다. 무조건 뛰었다. 숨이 턱까지 차도 멈출 수 없었다. 결국 베이스캠프 문을 잠그고 나서야 깨달았다. 이게 오늘의 운동이었다는 것을.`,
      options: [
        { text: "옥상에 올라가서 주변 지형을 스캔한다. 더 안전한 보급로를 찾아본다.", costPoints: 30 },
        { text: "만난 좀비가 라면 냄새에 반응했다는 게 수상하다. 직접 다가가서 확인해본다.", costPoints: 50 }
      ]
    }
  ],
  space: [
    {
      content: `오늘 우주선 안에서 ${'{steps}'}보를 걸었다. 선장님이 칭찬해줬다. "우주인은 체력이 생명이야."\n\n사실 우주선이 항법 컴퓨터가 고장 나서 우리는 지금 완전히 엉뚱한 은하에 표류 중이다. 지구에서 약 23광년 떨어진 곳. GPS는커녕 와이파이도 안 잡힌다. 그나마 다행인 건, 바로 옆에 수상한 행성이 하나 있다는 것. 대기가 있고, 녹색 빛이 난다. 승무원들은 반반으로 나뉘었다. "내려가자" vs "절대 내려가지 말자". 선장님은 나에게 결정권을 넘겼다. 이 우주선에서 가장 많이 걷는 사람이 제일 멀쩡한 판단력을 가지고 있다고.`,
      options: [
        { text: "행성에 착륙해서 직접 확인한다. 나쁜 것보다 모르는 게 더 무서우니까.", costPoints: 40 },
        { text: "행성 주위를 공전하면서 스캔 데이터를 더 수집한다. 신중하게.", costPoints: 25 }
      ]
    }
  ],
  idol: [
    {
      content: `오늘 연습실에서 ${'{steps}'}보를 걸었다. 사실 절반은 기획사 복도에서 PD님 피해 다닌 거다.\n\n데뷔 D-47일. 우리 팀 막내가 오늘 눈물을 터뜨렸다. 무대 리허설에서 박자를 세 번 틀렸다고. 나는 어깨를 두드려 줬지만 솔직히 나도 위기다. 오늘 PD님이 나를 불러서 말했다. "너 지금 최하위야." 탈락 위기. 하지만 포기는 없다. 내가 이 연습실에 들어온 이유를 떠올렸다. 동네 오디션에서 '너 걸음걸이가 독특하다'는 소리 듣고 지원했던 그날을. 오늘 밤도 연습하자. 땀이 배신하지 않으면 무대가 배신하지 않는다.`,
      options: [
        { text: "PD님한테 직접 찾아가서 특기를 어필한다. 적극적으로 존재감을 드러낸다.", costPoints: 35 },
        { text: "오늘 밤 12시까지 혼자 연습실에 남아서 문제 파트를 완벽하게 마스터한다.", costPoints: 20 }
      ]
    }
  ],
  isekai: [
    {
      content: `오늘 이세계에서 ${'{steps}'}보를 걸었다. 마왕성까지 아직 멀었다.\n\n전생하기 전 나는 평범한 직장인이었다. 퇴근길에 차에 치인 것 같은데... 눈을 떠보니 갑옷을 입고 있었고 옆에 요정이 "용사님! 이 세계를 구해주세요!"라고 외치고 있었다. 요정 이름은 룰루. 키는 30cm인데 목소리가 확성기 수준이다. 룰루 말로는 내 전생 스텟이 '걷기 특화형 용사'라고. 마법도 없고 검술도 없는데, 대신 걸을수록 강해진다. 오늘 몬스터 다섯 마리 잡은 것도 사실 그냥 무한 뺑뺑이 돌리다가 녀석들이 지쳐 쓰러진 거다. 이거 진짜 용사가 맞나?`,
      options: [
        { text: "마왕성 직행. 어차피 걸을수록 강해지니까 빨리 가서 빨리 끝내자.", costPoints: 45 },
        { text: "근처 마을에 들러서 정보를 수집하고 주민들의 사이드 퀘스트를 해결해준다.", costPoints: 30 }
      ]
    }
  ],
  cooking: [
    {
      content: `오늘 주방에서 ${'{steps}'}보를 걸었다. 요리는 체력이다. 이 바닥 10년 하면서 배운 유일한 진실.\n\n'전국 쉐프 서바이벌 시즌 12'. 오늘 첫 번째 미션은 '30분 안에 냉장고에 있는 재료로 심사위원 감동시키기'. 냉장고를 열었더니 두부 반 모, 고추장, 어젯밤 남은 밥, 그리고 누가 넣어뒀는지 모를 바나나 한 개. 옆 참가자는 이미 화려한 플레이팅을 시작했고 나는 두부를 들고 멍하니 서 있었다. 그 순간 어머니가 해주시던 두부조림이 떠올랐다. 단순하지만 진심이 담긴 요리. 나는 움직이기 시작했다. 30분은 생각보다 짧고, 맛은 생각보다 정직하다.`,
      options: [
        { text: "어머니의 두부조림 레시피 그대로 한다. 정성과 추억이 최고의 재료다.", costPoints: 20 },
        { text: "두부를 베이스로 퓨전 창작 요리에 도전한다. 바나나도 활용한다.", costPoints: 50 }
      ]
    }
  ],
  timetravel: [
    {
      content: `오늘 시간여행하면서 ${'{steps}'}보를 걸었다. 과거에도 미래에도 걷기는 기본이더라.\n\n시간여행 방법이 웃기게도 '만보 이상 걷기'다. 그걸 발견한 게 3개월 전. 오늘은 1997년으로 갔다. 외환위기 직전. 거리에 삐삐를 차고 다니는 사람들, PC방이 막 생기던 시절. 나는 튀지 않으려고 청바지에 흰 티를 입었는데, 알고 보니 그게 이 시대 완전 트렌드였다. 운 좋게도. 문제는 현재로 돌아오려면 또 만보를 채워야 한다는 것. 그리고 97년 서울에서 내 폰은 당연히 먹통이다. 지도도 없다. 이 시대 지리를 알 방법이 없다.`,
      options: [
        { text: "당시 사람에게 말을 걸어서 주요 랜드마크를 물어보고 지도를 구한다.", costPoints: 25 },
        { text: "기억 속 97년대 지리를 더듬어서 혼자 걸어 나간다. 왠지 기억날 것 같다.", costPoints: 35 }
      ]
    }
  ],
  detective: [
    {
      content: `오늘 사건 현장을 돌아다니며 ${'{steps}'}보를 걸었다. 탐정은 발품을 팔아야 한다.\n\n오늘 의뢰는 '우리 집 고양이가 매일 밤 어딜 가는지 알아달라'는 것이었다. 의뢰인은 70대 할머니. 사례비는 호박전 한 접시. 나는 전문적으로 고민했다. 이게 탐정 일이 맞나? 하지만 배가 고팠다. 밤새 고양이 뒤를 밟았다. 골목 세 개, 담장 다섯 개, 그리고 편의점 한 곳. 충격적인 결말: 고양이는 편의점 알바 청년에게 매일 참치캔을 얻어먹고 있었다. 그 청년도 외로웠고 고양이도 참치가 좋았던 거다. 할머니한테 보고했더니 눈물을 글썽이시고... 호박전을 두 접시 주셨다.`,
      options: [
        { text: "편의점 청년에게 상황을 설명하고 할머니와 공식 면담을 주선한다.", costPoints: 20 },
        { text: "더 큰 사건의 냄새가 난다. 그 편의점을 더 조사해본다.", costPoints: 40 }
      ]
    }
  ],
  magic: [
    {
      content: `오늘 마법학교 캠퍼스를 ${'{steps}'}보 걸었다. 전교 꼴찌는 어디를 가도 눈에 띈다.\n\n마법학교 1학년 중간고사 결과가 나왔다. 성적표에는 'F, F, F, F, F' 다섯 과목 전부 낙제. 그나마 체육은 A+. '마법봉 없이 몬스터 피하기' 과목. 달리기 특기를 활용했더니 최고점이 나왔다. 담임 선생님이 나를 불러 말했다. "자네... 마법 재능이 없는 게 아니라 다른 종류의 재능이 있는 것 같아." 무슨 뜻이냐고 물었더니, "마법사에도 종류가 있다네. 걸을수록 강해지는 '보행 마법사'라는 고대 직업이 있어. 1000년간 아무도 등장하지 않았지만." 갑자기 내가 특별한 사람이 된 것 같은데... 진짜인지 위로인지 모르겠다.`,
      options: [
        { text: "담임 선생님께 보행 마법사에 대해 더 자세히 물어보고 수련을 요청한다.", costPoints: 30 },
        { text: "도서관에서 보행 마법사 관련 고서를 직접 찾아본다. 혼자 공부한다.", costPoints: 20 }
      ]
    }
  ],
};

export async function generateNextStorySegment(history, userChoice = "", theme = null, currentSteps = 0, nickname = '주인공') {
  const activeTheme = theme || getRandomTheme();

  if (!GEMINI_API_KEY) {
    // 오프라인 분기 사용
    const themeStories = OFFLINE_STORIES[activeTheme.id] || OFFLINE_STORIES['zombie'];
    const idx = Math.min(history.length, themeStories.length - 1);
    const branch = themeStories[idx] || themeStories[0];

    await new Promise(resolve => setTimeout(resolve, 1200));

    // 걸음수 + 닉네임 치환
    const content = branch.content
      .replace('{steps}', currentSteps.toLocaleString())
      .replace(/주인공/g, nickname);

    return { content, options: branch.options, themeId: activeTheme.id };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const historyText = history.length > 0
      ? history.map((h, i) => `[챕터 ${i + 1}] ${h.content} ${h.selectedOption ? `(선택: ${h.selectedOption})` : ''}`).join('\n\n')
      : '(스토리 시작 전)';

    const prompt = `
역할: 너는 재미있고 유머러스한 한국 웹소설 작가야.
테마: ${activeTheme.name} — ${activeTheme.desc}
주인공 이름/닉네임: ${nickname}
오늘 주인공의 걸음수: ${currentSteps.toLocaleString()}보

기존 스토리:
${historyText}

사용자의 최신 선택: "${userChoice || '(첫 시작)'}"

지침:
1. 위 테마에 맞는 유머러스하고 예측불가능한 이야기를 이어서 써줘. 
2. 오늘 걸음수(${currentSteps.toLocaleString()}보)를 이야기 속에 자연스럽게 녹여줘.
3. 주인공 이름은 반드시 '${nickname}'으로 불러줘.
4. 한국어로 8~12문장 분량으로 길고 몰입감 있게 써줘. 반전이나 웃긴 상황을 넣어줘.
5. 이야기 끝에 선택지 2개를 만들어줘. 각 선택지는 상황을 더 재밌고 엉뚱하게 만들어야 해.
6. 돼지 성장 스토리는 절대 쓰지 마. 테마에 맞는 이야기만.

출력: 마크다운 없이 순수 JSON만. 형식:
{"content":"스토리 내용","options":[{"text":"선택지1","costPoints":30},{"text":"선택지2","costPoints":20}]}
`;

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
    console.error("Gemini 호출 실패, 오프라인 백업 사용:", error);
    const themeStories = OFFLINE_STORIES[activeTheme.id] || OFFLINE_STORIES['zombie'];
    const branch = themeStories[0];
    return {
      content: branch.content.replace('{steps}', currentSteps.toLocaleString()).replace(/주인공/g, nickname),
      options: branch.options,
      themeId: activeTheme.id,
    };
  }
}
