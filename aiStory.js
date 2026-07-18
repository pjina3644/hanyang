// Gemini API Key (환경변수 주입용)
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

// 오프라인/Mock 테스트를 위한 미리 준비된 스토리 분기 (해커톤 현장 네트워크 마비나 API 키 만료 대비)
const OFFLINE_STORY_BRANCHES = {
  0: {
    content: "당신은 게으른 아기돼지 핑키입니다. 거울을 보며 몸무게에 충격을 받아 드디어 첫걸음을 내딛기로 결심했습니다. 숲길을 걷던 중, 길가에 쓰러져 있는 작은 요정을 발견했습니다. 당신은 요정에게 다가갑니다. 요정이 약한 목소리로 말합니다. '배가 너무 고파요... 저 나무 꼭대기에 있는 황금 사과를 따다 줄 수 있나요?'",
    options: [
      { text: "힘들지만 50보를 더 걸어서 나무 위로 올라가 황금 사과를 딴다.", nextStep: 1, costPoints: 50 },
      { text: "주변에 떨어진 다른 과일을 대충 찾아서 준다.", nextStep: 2, costPoints: 20 }
    ]
  },
  1: {
    // 황금 사과를 딴 루트
    content: "땀을 뻘뻘 흘리며 황금 사과를 요정에게 가져다주었습니다. 요정은 감격하며 사과를 한 입 먹더니 기력을 회복했습니다! '정말 감사합니다. 보답으로 당신에게 신비한 활력의 기운을 불어넣어 드릴게요!' 요정이 요술봉을 흔들자 당신의 몸에 단단한 근육의 선이 살짝 돋아나기 시작했습니다! 핑키의 귀가 좀 더 쫑긋해지고 힘이 넘칩니다. 요정은 다음 숲의 비밀 온천으로 가보라고 제안합니다.",
    options: [
      { text: "온천으로 가서 근육 피로를 풀며 다음 단계를 대비한다 (100보 필요)", nextStep: 3, costPoints: 80 },
      { text: "요정에게 지름길을 알려달라고 떼를 쓴다", nextStep: 4, costPoints: 40 }
    ]
  },
  2: {
    // 대충 과일 준 루트
    content: "바닥에 떨어진 찌그러진 감을 요정에게 건넸습니다. 요정은 시큰둥하게 받아먹으며 말했습니다. '이걸 주다니... 뭐 그래도 살았네요. 고마움의 뜻으로 약간의 걸음 버프를 줄게요.' 요정이 손가락을 퉁기자 당신의 걸음 소리가 좀 더 가벼워졌지만 외형적인 변화는 아직 미미합니다. 핑키는 왠지 찝찝한 마음을 품고 계속 길을 걷기로 합니다.",
    options: [
      { text: "마음을 고쳐먹고 150보를 걸어 큰길로 나아간다", nextStep: 5, costPoints: 60 },
      { text: "그냥 그 자리에 주저앉아 쉰다", nextStep: 6, costPoints: 10 }
    ]
  },
  // 더 많은 오프라인 분기를 가볍게 추가해 두어 데모 완성도를 높임
  3: {
    content: "비밀 온천에 도착하여 온몸의 피로를 씻어냈습니다! 핑키의 피부가 매끄러워지고 체지방이 획기적으로 줄어들어 한층 날씬한 '사춘기 멋쟁이 돼지'로 변신했습니다! 이때 온천 근처 동굴에서 수상한 빛이 뿜어져 나옵니다. 들어가 보시겠습니까?",
    options: [
      { text: "용기를 내어 동굴 안을 탐험한다 (포인트 100 소모)", nextStep: 7, costPoints: 100 },
      { text: "무서우니 마을로 도망쳐 걸음 수를 더 쌓는다", nextStep: 8, costPoints: 30 }
    ]
  }
};

/**
 * Gemini 1.5 Flash API를 fetch를 이용해 호출하여 연속성 있는 다음 이야기를 생성합니다.
 * @param {Array} history - 이전까지 진행된 스토리 객체 배열 (id, content, selectedOption 등 포함)
 * @param {string} userChoice - 이번에 선택한 선택지 텍스트
 * @returns {Promise<{content: string, options: Array<{text: string, costPoints: number}>}>}
 */
export async function generateNextStorySegment(history, userChoice = "") {
  // 1. API 키가 없거나 테스트용인 경우 오프라인 Mock 데이터 작동
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    console.log("Using Offline Story Branch...");
    const lastStep = history.length > 0 ? history[history.length - 1] : { nextStep: 0 };
    const currentStepIndex = lastStep.nextStep !== undefined ? lastStep.nextStep : 0;
    const branch = OFFLINE_STORY_BRANCHES[currentStepIndex] || OFFLINE_STORY_BRANCHES[0];

    // 지연 효과 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      content: branch.content,
      options: branch.options,
      nextStep: branch.options[0]?.nextStep || 0 // 다음 단계를 추적하기 위함
    };
  }

  // 2. Gemini API Key가 존재할 때, Fetch 호출 진행
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // 프롬프트 컨텍스트 작성
    const promptContext = `
역할: 너는 걷기 운동을 장려하는 게임화 모바일 앱의 스토리 작가야.
주인공: 게으른 아기돼지 핑키 (걸으면 걸을수록 멋지게 변신하고 성장함).
기존 스토리 이력:
${history.map((h, i) => `단계 ${i+1}: ${h.content} ${h.selectedOption ? `(선택한 행동: ${h.selectedOption})` : ''}`).join('\n')}

사용자의 최신 선택: "${userChoice}"

미션:
1. 사용자의 최근 선택에 이어지는 흥미진진하고 동기부여가 되는 짧은 스토리 단락(한국어 4~5문장 내외)을 작성해줘.
2. 주인공 핑키의 신체적 성장이나 긍정적 변화(예: 조금 가벼워진 몸, 단단해진 근육 등)를 스토리에 자연스럽게 녹여줘.
3. 스토리가 끝난 후, 주인공이 나아갈 수 있는 두 가지 선택지(Option)를 생성해줘. 각 선택지에는 가상의 포인트 소모값(10~50포인트 사이)을 지정해줘.

출력 포맷: 반드시 아래의 JSON 형식으로만 응답해줘. 어떠한 마크다운 기호(\`\`\`json 등)도 포함하지 말고 오직 순수 JSON 데이터만 출력해야해.
{
  "content": "생성된 스토리 내용",
  "options": [
    { "text": "선택지 1의 텍스트", "costPoints": 30 },
    { "text": "선택지 2의 텍스트", "costPoints": 20 }
  ]
}
`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptContext }]
        }]
      })
    });

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text.trim();
    
    // JSON 파싱 (혹시 모를 마크다운 래퍼 제거)
    const cleanJSON = responseText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleanJSON);
    
    return {
      content: result.content,
      options: result.options,
      nextStep: (history.length > 0 ? history[history.length - 1].nextStep || 0 : 0) + 1 // 동적 증가
    };

  } catch (error) {
    console.error("Gemini Story Generation failed, falling back to offline content:", error);
    // 통신 장애 시 오프라인 백업 작동
    return {
      content: "차원의 벽에 일시적인 균열이 생겼습니다! 핑키의 눈앞이 흐려지며 다음 길이 보이지 않습니다. 잠시 후 다시 시도하거나, 로컬 저장된 시나리오로 계속합니다.",
      options: [
        { text: "가까운 나무 그늘에서 쉬며 재부팅을 기다린다.", costPoints: 10 },
        { text: "아무 길이나 무작위로 달린다.", costPoints: 20 }
      ],
      nextStep: 0
    };
  }
}
