const DATA_ROOT = "./app/data/uploaded";

const state = {
  events: [],
  selectedEvent: null,
  isDarkMode: localStorage.getItem("darkMode") === "true",
  isLoading: true,
  loadError: "",
  lastUpdateDate: null,
  currentDate: new Date(),
  expandedTiers: { major: true, mid: true, small: true },
  searchQuery: "",
  isContactModalOpen: false,
  isPrivacyModalOpen: false,
  isAboutModalOpen: false,
};

const indicatorGuides = {
  PMI: {
    name: "PMI (제조업/서비스 구매관리자지수)",
    basePoint: "50.0",
    highInterpretation: "경기 확장 국면입니다. 기업들이 투자를 늘리고 있다는 신호로 주식 시장에 호재로 작용할 수 있습니다.",
    lowInterpretation: "경기 위축 국면입니다. 50 미만은 경기 침체 우려를 낳아 시장에 부정적인 영향을 줄 수 있습니다.",
  },
  "제조업 PMI": {
    name: "제조업 PMI",
    basePoint: "50.0",
    highInterpretation: "제조업 경기가 활발함을 의미하며, 수출 중심 국가의 증시에 긍정적입니다.",
    lowInterpretation: "제조업 둔화를 의미하며, 경기 침체 시그널로 해석될 수 있습니다.",
  },
  "서비스업 PMI": {
    name: "서비스업 PMI",
    basePoint: "50.0",
    highInterpretation: "서비스업 경기가 확장세임을 나타냅니다.",
    lowInterpretation: "내수 경기 침체를 의미할 수 있습니다.",
  },
  CPI: {
    name: "CPI (소비자물가지수)",
    basePoint: "2.0% (YoY 목표치)",
    highInterpretation: "인플레이션 압력이 높습니다. 중앙은행의 금리 인상 가능성이 높아져 기술주 등 성장주에 악재가 될 수 있습니다.",
    lowInterpretation: "물가가 안정적이거나 디플레이션 우려가 있습니다. 금리 인하 기대감으로 이어질 수 있습니다.",
  },
  소비자물가: {
    name: "소비자물가",
    basePoint: "2.0% (YoY)",
    highInterpretation: "물가 상승 압력으로 인한 긴축 통화 정책이 예상됩니다.",
    lowInterpretation: "물가 안정화로 완화적 통화 정책이 기대됩니다.",
  },
  비농업고용: {
    name: "비농업고용 지수 (NFP)",
    basePoint: "20만 건 (변동 가능)",
    highInterpretation: "고용 시장이 매우 강력합니다. 경기가 좋다는 뜻이지만, 긴축 우려로 달러 강세를 유발할 수 있습니다.",
    lowInterpretation: "고용 시장이 식어가고 있습니다. 경기 침체 우려가 생기지만, 금리 인하 기대감을 높일 수 있습니다.",
  },
  NFP: {
    name: "NFP (비농업 고용)",
    basePoint: "20만 건",
    highInterpretation: "경기 과열 신호로 해석되어 금리 인하 시기가 늦춰질 수 있습니다.",
    lowInterpretation: "경기 둔화 신호로, 연준의 완화 정책을 기대하게 만듭니다.",
  },
  실업률: {
    name: "실업률",
    basePoint: "4.0~5.0% (자연실업률)",
    highInterpretation: "경기가 침체되고 있음을 의미합니다. 소비 위축으로 이어질 수 있습니다.",
    lowInterpretation: "완전 고용 상태에 가깝습니다. 경제가 탄탄하지만 임금 상승발 인플레이션을 자극할 수 있습니다.",
  },
  원유재고: {
    name: "원유재고",
    basePoint: "0 (예상치 대비)",
    highInterpretation: "원유 공급이 수요보다 많습니다. 유가 하락 요인이 되며 에너지 관련주에 부정적일 수 있습니다.",
    lowInterpretation: "원유 수요가 많거나 공급이 부족합니다. 유가 상승 요인이 되며 정유주에 호재입니다.",
  },
  GDP: {
    name: "GDP 성장률",
    basePoint: "2.5% (잠재성장률)",
    highInterpretation: "경제 성장 궤도에 있습니다. 기업 이익 증가가 기대됩니다.",
    lowInterpretation: "저성장 또는 경기 불황(Recession) 우려가 있습니다.",
  },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getIndicatorGuide(eventTitle) {
  if (indicatorGuides[eventTitle]) {
    return indicatorGuides[eventTitle];
  }
  const keys = Object.keys(indicatorGuides);
  for (const key of keys) {
    if (eventTitle.includes(key) || key.includes(eventTitle)) {
      return indicatorGuides[key];
    }
  }
  return null;
}

function normalizeCountry(currency) {
  const normalized = String(currency || "").toUpperCase();
  if (normalized === "USD" || normalized === "US" || normalized === "미국") return "US";
  if (normalized === "JPY" || normalized === "JP" || normalized === "일본") return "JP";
  if (normalized === "CNY" || normalized === "CN" || normalized === "중국") return "CN";
  if (normalized === "KRW" || normalized === "KR" || normalized === "한국") return "KR";
  return "KR";
}

function extractCategory(eventName, value) {
  if (value === "휴일") return "휴일";
  if (eventName.includes("물가") || eventName.includes("CPI") || eventName.includes("PPI")) return "물가";
  if (eventName.includes("GDP") || eventName.includes("경제성장")) return "GDP";
  if (eventName.includes("고용") || eventName.includes("실업") || eventName.includes("일자리")) return "고용";
  if (eventName.includes("주택") || eventName.includes("부동산")) return "부동산";
  if (eventName.includes("제조업") || eventName.includes("PMI")) return "제조업";
  if (eventName.includes("무역") || eventName.includes("수출") || eventName.includes("수입")) return "무역";
  if (eventName.includes("소비") || eventName.includes("판매")) return "소비";
  if (eventName.includes("금리") || eventName.includes("통화정책")) return "금융정책";
  if (eventName.includes("원유") || eventName.includes("재고")) return "원자재";
  return "경제지표";
}

function getCategoryColor(category) {
  const colorMap = {
    휴일: "#6B7280",
    물가: "#EF4444",
    GDP: "#10B981",
    고용: "#3B82F6",
    부동산: "#EC4899",
    제조업: "#8B5CF6",
    무역: "#F59E0B",
    소비: "#14B8A6",
    금융정책: "#10B981",
    원자재: "#F97316",
    경제지표: "#6366F1",
  };
  return colorMap[category] || "#3B82F6";
}

function getImportanceColor(importance) {
  if (importance === "high") return "#DC2626";
  if (importance === "medium") return "#D97706";
  return "#4B5563";
}

function goToPrevMonth() {
  const current = state.currentDate;
  state.currentDate = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  renderApp();
}

function goToNextMonth() {
  const current = state.currentDate;
  state.currentDate = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  renderApp();
}

function determineImportance(eventName, value) {
  if (value === "휴일") return "low";
  const highPriority = ["GDP", "CPI", "비농업", "고용", "금리", "FOMC", "소비자물가"];
  if (highPriority.some((keyword) => eventName.includes(keyword))) return "high";
  const mediumPriority = ["PMI", "주택", "무역", "실업"];
  if (mediumPriority.some((keyword) => eventName.includes(keyword))) return "medium";
  return "low";
}

function getCategoryKeywords(category) {
  const keywordMap = {
    휴일: [],
    물가: ["은행", "보험", "금융", "지주", "식품", "음식료", "유통", "소매", "백화점", "편의점", "카드", "바이오"],
    GDP: ["금융", "은행", "증권", "보험", "건설", "지주"],
    고용: ["IT", "IT서비스", "소프트웨어", "플랫폼", "서비스", "로봇", "자동화", "AI", "인공지능", "컴퓨터", "시스템", "통신"],
    부동산: ["건설", "토목", "시멘트", "가구", "인테리어", "유리", "케이블", "건재"],
    제조업: ["반도체", "자동차", "기계", "철강", "비철금속", "화학", "전자", "전기", "제조", "부품", "소재", "장비", "디스플레이", "공작기계"],
    무역: ["반도체", "자동차", "기계", "철강", "화학", "조선", "해운"],
    소비: ["화장품", "패션", "의류", "섬유", "엔터", "콘텐츠", "영화", "게임", "여행", "레저", "항공", "면세점"],
    금융정책: ["은행", "증권", "금융", "보험", "카드", "지주"],
    원자재: ["에너지", "정유", "석유", "화학", "태양광", "풍력", "배터리", "이차전지", "조선", "운수창고", "항공", "가스", "철강"],
    경제지표: ["반도체", "자동차", "철강", "화학"],
  };
  return keywordMap[category] || [];
}

function classifyStockTier(marketCap) {
  if (!marketCap || marketCap === 0) return "small";
  const TWO_TRILLION = 2_000_000_000_000;
  const FIVE_HUNDRED_BILLION = 500_000_000_000;
  if (marketCap >= TWO_TRILLION) return "major";
  if (marketCap >= FIVE_HUNDRED_BILLION) return "mid";
  return "small";
}

function findRelatedStocks(category, eventName, allStocks) {
  if (category === "휴일" || !allStocks.length) return [];
  const keywords = getCategoryKeywords(category);
  const eventKeywords = [];
  if (eventName.includes("반도체")) eventKeywords.push("반도체", "웨이퍼", "칩", "파운드리");
  if (eventName.includes("자동차")) eventKeywords.push("자동차", "전기차", "배터리", "모빌리티");
  if (eventName.includes("석유") || eventName.includes("원유")) eventKeywords.push("석유", "정유", "원유", "에너지");
  if (eventName.includes("철강")) eventKeywords.push("철강", "제철", "금속");
  if (eventName.includes("화학")) eventKeywords.push("화학", "석유화학", "정밀화학");
  if (eventName.includes("전자")) eventKeywords.push("전자", "전기", "디스플레이");
  const allKeywords = [...keywords, ...eventKeywords];
  if (!allKeywords.length) return [];

  const matchedStocks = allStocks.filter((stock) => {
    const sectorLower = String(stock.sector || "").toLowerCase();
    const nameLower = String(stock.name || "").toLowerCase();
    return allKeywords.some((keyword) => {
      const keywordLower = keyword.toLowerCase();
      return sectorLower.includes(keywordLower) || nameLower.includes(keywordLower);
    });
  });

  if (!matchedStocks.length) return [];

  const categorizedStocks = { major: [], mid: [], small: [] };
  for (const stock of matchedStocks) {
    categorizedStocks[classifyStockTier(stock.marketCap)].push(stock);
  }

  categorizedStocks.major.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  categorizedStocks.mid.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  categorizedStocks.small.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

  const finalMajor = categorizedStocks.major;
  const finalMid = categorizedStocks.mid;
  const finalSmall = categorizedStocks.small;

  const categories = [];
  if (finalMajor.length) categories.push({ tier: "major", tierName: "대장주", stocks: finalMajor });
  if (finalMid.length) categories.push({ tier: "mid", tierName: "중견기업", stocks: finalMid });
  if (finalSmall.length) categories.push({ tier: "small", tierName: "소기업", stocks: finalSmall });
  return categories;
}

function convertScheduleToEvent(dateStr, schedule, allStocks) {
  const date = new Date(dateStr);
  if (schedule.time && schedule.time !== "하루 종일") {
    const [hours, minutes] = schedule.time.split(":").map(Number);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      date.setHours(hours, minutes, 0, 0);
    }
  }

  const country = normalizeCountry(schedule.currency);
  const category = extractCategory(schedule.event, schedule.value);
  const categoryColor = getCategoryColor(category);
  const importance = determineImportance(schedule.event, schedule.value);
  let description = schedule.event;
  if (schedule.value && schedule.value !== "휴일") {
    description += ` (예상: ${schedule.value})`;
  }

  return {
    id: `event_${date.getTime()}_${Math.random().toString(36).slice(2, 11)}`,
    date,
    title: schedule.event,
    description,
    category,
    categoryColor,
    importance,
    country,
    details: `${schedule.event} - ${schedule.value}`,
    relatedStocks: findRelatedStocks(category, schedule.event, allStocks),
    lastUpdated: new Date(),
  };
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  return response.json();
}

