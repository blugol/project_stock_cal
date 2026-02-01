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
  copiedStates: {},
  searchQuery: "",
  keepSearchFocus: false,
  isComposing: false,
  isContactModalOpen: false,
};

const indicatorGuides = {
  PMI: {
    name: "PMI (제조업/서비스)",
    basePoint: "50.0",
    highInterpretation: "경기 확장 (호재)",
    lowInterpretation: "경기 위축 (악재)",
  },
  "제조업 PMI": {
    name: "PMI (제조업/서비스)",
    basePoint: "50.0",
    highInterpretation: "경기 확장 (호재)",
    lowInterpretation: "경기 위축 (악재)",
  },
  "서비스업 PMI": {
    name: "PMI (제조업/서비스)",
    basePoint: "50.0",
    highInterpretation: "경기 확장 (호재)",
    lowInterpretation: "경기 위축 (악재)",
  },
  CPI: {
    name: "CPI (소비자물가)",
    basePoint: "2.0% (YoY)",
    highInterpretation: "인플레이션 (금리 인상)",
    lowInterpretation: "디플레이션/안정 (금리 인하)",
  },
  소비자물가: {
    name: "CPI (소비자물가)",
    basePoint: "2.0% (YoY)",
    highInterpretation: "인플레이션 (금리 인상)",
    lowInterpretation: "디플레이션/안정 (금리 인하)",
  },
  비농업고용: {
    name: "비농업고용 (NFP)",
    basePoint: "20만 건",
    highInterpretation: "경기 과열 (달러 강세)",
    lowInterpretation: "경기 침체 (금리 인하 기대)",
  },
  NFP: {
    name: "비농업고용 (NFP)",
    basePoint: "20만 건",
    highInterpretation: "경기 과열 (달러 강세)",
    lowInterpretation: "경기 침체 (금리 인하 기대)",
  },
  고용: {
    name: "비농업고용 (NFP)",
    basePoint: "20만 건",
    highInterpretation: "경기 과열 (달러 강세)",
    lowInterpretation: "경기 침체 (금리 인하 기대)",
  },
  실업률: {
    name: "실업률",
    basePoint: "4.0~5.0%",
    highInterpretation: "고용 시장 악화",
    lowInterpretation: "완전 고용 상태",
  },
  원유재고: {
    name: "원유재고",
    basePoint: "0 (예상치 대비)",
    highInterpretation: "공급 과잉 (유가 하락)",
    lowInterpretation: "수요 부족/재고 감소 (유가 상승)",
  },
  GDP: {
    name: "GDP (성장률)",
    basePoint: "2.5%",
    highInterpretation: "성장 궤도",
    lowInterpretation: "저성장/경기 불황",
  },
  성장률: {
    name: "GDP (성장률)",
    basePoint: "2.5%",
    highInterpretation: "성장 궤도",
    lowInterpretation: "저성장/경기 불황",
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

// file:// 환경에서도 자동 로드를 위해 JS 임베드 데이터만 사용합니다.

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
        ${
          actualValue !== null
            ? `<p class="text-lg font-bold ${actualColor}">${escapeHtml(actualValue)}${escapeHtml(event.unit || "")}</p>`
            : `<p class="text-lg font-bold text-gray-400">미발표</p>`
        }
      </div>
    `);
  }
  if (event.gap_analysis !== undefined) {
    statsCards.push(`
      <div class="p-3 rounded-lg border shadow-sm ${state.isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-800"}">
        <p class="text-xs mb-1 ${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">괴리율</p>
        <p class="text-lg font-bold ${
          event.gap_analysis > 0
            ? "text-red-600"
            : event.gap_analysis < 0
            ? "text-blue-600"
            : "text-gray-600"
        }">
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
          ${
            guide
              ? `<span class="text-sm font-medium px-2 py-1 rounded ${state.isDarkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"}">
                  기준: ${escapeHtml(guide.basePoint)}
                </span>`
              : ""
          }
          <span class="${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
            ${formatDateKR(event.date)}
          </span>
        </div>
      </div>
      ${
        hasStats
          ? `
            <div class="p-4">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                ${statsCards.join("")}
              </div>
              ${
                event.base_guide
                  ? `<div class="p-4 rounded-lg border mb-3 ${state.isDarkMode ? "bg-blue-900/20 border-blue-700" : "bg-blue-50 border-gray-800"}">
                      <h4 class="font-semibold mb-2 flex items-center gap-2 ${state.isDarkMode ? "text-blue-300" : "text-blue-900"}">
                        <span>💡</span>
                        <span>해석 가이드</span>
                      </h4>
                      <p class="text-sm ${state.isDarkMode ? "text-blue-200" : "text-blue-800"}">
                        ${escapeHtml(event.base_guide)}
                      </p>
                    </div>`
                  : ""
              }
              ${
                event.tooltip
                  ? `<div class="p-4 rounded-lg border mb-3 ${state.isDarkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-800"}">
                      <h4 class="font-semibold mb-2 flex items-center gap-2 ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
                        <span>ℹ️</span>
                        <span>상세 정보</span>
                      </h4>
                      <p class="text-sm ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
                        ${escapeHtml(event.tooltip)}
                      </p>
                    </div>`
                  : ""
              }
              ${
                guide
                  ? `<div class="p-4 rounded-lg border ${state.isDarkMode ? "bg-green-900/20 border-green-700" : "bg-green-50 border-gray-800"}">
                      <h4 class="font-semibold mb-3 flex items-center gap-2 ${state.isDarkMode ? "text-green-300" : "text-green-900"}">
                        <span>📊</span>
                        <span>지표 기준치 가이드</span>
                      </h4>
                      <div class="space-y-2">
                        <div class="flex items-start gap-2">
                          <span class="font-medium min-w-[80px] ${state.isDarkMode ? "text-green-200" : "text-green-800"}">기준점:</span>
                          <span class="font-bold ${state.isDarkMode ? "text-green-100" : "text-green-900"}">${escapeHtml(guide.basePoint)}</span>
                        </div>
                        <div class="flex items-start gap-2">
                          <span class="font-medium min-w-[80px] ${state.isDarkMode ? "text-red-300" : "text-red-700"}">수치 높음:</span>
                          <span class="${state.isDarkMode ? "text-red-200" : "text-red-800"}">${escapeHtml(guide.highInterpretation)}</span>
                        </div>
                        <div class="flex items-start gap-2">
                          <span class="font-medium min-w-[80px] ${state.isDarkMode ? "text-blue-300" : "text-blue-700"}">수치 낮음:</span>
                          <span class="${state.isDarkMode ? "text-blue-200" : "text-blue-800"}">${escapeHtml(guide.lowInterpretation)}</span>
                        </div>
                      </div>
                    </div>`
                  : ""
              }
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
  // 최소 높이 조정: 이벤트 개수에 비례하지만 너무 작지 않게
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
        <div class="border-2 rounded-lg p-1.5 flex flex-col transition-colors ${
          isToday
            ? state.isDarkMode
              ? "bg-blue-900/30 border-blue-500 shadow-md ring-1 ring-blue-500/50"
              : "bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-400/50"
            : state.isDarkMode
            ? "bg-gray-800/50 border-gray-700 hover:bg-gray-800"
            : "bg-white border-gray-200 hover:bg-gray-50 shadow-sm"
        }" style="min-height:${minCellHeight}px">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-bold px-1.5 py-0.5 rounded ${
              dayOfWeek === 0
                ? "text-red-500"
                : dayOfWeek === 6
                ? "text-blue-500"
                : state.isDarkMode
                ? "text-gray-300"
                : "text-gray-700"
            } ${isToday ? (state.isDarkMode ? "bg-blue-800/50" : "bg-blue-100") : ""}">
              ${day}
            </span>
            ${
              dayEvents.length
                ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    state.isDarkMode ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-600"
                  }">${dayEvents.length}</span>`
                : ""
            }
          </div>
          <div class="flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-slim px-0.5 pb-0.5">
            ${dayEvents
              .map((event) => {
                const isSelected = state.selectedEvent && state.selectedEvent.id === event.id;
                const importanceColor = getImportanceColor(event.importance);
                return `
                  <button
                    data-event-id="${event.id}"
                    class="w-full text-left px-2 py-1.5 rounded text-xs transition-all duration-200 flex items-center gap-1.5 border group ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-md border-blue-500 z-10 relative"
                        : state.isDarkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-gray-500"
                        : "bg-white hover:bg-slate-50 text-gray-700 border-gray-200 hover:border-gray-300 shadow-sm"
                    }"
                    style="${
                      isSelected
                        ? ""
                        : `border-left-width: 3px; border-left-color: ${importanceColor};`
                    }"
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
        <div class="flex items-center gap-4">
          <button onclick="goToPrevMonth()" class="p-2 rounded-lg transition-colors border ${state.isDarkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-600"}">
            <i data-lucide="chevron-left" class="size-5"></i>
          </button>
          <h2 class="font-bold text-xl ${state.isDarkMode ? "text-white" : "text-gray-900"} min-w-[140px] text-center">${year}년 ${monthNames[month]}</h2>
          <button onclick="goToNextMonth()" class="p-2 rounded-lg transition-colors border ${state.isDarkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-200 hover:bg-gray-50 text-gray-600"}">
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