function loadEventsFromEmbeddedData() {
  if (typeof __UPLOADED_EVENTS__ === "undefined" || !Array.isArray(__UPLOADED_EVENTS__)) {
    return null;
  }

  const embeddedEvents = __UPLOADED_EVENTS__;
  let stocks = [];
  if (typeof __UPLOADED_STOCKS2__ !== "undefined" && Array.isArray(__UPLOADED_STOCKS2__)) {
    const fallbackByCode = new Map();
    if (typeof __UPLOADED_STOCKS__ !== "undefined" && Array.isArray(__UPLOADED_STOCKS__)) {
      for (const item of __UPLOADED_STOCKS__) {
        fallbackByCode.set(item.code, item);
      }
    }

    stocks = __UPLOADED_STOCKS2__.map((s) => ({
      code: s["종목코드"],
      name: s["종목명"] || (fallbackByCode.get(s["종목코드"]) || {}).name || "미확인",
      sector:
        s["소속부"] ||
        (fallbackByCode.get(s["종목코드"]) || {}).sector ||
        "기타",
      marketCap: s["시가총액"] || 0,
    }));
  } else if (typeof __UPLOADED_STOCKS__ !== "undefined" && Array.isArray(__UPLOADED_STOCKS__)) {
    stocks = __UPLOADED_STOCKS__.map((s) => ({
      code: s.code,
      name: s.name,
      sector: s.sector || "기타",
      marketCap: undefined,
    }));
  }

  const events = [];
  for (const eventDay of embeddedEvents) {
    for (const schedule of eventDay.schedules) {
      events.push(convertScheduleToEvent(eventDay.date, schedule, stocks));
    }
  }

  return events;
}

async function loadStocksFromJSON() {
  try {
    const stocks2 = await fetchJson(`${DATA_ROOT}/stocks2.json`);
    return stocks2.map((s) => ({
      code: s["종목코드"],
      name: s["종목명"],
      sector: s["소속부"] || "기타",
      marketCap: s["시가총액"] || 0,
    }));
  } catch (stocks2Error) {
    try {
      const stocks = await fetchJson(`${DATA_ROOT}/stocks.json`);
      return stocks.map((s) => ({
        code: s.code,
        name: s.name,
        sector: s.sector || "기타",
        marketCap: undefined,
      }));
    } catch (error) {
      return [];
    }
  }
}

async function loadEventsFromJSON() {
  const eventsJson = await fetchJson(`${DATA_ROOT}/events.json`);
  const stocks = await loadStocksFromJSON();
  const events = [];
  for (const eventDay of eventsJson) {
    for (const schedule of eventDay.schedules) {
      events.push(convertScheduleToEvent(eventDay.date, schedule, stocks));
    }
  }
  return events;
}

function showToast(message, type = "success") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  root.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2000);
}

function formatDateKR(date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function formatTimeKR(date) {
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function renderSelectedEvent() {
  const event = state.selectedEvent;
  if (!event) return "";
  const guide = getIndicatorGuide(event.title);

  const importanceColors = {
    high: "bg-red-600 text-white border-red-700 font-bold px-3",
    medium: "bg-yellow-600 text-white border-yellow-700 font-bold px-3",
    low: "bg-gray-600 text-white border-gray-700 font-bold px-3",
  };

  const importanceLabels = {
    high: "중",
    medium: "보통",
    low: "낮음",
  };

  const statsCards = [];
  if (event.prev_value !== undefined) {
    statsCards.push(`
      <div class="p-3 rounded-lg border shadow-sm ${state.isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-800"}">
        <p class="text-xs mb-1 ${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">전월 실적</p>
        <p class="text-lg font-bold ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
          ${escapeHtml(event.prev_value)}${escapeHtml(event.unit || "")}
        </p>
      </div>
    `);
  }
  if (event.forecast_value !== undefined) {
    statsCards.push(`
      <div class="p-3 rounded-lg border shadow-sm ${state.isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-800"}">
        <p class="text-xs mb-1 ${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">시장 예상</p>
        <p class="text-lg font-bold ${state.isDarkMode ? "text-blue-300" : "text-blue-700"}">
          ${escapeHtml(event.forecast_value)}${escapeHtml(event.unit || "")}
        </p>
      </div>
    `);
  }
  if (event.actual_value !== undefined) {
    const actualValue = event.actual_value;
    let actualColor = state.isDarkMode ? "text-gray-300" : "text-gray-700";
    if (event.forecast_value !== undefined && actualValue !== null) {
      if (actualValue > event.forecast_value) actualColor = "text-red-600";
      if (actualValue < event.forecast_value) actualColor = "text-blue-600";
    }
    statsCards.push(`
      <div class="p-3 rounded-lg border shadow-sm ${state.isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-800"}">
        <p class="text-xs mb-1 ${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">실제 발표</p>
        ${actualValue !== null
          ? `<p class="text-lg font-bold ${actualColor}">${escapeHtml(actualValue)}${escapeHtml(event.unit || "")}</p>`
          : `<p class="text-lg font-bold text-gray-400">미발표</p>`}
      </div>
    `);
  }
  if (event.gap_analysis !== undefined) {
    statsCards.push(`
      <div class="p-3 rounded-lg border shadow-sm ${state.isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-800"}">
        <p class="text-xs mb-1 ${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">괴리율</p>
        <p class="text-lg font-bold ${event.gap_analysis > 0 ? "text-red-600" : event.gap_analysis < 0 ? "text-blue-600" : "text-gray-600"}">
          ${event.gap_analysis > 0 ? "+" : ""}${Number(event.gap_analysis).toFixed(1)}%
        </p>
      </div>
    `);
  }

  const hasStats = statsCards.length > 0;

  return `
    <div class="rounded-lg border-2 shadow-lg mb-6 ${state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-stone-100 border-gray-800"}">
      <div class="p-4 border-b border-gray-800">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="inline-flex items-center rounded-md border px-3 py-1 text-xs bg-blue-600 text-white border-blue-700 font-bold">
            ${escapeHtml(event.country)}
          </span>
          <span class="inline-flex items-center rounded-md border px-3 py-1 text-xs ${importanceColors[event.importance]}">
            ${importanceLabels[event.importance]}
          </span>
          <span class="inline-flex items-center rounded-md border px-3 py-1 text-xs" style="background-color:${event.categoryColor}20;color:${event.categoryColor};border-color:${event.categoryColor};">
            ${escapeHtml(event.category)}
          </span>
          <span class="font-medium ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
            ${formatTimeKR(event.date)}
          </span>
          <span class="font-bold text-lg ${state.isDarkMode ? "text-white" : "text-gray-900"}">
            ${escapeHtml(event.title)}
          </span>
          ${guide ? `<span class="text-sm font-medium px-2 py-1 rounded ${state.isDarkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"}">
                  기준: ${escapeHtml(guide.basePoint)}
                </span>` : ""}
          <span class="${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
            ${formatDateKR(event.date)}
          </span>
        </div>
      </div>
      ${hasStats ? `
            <div class="p-4">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                ${statsCards.join("")}
              </div>
              ${event.base_guide ? `<div class="p-4 rounded-lg border mb-3 ${state.isDarkMode ? "bg-blue-900/20 border-blue-700" : "bg-blue-50 border-gray-800"}">
                      <h4 class="font-semibold mb-2 flex items-center gap-2 ${state.isDarkMode ? "text-blue-300" : "text-blue-900"}">
                        <span>💡</span>
                        <span>해석 가이드</span>
                      </h4>
                      <p class="text-sm ${state.isDarkMode ? "text-blue-200" : "text-blue-800"}">
                        ${escapeHtml(event.base_guide)}
                      </p>
                    </div>` : ""}
              ${event.tooltip ? `<div class="p-4 rounded-lg border mb-3 ${state.isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-800"}">
                      <h4 class="font-semibold mb-2 flex items-center gap-2 ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
                        <span>ℹ️</span>
                        <span>상세 정보</span>
                      </h4>
                      <p class="text-sm ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
                        ${escapeHtml(event.tooltip)}
                      </p>
                    </div>` : ""}
              ${guide ? `<div class="p-4 rounded-lg border ${state.isDarkMode ? "bg-green-900/20 border-green-700" : "bg-green-50 border-gray-800"}">
                      <h4 class="font-semibold mb-3 flex items-center gap-2 ${state.isDarkMode ? "text-green-300" : "text-green-900"}">
                        <span>📊</span>
                        <span>지표 기준치 가이드</span>
                      </h4>
                      <div class="space-y-2">
                        <div class="flex items-start gap-2">
                          <span class="font-medium min-w-[80px] ${state.isDarkMode ? "text-green-200" : "text-green-800"}">기준점:</span>
                          <span class="font-bold ${state.isDarkMode ? "text-green-100" : "text-green-900"}>${escapeHtml(guide.basePoint)}</span>
                        </div>
                        <div class="flex items-start gap-2">
                          <span class="font-medium min-w-[80px] ${state.isDarkMode ? "text-red-300" : "text-red-700"}">수치 높음:</span>
                          <span class="${state.isDarkMode ? "text-red-200" : "text-red-800"}>${escapeHtml(guide.highInterpretation)}</span>
                        </div>
                        <div class="flex items-start gap-2">
                          <span class="font-medium min-w-[80px] ${state.isDarkMode ? "text-blue-300" : "text-blue-700"}">수치 낮음:</span>
                          <span class="${state.isDarkMode ? "text-blue-200" : "text-blue-800"}>${escapeHtml(guide.lowInterpretation)}</span>
                        </div>
                      </div>
                    </div>` : ""}
            </div>
          `
          : `
            <div class="p-4">
              <p class="${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
                ${escapeHtml(event.description || "")}
              </p>
            </div>
          `
      }
    </div>
  `;
}

function renderCalendar() {
  const current = state.currentDate;
  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDay = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const calendarDays = [];

  for (let i = 0; i < startDay; i += 1) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) calendarDays.push(day);

  const eventsForDate = (day) =>
    state.events.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day && eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });

  const maxEventsInMonth = Math.max(
    0,
    ...Array.from({ length: daysInMonth }, (_, i) => eventsForDate(i + 1).length)
  );
  const minCellHeight = Math.max(100, 40 + maxEventsInMonth * 22);
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  const calendarCells = calendarDays
    .map((day, index) => {
      if (day === null) {
        return `<div class="border-transparent" style="min-height:${minCellHeight}px"></div>`;
      }
      const dayEvents = eventsForDate(day);
      const today = new Date();
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const dayOfWeek = index % 7;
      return `
        <div class="border-2 rounded-lg p-1.5 flex flex-col transition-colors ${isToday ? state.isDarkMode ? "bg-blue-900/30 border-blue-500 shadow-md ring-1 ring-blue-500/50" : "bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-400/50" : state.isDarkMode ? "bg-gray-800/50 border-gray-700 hover:bg-gray-800" : "bg-white border-gray-200 hover:bg-gray-50 shadow-sm"}" style="min-height:${minCellHeight}px">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-bold px-1.5 py-0.5 rounded ${dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : state.isDarkMode ? "text-gray-300" : "text-gray-700"} ${isToday ? (state.isDarkMode ? "bg-blue-800/50" : "bg-blue-100") : ""}">
              ${day}
            </span>
            ${dayEvents.length ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold ${state.isDarkMode ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-600"}">${dayEvents.length}</span>` : ""}
          </div>
          <div class="flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-slim px-0.5 pb-0.5">
            ${dayEvents
              .map((event) => {
                const isSelected = state.selectedEvent && state.selectedEvent.id === event.id;
                const importanceColor = getImportanceColor(event.importance);
                return `
                  <button
                    data-event-id="${event.id}"
                    class="w-full text-left px-2 py-1.5 rounded text-xs transition-all duration-200 flex items-center gap-1.5 border group ${isSelected ? "bg-blue-600 text-white shadow-md border-blue-500 z-10 relative" : state.isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-gray-500" : "bg-white hover:bg-slate-50 text-gray-700 border-gray-200 hover:border-gray-300 shadow-sm"}"
                    style="${isSelected ? "" : `border-left-width: 3px; border-left-color: ${importanceColor};`}"
                    title="${escapeHtml(event.title)}"
                  >
                    <span class="truncate flex-1 font-medium">${escapeHtml(event.title)}</span>
                    <span class="text-[10px] font-mono opacity-70 whitespace-nowrap">
                      ${formatTimeKR(new Date(event.date)).substring(0, 5)}
                    </span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="rounded-xl border shadow-lg overflow-hidden ${state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}">
      <div class="p-4 border-b ${state.isDarkMode ? "border-gray-700" : "border-gray-100"} flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4 flex-shrink-0">
          <button data-action="prev-month" class="p-2 rounded-lg transition-colors border ${state.isDarkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-600"}">
            <i data-lucide="chevron-left" class="size-5"></i>
          </button>
          <h2 class="font-bold text-xl ${state.isDarkMode ? "text-white" : "text-gray-900"} min-w-[140px] text-center flex-shrink-0 pr-2">${year}년 ${monthNames[month]}</h2>
          <button data-action="next-month" class="p-2 rounded-lg transition-colors border ${state.isDarkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-600"}">
            <i data-lucide="chevron-right" class="size-5"></i>
          </button>
        </div>
        
        <div class="flex flex-wrap items-center justify-center gap-3 text-xs">
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span class="${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">높음</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
            <span class="${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">보통</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full bg-gray-500"></div>
            <span class="${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">낮음</span>
          </div>
        </div>
      </div>
      
      <div class="p-4 bg-opacity-50 ${state.isDarkMode ? "bg-gray-900/30" : "bg-gray-50/50"}">
        <div class="text-center mb-4 hidden sm:block">
          <p class="text-xs font-medium ${state.isDarkMode ? "text-gray-500" : "text-gray-400"}">
            <i data-lucide="mouse-pointer-2" class="size-3 inline mr-1"></i>
            일정을 클릭하여 상세 정보와 관련 종목을 확인하세요
          </p>
        </div>
        <div class="grid grid-cols-7 gap-2 mb-2">
          ${days
            .map((day, index) => {
              const textColor =
                index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : state.isDarkMode ? "text-gray-400" : "text-gray-500";
              return `<div class="text-center font-bold text-xs py-1 ${textColor}">${day}</div>`;
            })
            .join("")}
        </div>
        <div class="grid grid-cols-7 gap-2">
          ${calendarCells}
        </div>
      </div>
    </div>
  `;
}

function formatStocksToText(category) {
  return category.stocks.map((stock) => `${stock.name}\t${stock.code}\t${stock.sector}`).join("\n");
}

function formatAllStocksToText(event) {
  return event.relatedStocks
    .map((category) => {
      const header = `[${category.tierName}]`;
      const stocks = category.stocks.map((stock) => `${stock.name}\t${stock.code}\t${stock.sector}`).join("\n");
      return `${header}\n${stocks}`;
    })
    .join("\n\n");
}

function getFilteredStocks(category) {
  const query = state.searchQuery.trim().toLowerCase();
  if (!query) return category.stocks;
  return category.stocks.filter((stock) => {
    const name = String(stock.name || "").toLowerCase();
    const code = String(stock.code || "").toLowerCase();
    const sector = String(stock.sector || "").toLowerCase();
    return name.includes(query) || code.includes(query) || sector.includes(query);
  });
}

function formatAllStocksToTextFiltered(event) {
  return event.relatedStocks
    .map((category) => {
      const filteredStocks = getFilteredStocks(category);
      const header = `[${category.tierName}]`;
      const stocks = filteredStocks.map((stock) => `${stock.name}\t${stock.code}\t${stock.sector}`).join("\n");
      return `${header}\n${stocks}`;
    })
    .join("\n\n");
}

function getTierColors(tier) {
  switch (tier) {
    case "major":
      return {
        bg: state.isDarkMode ? "bg-blue-900/30" : "bg-blue-50",
        border: state.isDarkMode ? "border-blue-700" : "border-gray-800",
        text: state.isDarkMode ? "text-blue-300" : "text-blue-700",
        badge: state.isDarkMode ? "bg-blue-800 text-blue-200" : "bg-blue-100 text-blue-700",
      };
    case "mid":
      return {
        bg: state.isDarkMode ? "bg-purple-900/30" : "bg-purple-50",
        border: state.isDarkMode ? "border-purple-700" : "border-gray-800",
        text: state.isDarkMode ? "text-purple-300" : "text-purple-700",
        badge: state.isDarkMode ? "bg-purple-800 text-purple-200" : "bg-purple-100 text-purple-700",
      };
    case "small":
      return {
        bg: state.isDarkMode ? "bg-green-900/30" : "bg-green-50",
        border: state.isDarkMode ? "border-green-700" : "border-gray-800",
        text: state.isDarkMode ? "text-green-300" : "text-green-700",
        badge: state.isDarkMode ? "bg-green-800 text-green-200" : "bg-green-100 text-green-700",
      };
    default:
      return {
        bg: state.isDarkMode ? "bg-gray-800" : "bg-gray-50",
        border: state.isDarkMode ? "border-gray-700" : "border-gray-800",
        text: state.isDarkMode ? "text-gray-300" : "text-gray-700",
        badge: state.isDarkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700",
      };
  }
}

function renderStockCategory(category) {
  const filteredStocks = getFilteredStocks(category);
  const isSearching = state.searchQuery.trim().length > 0;
  const displayCount = isSearching ? filteredStocks.length : category.stocks.length;

  const tierColors = getTierColors(category.tier);
  const expanded = state.expandedTiers[category.tier];
  const iconName = category.tier === "major" ? "building-2" : category.tier === "mid" ? "building" : "trending-up";

  return `
    <div class="rounded-lg border-2 overflow-hidden ${tierColors.border}">
      <button
        data-action="toggle-tier"
        data-tier="${category.tier}"
        class="w-full px-4 py-3 flex items-center justify-between transition-colors ${tierColors.bg} hover:opacity-80"
      >
        <div class="flex items-center gap-2">
          <div class="${tierColors.text}">
            <i data-lucide="${iconName}" class="size-5"></i>
          </div>
          <div class="text-left">
            <h3 class="font-bold ${tierColors.text}">${escapeHtml(category.tierName)}</h3>
                  <p class="text-xs ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
                    ${displayCount}개 종목${isSearching ? " (검색)" : ""}
                  </p>
          </div>
        </div>
        <div class="${tierColors.text}">
          <i data-lucide="${expanded ? "chevron-up" : "chevron-down"}" class="size-5"></i>
        </div>
      </button>
      ${expanded ? `
            <div class="p-4 ${state.isDarkMode ? "bg-gray-800/50" : "bg-white"}">
              <div class="space-y-2 max-h-96 overflow-y-auto scrollbar-slim">
                ${filteredStocks.length === 0 ? `<div class="text-sm text-center py-6 ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
                        검색 결과가 없습니다.
                      </div>`
                  : filteredStocks
                      .map(
                        (stock, idx) => `
                            <div class="p-3 rounded-lg border-2 transition-colors ${state.isDarkMode ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : "bg-gray-50 border-gray-400 hover:bg-white shadow-md"}">
                              <div class="flex items-start justify-between gap-2">
                                <div class="flex-1 min-w-0">
                                  <div class="flex items-center gap-2 mb-1">
                                    <h4 class="font-semibold truncate ${state.isDarkMode ? "text-white" : "text-gray-900"}">
                                      ${escapeHtml(stock.name)}
                                    </h4>
                                    <span class="px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap ${tierColors.badge}">
                                      ${escapeHtml(stock.code)}
                                    </span>
                                  </div>
                                  <p class="text-xs line-clamp-2 ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
                                    ${escapeHtml(stock.sector)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          `
                      )
                      .join("")
                }
              </div>
              <button
                data-action="copy-tier"
                data-tier="${category.tier}"
                class="w-full px-4 py-2 flex items-center justify-center transition-colors ${filteredStocks.length === 0 ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"} ${tierColors.bg} mt-2"
              >
                <div class="flex items-center gap-2">
                  <div class="${tierColors.text}">
                    <i data-lucide="${(state.copiedStates && state.copiedStates[category.tier]) ? "check-check" : "copy"}" class="size-5"></i>
                  </div>
                  <div class="text-left">
                    <h3 class="font-bold ${tierColors.text}">
                      ${filteredStocks.length === 0 ? "복사할 종목 없음" : (state.copiedStates && state.copiedStates[category.tier]) ? "복사 완료" : "복사하기"}
                    </h3>
                  </div>
                </div>
              </button>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderRelatedStocks() {
  const event = state.selectedEvent;
  if (!event || !event.relatedStocks || !event.relatedStocks.length) return "";
  const totalStocks = event.relatedStocks.reduce((sum, cat) => sum + cat.stocks.length, 0);
  const categories = ["major", "mid", "small"]
    .map((tier) => event.relatedStocks.find((cat) => cat.tier === tier))
    .filter(Boolean);
  const filteredTotal = state.searchQuery.trim()
    ? event.relatedStocks.reduce((sum, cat) => sum + getFilteredStocks(cat).length, 0)
    : totalStocks;

  return `
    <div class="rounded-lg border shadow-lg p-6 ${state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-stone-100 border-gray-800"}">
      <div class="mb-6">
        <div class="flex items-start justify-between mb-2">
          <h2 class="text-2xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">📈 관련 주식 종목</h2>
          <button
            data-action="copy-all"
            class="px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${state.isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}"
          >
            <i data-lucide="${(state.copiedStates && state.copiedStates.all) ? "check-check" : "copy"}" class="size-4"></i>
            <span class="text-sm font-medium">${(state.copiedStates && state.copiedStates.all) ? "복사 완료" : "전체 복사"}</span>
          </button>
        </div>
        <div class="flex items-center gap-3">
          <p class="text-sm ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}>${escapeHtml(event.title)}</p>
          <span class="px-2 py-1 rounded-full text-xs font-medium ${state.isDarkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700"}">총 ${filteredTotal}개 종목</span>
        </div>
        <div class="mt-4">
          <div class="flex flex-col items-center gap-2 md:flex-row md:justify-center md:items-center">
            <input
              id="stock-search-input"
              type="text"
              value="${escapeHtml(state.searchQuery)}"
              placeholder="종목명/코드/섹터 검색"
              class="w-full max-w-md rounded-md border px-3 py-1.5 text-sm ${state.isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-100 placeholder:text-gray-400"
                : "bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
              }"
            />
            <button
              data-action="apply-search"
              class="px-3 py-1.5 rounded-md text-sm font-semibold border ${state.isDarkMode
                ? "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                : "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"
              }"
            >
              검색 적용
            </button>
          </div>
          <p class="mt-1 text-xs text-center ${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">
            Enter 키를 누르거나 "검색 적용"을 누르면 반영됩니다.
          </p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${categories.map((category) => renderStockCategory(category)).join("")}
      </div>
    </div>
  `;
}

function renderGlossarySection() {
  const keys = Object.keys(indicatorGuides);
  const uniqueGuides = [];
  const seenNames = new Set();

  for (const key of keys) {
    const guide = indicatorGuides[key];
    if (!seenNames.has(guide.name)) {
      seenNames.add(guide.name);
      uniqueGuides.push(guide);
    }
  }

  return `
    <div class="mt-16 mb-8">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold mb-4 ${state.isDarkMode ? "text-white" : "text-gray-900"}">
          📊 경제지표 용어 사전
        </h2>
        <p class="text-lg ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
          주식 시장에 영향을 미치는 주요 경제 지표들을 알기 쉽게 정리했습니다.
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${uniqueGuides.map(guide => `
          <div class="min-w-0 w-full rounded-xl border p-6 transition-all hover:shadow-lg flex flex-col h-full ${state.isDarkMode ? "bg-gray-800 border-gray-700 hover:border-blue-500/50" : "bg-white border-gray-200 hover:border-blue-300"}">
            <h3 class="text-xl font-bold mb-3 ${state.isDarkMode ? "text-blue-300" : "text-blue-700"} break-words">
              ${escapeHtml(guide.name)}
            </h3>
            <div class="space-y-3 flex-grow">
              <div class="flex items-start gap-2">
                <span class="px-2 py-0.5 rounded text-xs font-bold bg-gray-200 text-gray-700 shrink-0">기준점</span>
                <span class="font-mono font-medium ${state.isDarkMode ? "text-gray-300" : "text-gray-800"} break-words min-w-0 flex-1">${escapeHtml(guide.basePoint)}</span>
              </div>
              
              <div class="p-3 rounded-lg ${state.isDarkMode ? "bg-red-900/20" : "bg-red-50"}">
                <p class="text-xs font-bold mb-1 ${state.isDarkMode ? "text-red-300" : "text-red-700"}">📈 수치가 높을 때</p>
                <p class="text-sm ${state.isDarkMode ? "text-gray-300" : "text-gray-700"} break-words">${escapeHtml(guide.highInterpretation)}</p>
              </div>
              
              <div class="p-3 rounded-lg ${state.isDarkMode ? "bg-blue-900/20" : "bg-blue-50"}">
                <p class="text-xs font-bold mb-1 ${state.isDarkMode ? "text-blue-300" : "text-blue-700"}">📉 수치가 낮을 때</p>
                <p class="text-sm ${state.isDarkMode ? "text-gray-300" : "text-gray-700"} break-words">${escapeHtml(guide.lowInterpretation)}</p>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderContactModal() {
  if (!state.isContactModalOpen) return "";

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity" data-action="close-contact-overlay">
      <div class="w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${state.isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">제휴 및 문의</h3>
            <button
              data-action="close-contact"
              class="rounded-lg p-2 transition-colors ${state.isDarkMode ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}"
            >
              <i data-lucide="x" class="size-5"></i>
            </button>
          </div>
          
          <form id="contact-form" action="https://formspree.io/f/xdadojeo" method="POST" class="space-y-4">
            <div>
              <label for="contact-name" class="block text-sm font-medium mb-1 ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
                이름 (또는 회사명)
              </label>
              <input
                type="text"
                id="contact-name"
                name="name"
                required
                class="w-full rounded-lg px-4 py-2.5 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${state.isDarkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" 
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
                }"
                placeholder="홍길동"
              />
            </div>
            
            <div>
              <label for="contact-email" class="block text-sm font-medium mb-1 ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
                이메일
              </label>
              <input
                type="email"
                id="contact-email"
                name="email"
                required
                class="w-full rounded-lg px-4 py-2.5 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${state.isDarkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" 
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
                }"
                placeholder="example@email.com"
              />
            </div>
            
            <div>
              <label for="contact-message" class="block text-sm font-medium mb-1 ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
                문의 내용
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows="4"
                class="w-full rounded-lg px-4 py-2.5 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none ${state.isDarkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" 
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
                }"
                placeholder="제휴 제안이나 문의사항을 자유롭게 적어주세요."
              ></textarea>
            </div>
            
            <button
              type="submit"
              class="w-full rounded-lg py-3 font-bold text-white transition-all transform active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
            >
              보내기
            </button>
            <p class="text-xs text-center ${state.isDarkMode ? "text-gray-500" : "text-gray-400"}">
              * Formspree를 통해 안전하게 전송됩니다.
            </p>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderPrivacyModal() {
  if (!state.isPrivacyModalOpen) return "";

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity" data-action="close-privacy-overlay">
      <div class="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${state.isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}">
        <div class="p-6 border-b ${state.isDarkMode ? "border-gray-700" : "border-gray-200"} flex items-center justify-between">
          <h3 class="text-xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">개인정보처리방침 (Privacy Policy)</h3>
          <button
            data-action="close-privacy"
            class="rounded-lg p-2 transition-colors ${state.isDarkMode ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}"
          >
            <i data-lucide="x" class="size-5"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto ${state.isDarkMode ? "text-gray-300" : "text-gray-700"} space-y-4 text-sm leading-relaxed">
          <p><strong>1. 개인정보의 수집 및 이용 목적</strong><br>
          본 사이트('Stock Calendar')는 별도의 회원가입 없이 이용 가능하며, 사용자의 개인정보를 직접 수집하거나 저장하지 않습니다. 다만, 제휴 문의 시 제공해주시는 이름, 이메일 주소는 문의 응대 목적으로만 사용됩니다.</p>

          <p><strong>2. 쿠키(Cookie) 및 광고</strong><br>
          본 사이트는 구글 애드센스(Google AdSense)를 통해 광고를 게재하고 있습니다. 이를 위해 구글 및 제3자 벤더는 쿠키(Cookie)를 사용하여 사용자의 과거 방문 기록을 바탕으로 맞춤형 광고를 제공할 수 있습니다.<br>
          사용자는 구글 광고 설정(Ads Settings)에서 맞춤형 광고를 해제할 수 있으며, <a href="https://www.aboutads.info" target="_blank" class="underline text-blue-500">aboutads.info</a>에서 제3자 벤더의 쿠키 사용을 거부할 수 있습니다.</p>

          <p><strong>3. 로그 데이터</strong><br>
          사이트 방문 시 브라우저가 전송하는 일반적인 정보(IP 주소, 브라우저 버전, 방문 시간 등)는 서버 운영 및 보안을 위해 자동으로 기록될 수 있으나, 이는 특정 개인을 식별하는 용도로 사용되지 않습니다.</p>

          <p><strong>4. 외부 링크</strong><br>
          본 사이트는 외부 사이트로의 링크를 포함할 수 있으며, 해당 사이트의 개인정보처리방침은 본 사이트와 무관합니다.</p>

          <p class="text-xs mt-4 opacity-70">시행일자: 2026년 2월 1일</p>
        </div>
      </div>
    </div>
  `;
}

function renderAboutModal() {
  if (!state.isAboutModalOpen) return "";

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity" data-action="close-about-overlay">
      <div class="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${state.isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}">
        <div class="p-6 border-b ${state.isDarkMode ? "border-gray-700" : "border-gray-200"} flex items-center justify-between">
          <h3 class="text-xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">사이트 소개 (About)</h3>
          <button
            data-action="close-about"
            class="rounded-lg p-2 transition-colors ${state.isDarkMode ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}"
          >
            <i data-lucide="x" class="size-5"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto ${state.isDarkMode ? "text-gray-300" : "text-gray-700"} space-y-4 text-sm leading-relaxed">
          <div class="text-center mb-6">
            <div class="bg-gradient-to-br from-blue-600 to-indigo-600 p-3 rounded-xl inline-block mb-3 shadow-lg">
              <i data-lucide="trending-up" class="size-8 text-white"></i>
            </div>
            <h2 class="text-xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">경제일정 & 종목확인</h2>
            <p class="text-xs opacity-70 mt-1">Economic Calendar & Stock Checker</p>
          </div>

          <p>
            안녕하세요! <strong>경제일정 & 종목확인</strong> 사이트에 오신 것을 환영합니다.
          </p>
          
          <p>
            이 서비스는 매일 쏟아지는 수많은 경제 지표와 일정 속에서, 
            <span class="font-bold text-blue-500">"오늘 주목해야 할 일정은 무엇이고, 어떤 주식 종목이 영향을 받을까?"</span>라는 
            투자자들의 고민을 해결하기 위해 만들어졌습니다.
          </p>

          <div class="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
            <h4 class="font-bold mb-2 ${state.isDarkMode ? "text-blue-300" : "text-blue-700"}">주요 기능</h4>
            <ul class="list-disc list-inside space-y-1 ml-1">
              <li>📅 <strong>경제 캘린더:</strong> 주요 경제 지표 발표 일정을 한눈에 확인하세요.</li>
              <li>📈 <strong>관련 종목 매칭:</strong> 일정과 관련된 대장주, 중견기업, 소기업을 자동으로 분류해 드립니다.</li>
              <li>📋 <strong>간편 복사:</strong> 종목 리스트를 클릭 한 번으로 복사하여 HTS나 메모장에 붙여넣으세요.</li>
              <li>📚 <strong>지표 가이드:</strong> 어려운 경제 용어와 지표 해석 방법을 쉽게 풀어드립니다.</li>
            </ul>
          </div>

          <p>
            성공적인 투자를 위한 든든한 파트너가 되겠습니다.<br>
            문의사항이나 제안하고 싶은 점이 있다면 언제든 '제휴 문의'를 통해 연락해 주세요.
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  if (!state.lastUpdateDate) return "";
  return `
    <footer class="mt-12 pt-8 border-t text-center ${state.isDarkMode ? "border-gray-700" : "border-gray-800"}">
      <div class="mb-4 flex flex-wrap justify-center gap-4 text-sm font-medium ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
        <button data-action="open-about" class="hover:underline">사이트 소개</button>
        <span class="hidden sm:inline">|</span>
        <button data-action="open-privacy" class="hover:underline">개인정보처리방침</button>
        <span class="hidden sm:inline">|</span>
        <button data-action="open-contact" class="hover:underline">제휴 문의</button>
      </div>
      <p class="text-sm mb-2 font-medium ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
        본 서비스는 투자 참고용이며, 실제 투자 결정에 대한 책임은 투자자 본인에게 있습니다.
      </p>
      <p class="text-xs font-medium ${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">
        마지막 업데이트: ${state.lastUpdateDate.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <p class="text-[10px] mt-2 opacity-50 ${state.isDarkMode ? "text-gray-500" : "text-gray-400"}">
        Stock Calendar © 2026
      </p>
    </footer>
  `;
}

function renderApp() {
  const app = document.getElementById("app");
  if (!app) return;

  if (state.isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  const backgroundClass = state.isDarkMode
    ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
    : "bg-gradient-to-br from-stone-400 via-neutral-400 to-stone-400";

  const headerBg = state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-stone-50 border-gray-800 shadow-md";

  app.className = `min-h-screen transition-colors duration-300 ${backgroundClass}`;

  const loadingBanner = state.isLoading
    ? `<div class="mb-4 text-center text-sm ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">데이터를 불러오는 중입니다...</div>`
    : "";

  const errorBanner = state.loadError
    ? `<div class="mb-4 text-center text-sm text-red-600">${escapeHtml(state.loadError)}</div>`
    : "";

  const todayDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  app.innerHTML = `
    <div class="w-full">
      <div class="border-b shadow-sm sticky top-0 z-10 transition-colors ${headerBg}">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-between py-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shrink-0">
                <i data-lucide="trending-up" class="size-8 text-white"></i>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h1 class="font-bold text-2xl ${state.isDarkMode ? "text-white" : "text-gray-900"}">경제일정 & 종목확인</h1>
                  <span class="text-sm font-medium px-2 py-1 rounded-md shrink-0 ${state.isDarkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"}">
                    ${todayDate}
                  </span>
                </div>
                <p class="text-sm ${state.isDarkMode ? "text-gray-400" : "text-gray-600"} truncate">경제 일정과 관련된 종목 한눈에보기</p>
              </div>
            </div>
            
            <div class="flex items-center gap-2 shrink-0 ml-2">
              <button
                data-action="open-about"
                class="hidden lg:flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${state.isDarkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }"
              >
                <i data-lucide="info" class="size-4"></i>
                <span>사이트 소개</span>
              </button>
              <button
                data-action="open-contact"
                class="hidden md:flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${state.isDarkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }"
              >
                <i data-lucide="mail" class="size-4"></i>
                <span>제휴 문의</span>
              </button>
              <button
                data-action="toggle-theme"
                class="transition-colors border rounded-md p-2 ${state.isDarkMode
                  ? "bg-gray-700 border-gray-600 hover:bg-gray-600 text-yellow-400"
                  : "bg-white hover:bg-gray-100"
                }"
                aria-label="다크 모드 토글"
              >
                <i data-lucide="${state.isDarkMode ? "sun" : "moon"}" class="size-5"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 상단 가이드 섹션 (SEO 및 콘텐츠 보강) -->
      <div class="container mx-auto px-4 mt-6">
        <div class="rounded-xl border p-5 ${state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100 shadow-sm"}">
          <h2 class="text-lg font-bold mb-2 flex items-center gap-2 ${state.isDarkMode ? "text-blue-300" : "text-blue-700"}">
            <i data-lucide="lightbulb" class="size-5"></i>
            <span>오늘의 투자 인사이트</span>
          </h2>
          <p class="text-sm leading-relaxed ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
            경제 지표는 주식 시장의 나침반입니다. <strong>미국 CPI, NFP(비농업 고용), 금리 결정</strong> 등 주요 이벤트를 확인하고, 
            관련된 <strong>대장주 및 수혜주</strong>를 미리 파악하여 성공적인 투자 전략을 세우세요. 
            아래 캘린더에서 날짜를 클릭하면 상세 데이터와 관련 종목을 확인할 수 있습니다.
          </p>
        </div>
      </div>

      <div class="container mx-auto px-4 py-8">
        ${loadingBanner}
        ${errorBanner}
        ${renderSelectedEvent()}
        <div class="mb-6">
          ${renderCalendar()}
        </div>
        <div>
          ${renderRelatedStocks()}
        </div>
        ${renderGlossarySection()}
        ${renderFooter()}
      </div>
      ${renderContactModal()}
      ${renderPrivacyModal()}
      ${renderAboutModal()}
    </div>
  `;

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
  if (state.keepSearchFocus) {
    const searchInput = document.getElementById("stock-search-input");
    if (searchInput && searchInput instanceof HTMLInputElement) {
      searchInput.focus();
      const length = searchInput.value.length;
      searchInput.setSelectionRange(length, length);
    }
    state.keepSearchFocus = false;
  }
}

function applySearchFilter() {
  state.keepSearchFocus = true;
  renderApp();
}

let isAppBound = false;

function bindEvents() {
  if (isAppBound) return;
  const appRoot = document.getElementById("app");
  if (!appRoot) return;
  
  isAppBound = true;
  state.searchQuery = "";

  appRoot.addEventListener("click", (event) => {
    let target = event.target;
    
    // 텍스트 노드 클릭 대응
    if (target && target.nodeType === 3) {
      target = target.parentNode;
    }

    if (!target || !(target instanceof Element)) return;

    const eventButton = target.closest("[data-event-id]");
    if (eventButton) {
      const eventId = eventButton.getAttribute("data-event-id");
      const selected = state.events.find((item) => item.id === eventId);
      if (selected) {
        state.selectedEvent = selected;
        renderApp();
      }
      return;
    }

    const actionButton = target.closest("[data-action]");
    const overlayContact = target.closest("[data-action='close-contact-overlay']");
    const overlayPrivacy = target.closest("[data-action='close-privacy-overlay']");
    const overlayAbout = target.closest("[data-action='close-about-overlay']");
    
    if (overlayContact && target === overlayContact) {
       state.isContactModalOpen = false;
       renderApp();
       return;
    }
    if (overlayPrivacy && target === overlayPrivacy) {
       state.isPrivacyModalOpen = false;
       renderApp();
       return;
    }
    if (overlayAbout && target === overlayAbout) {
       state.isAboutModalOpen = false;
       renderApp();
       return;
    }

    if (!actionButton) return;
    
    const action = actionButton.getAttribute("data-action");
    const tier = actionButton.getAttribute("data-tier");

    // 월 이동
    if (action === "prev-month") {
      const current = state.currentDate;
      state.currentDate = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      renderApp();
      return;
    }

    if (action === "next-month") {
      const current = state.currentDate;
      state.currentDate = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      renderApp();
      return;
    }

    // 다크 모드
    if (action === "toggle-theme") {
      state.isDarkMode = !state.isDarkMode;
      localStorage.setItem("darkMode", String(state.isDarkMode));
      
      if (state.isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      requestAnimationFrame(() => {
        renderApp();
      });
      return;
    }

    if (action === "apply-search") {
      applySearchFilter();
      return;
    }

    if (action === "toggle-tier" && tier) {
      state.expandedTiers[tier] = !state.expandedTiers[tier];
      renderApp();
      return;
    }

    if (action === "copy-all" && state.selectedEvent) {
      const hasQuery = state.searchQuery.trim().length > 0;
      const payload = hasQuery
        ? formatAllStocksToTextFiltered(state.selectedEvent)
        : formatAllStocksToText(state.selectedEvent);
      if (hasQuery && payload.trim().length === 0) {
        showToast("검색 결과가 없습니다.", "error");
        return;
      }
      
      copyToClipboardWithoutRender(payload, "all", actionButton);
      return;
    }

    if (action === "copy-tier" && tier && state.selectedEvent) {
      const category = state.selectedEvent.relatedStocks.find((cat) => cat.tier === tier);
      if (category) {
        const hasQuery = state.searchQuery.trim().length > 0;
        const filteredStocks = hasQuery ? getFilteredStocks(category) : category.stocks;
        if (hasQuery && filteredStocks.length === 0) {
          showToast("검색 결과가 없습니다.", "error");
          return;
        }
        if (!hasQuery && filteredStocks.length === 0) {
          showToast("복사할 종목이 없습니다.", "error");
          return;
        }
        const payload = hasQuery
          ? filteredStocks.map((stock) => `${stock.name}\t${stock.code}\t${stock.sector}`).join("\n")
          : formatStocksToText(category);
          
        copyToClipboardWithoutRender(payload, tier, actionButton);
      }
      return;
    }

    if (action === "open-contact") {
      state.isContactModalOpen = true;
      renderApp();
      return;
    }

    if (action === "close-contact") {
      state.isContactModalOpen = false;
      renderApp();
      return;
    }

    if (action === "open-privacy") {
      state.isPrivacyModalOpen = true;
      renderApp();
      return;
    }

    if (action === "close-privacy") {
      state.isPrivacyModalOpen = false;
      renderApp();
      return;
    }

    // 사이트 소개 열기/닫기
    if (action === "open-about") {
      state.isAboutModalOpen = true;
      renderApp();
      return;
    }

    if (action === "close-about") {
      state.isAboutModalOpen = false;
      renderApp();
      return;
    }
  });

  // ... (submit, input event listeners same as before)
  appRoot.addEventListener("submit", async (event) => {
    const target = event.target;
    if (target instanceof HTMLFormElement && target.id === "contact-form") {
      event.preventDefault();
      const form = target;
      const submitBtn = form.querySelector("button[type=submit]");
      const originalBtnText = submitBtn.textContent;
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "전송 중...";
        
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: form.method,
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          showToast("문의가 성공적으로 전송되었습니다!", "success");
          form.reset();
          state.isContactModalOpen = false;
          renderApp();
        } else {
          showToast("전송에 실패했습니다. 다시 시도해주세요.", "error");
        }
      } catch (error) {
        showToast("오류가 발생했습니다.", "error");
      } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
      }
    }
  });

  appRoot.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === "stock-search-input") {
      if (state.isComposing || target.isComposing) {
        state.searchQuery = target.value;
        return;
      }
      state.searchQuery = target.value;
    }
  });

  appRoot.addEventListener("compositionstart", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.id === "stock-search-input") {
      state.isComposing = true;
    }
  });

  appRoot.addEventListener("compositionend", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.id === "stock-search-input") {
      state.isComposing = false;
      state.searchQuery = target.value;
    }
  });

  appRoot.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === "stock-search-input" && event.key === "Enter") {
      applySearchFilter();
    }
  });
}

// ... (copyToClipboardWithoutRender, fallbackCopySilent, init functions are same as before)
async function copyToClipboardWithoutRender(text, key, buttonElement) {
  try {
    let successful = false;
    if (navigator.clipboard && isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        successful = true;
      } catch (clipboardError) {
        // fallback
      }
    }
    
    if (!successful) {
      successful = fallbackCopySilent(text);
    }

    if (successful) {
      showToast("클립보드에 복사되었습니다!", "success");
      
      if (buttonElement) {
        const originalHtml = buttonElement.innerHTML;
        const width = buttonElement.offsetWidth;
        buttonElement.style.width = `${width}px`; 
        
        const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-check size-4${key === 'all' ? '' : ' size-5'}"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 8"/></svg>`;
        
        if (key === 'all') {
             buttonElement.innerHTML = `${checkIcon}<span>복사 완료</span>`;
        } else {
             const textDiv = buttonElement.querySelector('.text-left h3');
             if (textDiv) textDiv.textContent = "복사 완료";
             const iconDiv = buttonElement.querySelector('div:first-child');
             if (iconDiv) iconDiv.innerHTML = checkIcon;
        }

        setTimeout(() => {
          buttonElement.innerHTML = originalHtml;
          buttonElement.style.width = '';
          if (typeof lucide !== "undefined") {
            lucide.createIcons();
          }
        }, 2000);
      }
    } else {
      throw new Error("Copy failed");
    }
  } catch (error) {
    showToast("복사에 실패했습니다.", "error");
  }
}

function fallbackCopySilent(text) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "2em";
    textarea.style.height = "2em";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch (error) {
    return false;
  }
}

async function init() {
  renderApp();
  try {
    const embeddedEvents = loadEventsFromEmbeddedData();
    if (embeddedEvents && embeddedEvents.length > 0) {
      state.events = embeddedEvents;
      state.lastUpdateDate =
        embeddedEvents.reduce((latest, event) => {
          if (event.lastUpdated) {
            return !latest || event.lastUpdated > latest ? event.lastUpdated : latest;
          }
          return latest;
        }, null) || new Date();

      const today = new Date();
      const todayEvents = embeddedEvents.filter((event) => {
        const eventDate = new Date(event.date);
        return (
          eventDate.getDate() === today.getDate() &&
          eventDate.getMonth() === today.getMonth() &&
          eventDate.getFullYear() === today.getFullYear()
        );
      });
      if (todayEvents.length > 0) {
        state.selectedEvent = todayEvents[0];
      }

      state.isLoading = false;
      renderApp();
      return;
    }

    const loadedEvents = await loadEventsFromJSON();
    state.events = loadedEvents;
    state.lastUpdateDate = loadedEvents.reduce((latest, event) => {
      if (event.lastUpdated) {
        return !latest || event.lastUpdated > latest ? event.lastUpdated : latest;
      }
      return latest;
    }, null) || new Date();

    const today = new Date();
    const todayEvents = loadedEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === today.getDate() &&
        eventDate.getMonth() === today.getMonth() &&
        eventDate.getFullYear() === today.getFullYear()
      );
    });
    if (todayEvents.length > 0) {
      state.selectedEvent = todayEvents[0];
    }
  } catch (error) {
    state.loadError = "데이터 파일을 불러오지 못했습니다. app/data/uploaded 경로를 확인해주세요.";
    state.events = [];
  } finally {
    state.isLoading = false;
    renderApp();
    bindEvents();
  }
}

init();
