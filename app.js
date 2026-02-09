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
  const allKeywords = [...new Set([...keywords, ...eventKeywords])];
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

  const finalMajor = categorizedStocks.major.slice(0, 15);
  const finalMid = categorizedStocks.mid.slice(0, 15);
  const finalSmall = categorizedStocks.small.slice(0, 15);

  const categories = [];
  if (finalMajor.length) categories.push({ tier: "major", tierName: "대장주", stocks: finalMajor });
  if (finalMid.length) categories.push({ tier: "mid", tierName: "중견주", stocks: finalMid });
  if (finalSmall.length) categories.push({ tier: "small", tierName: "관련주", stocks: finalSmall });
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

function showToast(message, type = "success") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  root.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
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
    high: "높음",
    medium: "보통",
    low: "낮음",
  };
  
  return `
    <div id="selected-event-details" class="rounded-xl border-2 shadow-lg mb-6 ${state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}">
      <div class="p-4 border-b ${state.isDarkMode ? "border-gray-700" : "border-gray-200"}">
        <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <h2 class="text-xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"} flex-shrink-0 mb-2 sm:mb-0">
              ${escapeHtml(event.title)}
            </h2>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold" style="background-color:${event.categoryColor}20;color:${event.categoryColor};border-color:${event.categoryColor};">
                ${escapeHtml(event.category)}
              </span>
              <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs ${importanceColors[event.importance]}">
                중요도: ${importanceLabels[event.importance]}
              </span>
              <span class="inline-flex items-center rounded-md border px-2 py-1 text-xs bg-blue-600 text-white border-blue-700 font-bold">
                ${escapeHtml(event.country)}
              </span>
            </div>
        </div>
        <p class="text-sm mt-2 ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
          ${formatDateKR(event.date)} ${formatTimeKR(event.date)}
        </p>
      </div>
      <div class="p-4">
        ${guide ? `
          <div class="p-4 rounded-lg border ${state.isDarkMode ? "bg-green-900/20 border-green-700" : "bg-green-50 border-green-200"}">
            <h4 class="font-semibold mb-3 flex items-center gap-2 ${state.isDarkMode ? "text-green-300" : "text-green-800"}">
              <span>📊</span>
              <span>지표 해석 가이드</span>
            </h4>
            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-3">
                <span class="font-bold w-16 text-center shrink-0 ${state.isDarkMode ? "text-gray-300" : "text-gray-600"}">기준점</span>
                <span class="font-mono font-medium ${state.isDarkMode ? "text-white" : "text-black"}">${escapeHtml(guide.basePoint)}</span>
              </div>
              <div class="flex items-start gap-3">
                <span class="font-bold w-16 text-center shrink-0 ${state.isDarkMode ? "text-red-400" : "text-red-600"}">수치 높을 때</span>
                <span class="${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">${escapeHtml(guide.highInterpretation)}</span>
              </div>
              <div class="flex items-start gap-3">
                <span class="font-bold w-16 text-center shrink-0 ${state.isDarkMode ? "text-blue-400" : "text-blue-600"}">수치 낮을 때</span>
                <span class="${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">${escapeHtml(guide.lowInterpretation)}</span>
              </div>
            </div>
          </div>
        ` : `
          <p class="${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
            ${escapeHtml(event.description || "상세 정보가 없습니다.")}
          </p>
        `}
      </div>
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
  
  const maxEventsToShow = 4;
  const minCellHeight = 130;
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  const calendarCells = calendarDays
    .map((day, index) => {
      if (day === null) {
        return `<div class="border-transparent"></div>`;
      }
      const dayEvents = eventsForDate(day);
      const today = new Date();
      const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const dayOfWeek = index % 7;
      return `
        <div class="border rounded-lg p-1.5 flex flex-col transition-all duration-300 ${isToday ? state.isDarkMode ? "bg-blue-900/30 border-blue-500 shadow-md ring-1 ring-blue-500/50" : "bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-400/50" : state.isDarkMode ? "bg-gray-800/50 border-gray-700 hover:bg-gray-800/80 hover:border-gray-600" : "bg-white border-gray-200 hover:bg-gray-50/80 hover:border-gray-300 shadow-sm"} " style="min-height:${minCellHeight}px">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-bold px-1.5 py-0.5 rounded ${dayOfWeek === 0 ? "text-red-500" : dayOfWeek === 6 ? "text-blue-500" : state.isDarkMode ? "text-gray-300" : "text-gray-700"} ${isToday ? (state.isDarkMode ? "bg-blue-800/50" : "bg-blue-100") : ""}">
              ${day}
            </span>
            ${dayEvents.length ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full font-bold ${state.isDarkMode ? "bg-gray-700 text-gray-300" : "bg-slate-100 text-slate-600"}">${dayEvents.length}</span>` : ""}
          </div>
          <div class="flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-slim px-0.5 pb-0.5">
            ${dayEvents
              .slice(0, maxEventsToShow)
              .map(
                (event) => {
                  const isSelected = state.selectedEvent && state.selectedEvent.id === event.id;
                  const importanceColor = getImportanceColor(event.importance);
                  return `
                  <button
                    data-event-id="${event.id}"
                    class="w-full text-left px-2 py-1 rounded text-xs transition-all duration-200 flex items-center gap-1.5 border group ${isSelected ? "bg-blue-600 text-white shadow-md border-blue-500 z-10 relative" : state.isDarkMode ? "bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 border-gray-600 hover:border-gray-500" : "bg-white hover:bg-slate-50 text-gray-700 border-gray-200 hover:border-gray-300 shadow-sm"}"
                    style="${isSelected ? "" : `border-left-width: 3px; border-left-color: ${importanceColor};`}"
                    title="${escapeHtml(event.title)}"
                  >
                    <span class="truncate flex-1 font-medium">${escapeHtml(event.title)}</span>
                    <span class="text-[10px] font-mono opacity-70 whitespace-nowrap">
                      ${formatTimeKR(new Date(event.date)).substring(0, 5)}
                    </span>
                  </button>
                `;
              }
              )
              .join("")}
            ${dayEvents.length > maxEventsToShow ? `
              <div class="text-center text-[10px] py-1 ${state.isDarkMode ? 'text-gray-400' : 'text-gray-500'}">
                +${dayEvents.length - maxEventsToShow}개 더보기
              </div>
            ` : ''}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="rounded-xl border shadow-lg overflow-hidden ${state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}">
      <div class="p-4 border-b ${state.isDarkMode ? "border-gray-700" : "border-gray-200"} flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-4 flex-shrink-0">
          <button data-action="prev-month" class="p-2 rounded-lg transition-colors border ${state.isDarkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-200 hover:bg-gray-100 text-gray-600"}">
            <i data-lucide="chevron-left" class="size-5"></i>
          </button>
          <h2 class="font-bold text-xl ${state.isDarkMode ? "text-white" : "text-gray-900"} min-w-[140px] text-center flex-shrink-0 pr-2">${year}년 ${monthNames[month]}</h2>
          <button data-action="next-month" class="p-2 rounded-lg transition-colors border ${state.isDarkMode ? "border-gray-600 hover:bg-gray-700 text-gray-300" : "border-gray-200 hover:bg-gray-100 text-gray-600"}">
            <i data-lucide="chevron-right" class="size-5"></i>
          </button>
        </div>
        
        <div class="flex flex-wrap items-center justify-center gap-3 text-xs">
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${getImportanceColor('high')}"></div>
            <span class="${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">높음</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${getImportanceColor('medium')}"></div>
            <span class="${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">보통</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${getImportanceColor('low')}"></div>
            <span class="${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">낮음</span>
          </div>
        </div>
      </div>
      
      <div class="p-4 bg-opacity-50 ${state.isDarkMode ? "bg-gray-900/30" : "bg-gray-50/50"}">
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

function getTierColors(tier) {
  switch (tier) {
    case "major":
      return {
        bg: state.isDarkMode ? "bg-blue-900/30" : "bg-blue-50",
        border: state.isDarkMode ? "border-blue-700" : "border-gray-300",
        text: state.isDarkMode ? "text-blue-300" : "text-blue-700",
        badge: state.isDarkMode ? "bg-blue-800 text-blue-200" : "bg-blue-100 text-blue-700",
      };
    case "mid":
      return {
        bg: state.isDarkMode ? "bg-purple-900/30" : "bg-purple-50",
        border: state.isDarkMode ? "border-purple-700" : "border-gray-300",
        text: state.isDarkMode ? "text-purple-300" : "text-purple-700",
        badge: state.isDarkMode ? "bg-purple-800 text-purple-200" : "bg-purple-100 text-purple-700",
      };
    case "small":
      return {
        bg: state.isDarkMode ? "bg-green-900/30" : "bg-green-50",
        border: state.isDarkMode ? "border-green-700" : "border-gray-300",
        text: state.isDarkMode ? "text-green-300" : "text-green-700",
        badge: state.isDarkMode ? "bg-green-800 text-green-200" : "bg-green-100 text-green-700",
      };
    default:
      return {
        bg: state.isDarkMode ? "bg-gray-800" : "bg-gray-50",
        border: state.isDarkMode ? "border-gray-700" : "border-gray-300",
        text: state.isDarkMode ? "text-gray-300" : "text-gray-700",
        badge: state.isDarkMode ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700",
      };
  }
}

function renderStockCategory(category) {
  const filteredStocks = getFilteredStocks(category);
  const isSearching = state.searchQuery.trim().length > 0;
  
  const tierColors = getTierColors(category.tier);
  const expanded = state.expandedTiers[category.tier];
  const iconName = category.tier === "major" ? "rocket" : category.tier === "mid" ? "building" : "trending-up";

  return `
    <div class="rounded-lg border overflow-hidden ${tierColors.border} ${state.isDarkMode ? 'bg-gray-800/50' : 'bg-white'}">
      <button
        data-action="toggle-tier"
        data-tier="${category.tier}"
        class="w-full px-4 py-3 flex items-center justify-between transition-colors ${tierColors.bg} hover:opacity-80"
      >
        <div class="flex items-center gap-3">
          <div class="${tierColors.text}">
            <i data-lucide="${iconName}" class="size-5"></i>
          </div>
          <div class="text-left">
            <h3 class="font-bold ${tierColors.text}">${escapeHtml(category.tierName)}</h3>
            <p class="text-xs ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
              ${filteredStocks.length}개 종목${isSearching ? " (검색됨)" : ""}
            </p>
          </div>
        </div>
        <div class="transition-transform duration-300 ${expanded ? "rotate-180" : ""}">
          <i data-lucide="chevron-down" class="size-5 ${tierColors.text}"></i>
        </div>
      </button>
      ${expanded ? `
            <div class="p-3 ${state.isDarkMode ? "bg-gray-800/50" : "bg-white"}">
              <div class="space-y-2 max-h-80 overflow-y-auto scrollbar-slim pr-1">
                ${filteredStocks.length === 0 ? `<div class="text-sm text-center py-6 ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
                        ${isSearching ? '검색 결과가 없습니다.' : '관련 종목이 없습니다.'}
                      </div>`
                  : filteredStocks
                      .map(
                        (stock) => `
                            <div class="p-2.5 rounded-lg border transition-colors ${state.isDarkMode ? "bg-gray-700/70 border-gray-600/80 hover:bg-gray-700" : "bg-gray-50/70 border-gray-200/80 hover:bg-white shadow-sm"}">
                              <div class="flex items-center justify-between gap-2">
                                <div class="flex-1 min-w-0">
                                   <div class="flex items-center gap-2 mb-1">
                                    <h4 class="font-semibold truncate ${state.isDarkMode ? "text-white" : "text-gray-800"}">
                                      ${escapeHtml(stock.name)}
                                    </h4>
                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap ${tierColors.badge}">
                                      ${escapeHtml(stock.code)}
                                    </span>
                                  </div>
                                  <p class="text-xs line-clamp-2 ${state.isDarkMode ? "text-gray-400" : "text-gray-500"}">
                                    ${escapeHtml(stock.sector)}
                                  </p>
                                </div>
                                <button data-action="copy-stock" data-stock-name="${escapeHtml(stock.name)}" title="종목명 복사" class="p-1.5 rounded-md transition-colors ${state.isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-500 hover:bg-gray-200'}">
                                   <i data-lucide="copy" class="size-4"></i>
                                </button>
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
                class="w-full text-sm font-bold py-2.5 flex items-center justify-center gap-2 mt-3 rounded-md transition-colors ${filteredStocks.length === 0 ? "opacity-50 cursor-not-allowed" : ""} ${tierColors.bg} ${tierColors.text} hover:opacity-80"
                ${filteredStocks.length === 0 ? "disabled" : ""}
              >
                <i data-lucide="clipboard-list" class="size-4"></i>
                <span>${escapeHtml(category.tierName)} 리스트 복사</span>
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
  if (!event || !event.relatedStocks || !event.relatedStocks.length) {
    return `
      <div class="rounded-lg border shadow-lg p-6 text-center ${state.isDarkMode ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-white border-gray-200 text-gray-600"}">
        <h2 class="text-2xl font-bold mb-4 ${state.isDarkMode ? "text-white" : "text-gray-900"}">📈 관련 주식 종목</h2>
        <p>선택된 경제 이벤트와 관련된 주식 종목이 없습니다.</p>
        <p class="text-sm mt-2">다른 이벤트를 선택해보세요.</p>
      </div>
    `;
  }

  const categories = ["major", "mid", "small"]
    .map((tier) => event.relatedStocks.find((cat) => cat.tier === tier))
    .filter(Boolean);
  
  return `
    <div id="related-stocks-section" class="rounded-lg border shadow-lg p-4 sm:p-6 ${state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}">
      <div class="mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
          <h2 class="text-2xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">📈 관련 주식 종목</h2>
          <button
            data-action="copy-all"
            class="px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium ${state.isDarkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}"
          >
            <i data-lucide="copy-check" class="size-4"></i>
            <span>전체 종목명 복사</span>
          </button>
        </div>
        <div class="relative mt-4">
           <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 ${state.isDarkMode ? 'text-gray-400' : 'text-gray-500'}"></i>
          <input
            id="stock-search-input"
            type="text"
            value="${escapeHtml(state.searchQuery)}"
            placeholder="종목명, 코드, 섹터로 검색..."
            class="w-full rounded-md border px-3 py-2 pl-9 text-sm ${state.isDarkMode
              ? "bg-gray-700/50 border-gray-600 text-gray-100 placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
              : "bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:ring-blue-500 focus:border-blue-500"
            }"
          />
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
  
  uniqueGuides.sort((a,b) => a.name.localeCompare(b.name, 'ko'));

  return `
    <div class="mt-16 mb-8">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold mb-4 ${state.isDarkMode ? "text-white" : "text-gray-900"}">
          📚 경제 지표 용어 사전
        </h2>
        <p class="text-lg ${state.isDarkMode ? "text-gray-400" : "text-gray-600"} max-w-2xl mx-auto">
          주식 시장에 영향을 미치는 주요 경제 지표들을 알기 쉽게 정리했습니다. 투자의 기초를 다지는 데 활용해보세요.
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${uniqueGuides.map(guide => `
          <div class="min-w-0 w-full rounded-xl border p-6 transition-all shadow-md hover:shadow-xl hover:-translate-y-1 flex flex-col h-full ${state.isDarkMode ? "bg-gray-800 border-gray-700 hover:border-blue-500/50" : "bg-white border-gray-200 hover:border-blue-400"}">
            <h3 class="text-xl font-bold mb-4 ${state.isDarkMode ? "text-blue-300" : "text-blue-700"} break-words">
              ${escapeHtml(guide.name)}
            </h3>
            <div class="space-y-4 flex-grow text-sm">
               <div class="flex items-start gap-2">
                <span class="font-bold shrink-0 opacity-80">기준점:</span>
                <span class="font-mono font-medium ${state.isDarkMode ? "text-gray-200" : "text-gray-800"} break-words min-w-0 flex-1">${escapeHtml(guide.basePoint)}</span>
              </div>
              
              <div class="p-3 rounded-lg ${state.isDarkMode ? "bg-red-900/20" : "bg-red-50/50"}">
                <p class="font-bold mb-1 ${state.isDarkMode ? "text-red-300" : "text-red-600"}">📈 수치가 높을 때</p>
                <p class="${state.isDarkMode ? "text-gray-300" : "text-gray-700"} break-words">${escapeHtml(guide.highInterpretation)}</p>
              </div>
              
              <div class="p-3 rounded-lg ${state.isDarkMode ? "bg-blue-900/20" : "bg-blue-50/50"}">
                <p class="font-bold mb-1 ${state.isDarkMode ? "text-blue-300" : "text-blue-600"}">📉 수치가 낮을 때</p>
                <p class="${state.isDarkMode ? "text-gray-300" : "text-gray-700"} break-words">${escapeHtml(guide.lowInterpretation)}</p>
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
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" data-action="close-contact-overlay">
      <div class="w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${state.isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"}">
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
              <label for="contact-name" class="block text-sm font-medium mb-1.5 ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
                이름 (또는 회사명)
              </label>
              <input
                type="text"
                id="contact-name"
                name="name"
                required
                class="w-full rounded-lg px-3.5 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${state.isDarkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" 
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
                }"
                placeholder="홍길동"
              />
            </div>
            
            <div>
              <label for="contact-email" class="block text-sm font-medium mb-1.5 ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
                회신받을 이메일
              </label>
              <input
                type="email"
                id="contact-email"
                name="email"
                required
                class="w-full rounded-lg px-3.5 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${state.isDarkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" 
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
                }"
                placeholder="example@email.com"
              />
            </div>
            
            <div>
              <label for="contact-message" class="block text-sm font-medium mb-1.5 ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
                문의 내용
              </label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows="4"
                class="w-full rounded-lg px-3.5 py-2 text-sm border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none ${state.isDarkMode 
                  ? "bg-gray-700 border-gray-600 text-white placeholder:text-gray-400" 
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500"
                }"
                placeholder="제휴 제안이나 사이트 개선사항 등 자유롭게 적어주세요."
              ></textarea>
            </div>
            
            <button
              id="contact-submit-btn"
              type="submit"
              class="w-full rounded-lg py-3 font-bold text-white transition-all transform active:scale-95 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-wait"
            >
              보내기
            </button>
            <p class="text-xs text-center ${state.isDarkMode ? "text-gray-500" : "text-gray-400"}">
              * Formspree 서비스를 통해 안전하게 전송됩니다.
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
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" data-action="close-privacy-overlay">
      <div class="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${state.isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"}">
        <div class="p-6 border-b ${state.isDarkMode ? "border-gray-700" : "border-gray-200"} flex items-center justify-between flex-shrink-0">
          <h3 class="text-xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">개인정보처리방침</h3>
          <button
            data-action="close-privacy"
            class="rounded-lg p-2 transition-colors ${state.isDarkMode ? "text-gray-400 hover:bg-gray-700 hover:text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}"
          >
            <i data-lucide="x" class="size-5"></i>
          </button>
        </div>
        <div class="p-6 overflow-y-auto ${state.isDarkMode ? "text-gray-300" : "text-gray-700"} space-y-4 text-sm leading-relaxed">
          <p><strong>최종 수정일: 2026년 2월 9일</strong></p>
          
          <p>본 웹사이트('경제일정 & 종목확인', 이하 '서비스')는 사용자의 개인정보를 소중히 다루며, 관련 법령을 준수하고 있습니다.</p>

          <p><strong>1. 개인정보의 수집 및 이용 목적</strong><br>
          '서비스'는 별도의 회원가입 절차 없이 모든 콘텐츠를 이용할 수 있도록 제공됩니다. 따라서 대부분의 경우 사용자의 개인정보를 직접 수집하거나 저장하지 않습니다. 다만, '제휴 문의' 기능을 통해 사용자가 자발적으로 제공하는 정보(이름, 이메일 주소, 문의 내용)는 문의에 대한 응답 및 원활한 커뮤니케이션을 위해서만 수집 및 이용됩니다. 이 정보는 다른 목적으로 절대 사용되지 않으며, 문의 처리 완료 후 안전하게 파기됩니다.</p>

          <p><strong>2. 쿠키(Cookie) 및 광고 서비스</strong><br>
          '서비스'는 양질의 콘텐츠를 무료로 제공하기 위해 구글 애드센스(Google AdSense) 광고 프로그램을 사용하고 있습니다. 이 과정에서 다음과 같은 데이터가 사용될 수 있습니다.<br>
          - 구글 및 광고 파트너는 쿠키(Cookie)를 사용하여 사용자의 '서비스' 방문 기록 또는 다른 웹사이트 방문 기록을 기반으로 맞춤형 광고를 제공합니다.<br>
          - 이 쿠키는 개인을 식별할 수 있는 정보(이름, 주소, 이메일 등)를 포함하지 않습니다.<br>
          - 사용자는 언제든지 구글 광고 설정(<a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" class="underline text-blue-500">adssettings.google.com</a>)을 통해 맞춤형 광고 게재를 중단할 수 있습니다. 또한, <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" class="underline text-blue-500">aboutads.info/choices</a>를 방문하여 제3자 광고 사업자의 쿠키 사용을 제어할 수 있습니다.</p>

          <p><strong>3. 로그 데이터 및 분석</strong><br>
          '서비스'의 품질 개선 및 통계 분석을 위해 서버는 사용자의 브라우저가 전송하는 비식별 정보를 자동으로 기록할 수 있습니다. 이 정보에는 사용자의 IP 주소, 브라우저 유형, 방문 페이지, 방문 시간 등이 포함될 수 있으나, 이는 특정 개인을 식별하는 용도로 사용되지 않습니다.</p>
          
          <p><strong>4. 개인정보의 보유 및 파기</strong><br>
          '제휴 문의'를 통해 수집된 개인정보는 목적 달성 후 지체 없이 파기하는 것을 원칙으로 합니다. 법령에 따라 보존해야 하는 경우를 제외하고, 사용자의 정보는 안전하게 삭제 처리됩니다.</p>
          
          <p><strong>5. 정책 변경 안내</strong><br>
          본 개인정보처리방침은 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 정정이 있는 경우 웹사이트 공지사항(또는 개별공지)을 통하여 공지할 것입니다.</p>
        </div>
      </div>
    </div>
  `;
}

function renderAboutModal() {
  if (!state.isAboutModalOpen) return "";

  return `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" data-action="close-about-overlay">
      <div class="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${state.isDarkMode ? "bg-gray-800 border border-gray-700" : "bg-white"}">
        <div class="p-6 border-b ${state.isDarkMode ? "border-gray-700" : "border-gray-200"} flex items-center justify-between flex-shrink-0">
          <h3 class="text-xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">사이트 소개</h3>
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
              <i data-lucide="calendar-check" class="size-8 text-white"></i>
            </div>
            <h2 class="text-xl font-bold ${state.isDarkMode ? "text-white" : "text-gray-900"}">경제일정 & 종목확인</h2>
            <p class="text-xs opacity-70 mt-1">Investment Calendar & Stock Checker</p>
          </div>

          <p>
            안녕하세요! <strong>경제일정 & 종목확인</strong>에 오신 것을 환영합니다.
          </p>
          
          <p>
            이 서비스는 매일 쏟아지는 수많은 경제 지표와 복잡한 시장 일정 속에서, 
            <span class="font-bold ${state.isDarkMode ? 'text-blue-300' : 'text-blue-600'}">"오늘 어떤 경제 이벤트가 중요하고, 그래서 어떤 주식에 주목해야 할까?"</span>라는 
            현명한 투자자들의 핵심 질문에 답을 드리기 위해 만들어졌습니다.
          </p>

          <div class="${state.isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} p-4 rounded-lg border ${state.isDarkMode ? 'border-gray-600' : 'border-gray-200'}">
            <h4 class="font-bold mb-2 ${state.isDarkMode ? "text-blue-300" : "text-blue-700"}">주요 기능</h4>
            <ul class="list-disc list-inside space-y-1.5 ml-1">
              <li>📅 <strong>한눈에 보는 경제 캘린더:</strong> 국내외 주요 경제 지표 발표 일정을 놓치지 않도록 깔끔하게 정리해 드립니다.</li>
              <li>📈 <strong>AI 기반 관련주 추천:</strong> 각 경제 이벤트가 발표될 때마다 시장에서 어떤 종목들이 주목받을지 대장주, 중견주, 관련주로 분류하여 자동으로 추천합니다.</li>
              <li>📋 <strong>원클릭 종목 복사:</strong> 관심 있는 종목 리스트를 클릭 한 번으로 복사하여 사용하시는 HTS나 메모장에 바로 붙여넣을 수 있습니다.</li>
              <li>📚 <strong>친절한 용어 사전:</strong> CPI, GDP 등 어렵게만 느껴졌던 경제 용어들을 누구나 쉽게 이해할 수 있도록 풀어서 설명해 드립니다.</li>
            </ul>
          </div>

          <p>
            저희 '경제일정 & 종목확인'이 여러분의 성공적인 투자를 위한 든든한 나침반이 되기를 바랍니다.<br>
            사이트 개선을 위한 제안이나 제휴 문의는 언제든 '제휴 문의' 메뉴를 통해 연락 주시기 바랍니다.
          </p>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  if (!state.lastUpdateDate) return "";
  return `
    <footer class="mt-16 pt-8 pb-8 border-t text-center ${state.isDarkMode ? "border-gray-700" : "border-gray-200"}">
      <div class="mb-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm font-medium ${state.isDarkMode ? "text-gray-400" : "text-gray-600"}">
        <button data-action="open-about" class="hover:underline hover:text-blue-500 transition-colors">사이트 소개</button>
        <span class="hidden sm:inline text-gray-400">|</span>
        <button data-action="open-privacy" class="hover:underline hover:text-blue-500 transition-colors">개인정보처리방침</button>
        <span class="hidden sm:inline text-gray-400">|</span>
        <button data-action="open-contact" class="hover:underline hover:text-blue-500 transition-colors">제휴 및 광고 문의</button>
      </div>
      <p class="text-sm mb-2 font-medium ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
        본 서비스에서 제공하는 정보는 투자 참고용이며, 투자에 대한 최종 결정과 책임은 투자자 본인에게 있습니다.
      </p>
      <p class="text-xs font-medium ${state.isDarkMode ? "text-gray-500" : "text-gray-500"}">
        (데이터 최종 업데이트: ${state.lastUpdateDate.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })})
      </p>
      <p class="text-xs mt-4 opacity-60 ${state.isDarkMode ? "text-gray-500" : "text-gray-400"}">
        &copy; 2026 Stock Calendar. All Rights Reserved.
      </p>
    </footer>
  `;
}

function renderApp() {
  const app = document.getElementById("app");
  if (!app) return;

  document.documentElement.classList.toggle("dark", state.isDarkMode);
  
  const backgroundClass = state.isDarkMode
    ? "bg-gray-900 text-gray-300"
    : "bg-gray-50 text-gray-800";
  
  const headerBg = state.isDarkMode ? "bg-gray-800/80 border-gray-700 backdrop-blur-lg" : "bg-white/80 border-gray-200 backdrop-blur-lg shadow-sm";

  app.className = `min-h-screen transition-colors duration-300 ${backgroundClass}`;

  const loadingBanner = state.isLoading
    ? `<div class="my-10 text-center text-sm ${state.isDarkMode ? "text-gray-400" : "text-gray-600"} flex items-center justify-center gap-2"><div class="loader"></div> 데이터를 불러오는 중입니다...</div>`
    : "";

  const errorBanner = state.loadError
    ? `<div class="my-10 text-center text-sm text-red-500 p-4 bg-red-500/10 rounded-lg border border-red-500/20">${escapeHtml(state.loadError)}</div>`
    : "";

  const todayDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  app.innerHTML = `
      <header class="border-b sticky top-0 z-20 transition-colors ${headerBg}">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-between h-20">
            <a href="/" class="flex items-center gap-3 flex-1 min-w-0">
              <div class="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg shrink-0 shadow-lg">
                <i data-lucide="calendar-check" class="size-7 text-white"></i>
              </div>
              <div class="min-w-0">
                <h1 class="font-bold text-xl sm:text-2xl ${state.isDarkMode ? "text-white" : "text-gray-900"} truncate">경제일정 & 종목확인</h1>
                <p class="text-xs sm:text-sm ${state.isDarkMode ? "text-gray-400" : "text-gray-600"} truncate hidden sm:block">한눈에 보는 투자 캘린더와 관련주</p>
              </div>
            </a>
            
            <div class="flex items-center gap-2 shrink-0 ml-2">
              <button
                data-action="toggle-theme"
                class="transition-colors border rounded-md p-2 ${state.isDarkMode
                  ? "bg-gray-700/50 border-gray-600 hover:bg-gray-700 text-yellow-400"
                  : "bg-white/50 border-gray-200 hover:bg-gray-100 text-gray-600"
                }"
                aria-label="다크 모드 토글"
              >
                <i data-lucide="${state.isDarkMode ? "sun" : "moon-star"}" class="size-5"></i>
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main class="container mx-auto px-4 py-6 sm:py-8">
        <div class="rounded-xl border p-5 mb-8 shadow-md ${state.isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-blue-100"}">
          <h2 class="text-xl font-bold mb-3 flex items-center gap-2 ${state.isDarkMode ? "text-blue-300" : "text-blue-700"}">
            <i data-lucide="lightbulb" class="size-5"></i>
            <span>오늘의 투자 나침반</span>
          </h2>
          <p class="text-sm sm:text-base leading-relaxed ${state.isDarkMode ? "text-gray-300" : "text-gray-700"}">
            성공적인 투자는 시장의 흐름을 읽는 것에서 시작됩니다. <strong>미국 CPI, 비농업 고용지수(NFP), FOMC 금리 결정</strong>과 같은 주요 경제 이벤트는 시장의 단기 방향을 결정하는 핵심 변수입니다. 
            본 캘린더를 통해 중요 이벤트를 확인하고, 이벤트에 따라 시장의 주목을 받을 수 있는 <strong>관련주, 수혜주</strong>를 미리 파악하여 한발 앞선 투자 전략을 세워보세요.
          </p>
        </div>

        ${loadingBanner}
        ${errorBanner}
        
        <div id="content-wrapper" class="${(state.isLoading || state.loadError) ? 'hidden' : ''}">
            <div class="space-y-8">
              ${renderSelectedEvent()}
              ${renderRelatedStocks()}
              <div class="text-center mt-12 mb-4">
                 <p class="text-base font-medium ${state.isDarkMode ? "text-gray-500" : "text-gray-400"}">
                  <i data-lucide="mouse-pointer-2" class="size-4 inline mr-1"></i>
                  아래 캘린더에서 날짜를 클릭하여 다른 이벤트의 상세 정보와 관련 종목을 확인하세요.
                </p>
              </div>
              ${renderCalendar()}
            </div>
            ${renderGlossarySection()}
        </div>
        
        ${renderFooter()}
      </main>
      
      ${renderContactModal()}
      ${renderPrivacyModal()}
      ${renderAboutModal()}
  `;

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  const searchInput = document.getElementById("stock-search-input");
  if (searchInput && searchInput instanceof HTMLInputElement) {
    if (state.keepSearchFocus) {
      searchInput.focus();
      const length = searchInput.value.length;
      searchInput.setSelectionRange(length, length);
      state.keepSearchFocus = false;
    }
  }
}

function applySearchFilter() {
  const searchInput = document.getElementById("stock-search-input");
  if (searchInput && searchInput instanceof HTMLInputElement) {
      state.searchQuery = searchInput.value;
  }
  state.keepSearchFocus = true;

  const relatedStocksSection = document.getElementById('related-stocks-section');
  if (relatedStocksSection) {
      relatedStocksSection.innerHTML = renderRelatedStocks();
      if (typeof lucide !== "undefined") {
          lucide.createIcons();
      }
  }
}

function copyToClipboard(text, message) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(message, 'success');
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(message, 'success');
    } catch (err) {
      showToast('복사에 실패했습니다.', 'error');
    }
    document.body.removeChild(textArea);
  });
}

function bindEvents() {
  const appRoot = document.getElementById("app");
  if (!appRoot || appRoot.dataset.eventsBound) return;
  appRoot.dataset.eventsBound = "true";

  appRoot.addEventListener("click", (event) => {
    let target = event.target.closest("[data-action], [data-event-id]");
    
    if (!target) {
        if (event.target.closest('[data-action="close-contact-overlay"]') === event.target) {
            state.isContactModalOpen = false;
            renderApp();
        }
        if (event.target.closest('[data-action="close-privacy-overlay"]') === event.target) {
            state.isPrivacyModalOpen = false;
            renderApp();
        }
        if (event.target.closest('[data-action="close-about-overlay"]') === event.target) {
            state.isAboutModalOpen = false;
            renderApp();
        }
        return;
    }

    const eventId = target.dataset.eventId;
    if (eventId) {
      const selected = state.events.find((item) => item.id === eventId);
      if (selected && (!state.selectedEvent || state.selectedEvent.id !== selected.id)) {
        state.selectedEvent = selected;
        state.searchQuery = ''; // Reset search query when changing event
        
        // Re-render only the affected parts
        const selectedEventDetails = document.getElementById('selected-event-details');
        const relatedStocksSection = document.getElementById('related-stocks-section');
        
        if (selectedEventDetails) selectedEventDetails.outerHTML = renderSelectedEvent();
        if (relatedStocksSection) relatedStocksSection.outerHTML = renderRelatedStocks();
        
        // Re-render calendar to update selected styles
        const calendarContainer = document.querySelector('.grid.grid-cols-7.gap-2');
        if (calendarContainer) {
            const parent = calendarContainer.parentElement.parentElement;
            if(parent) parent.outerHTML = renderCalendar();
        }

        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      }
      return;
    }

    const action = target.dataset.action;
    const tier = target.dataset.tier;

    switch (action) {
      case "prev-month":
        goToPrevMonth();
        break;
      case "next-month":
        goToNextMonth();
        break;
      case "toggle-theme":
        state.isDarkMode = !state.isDarkMode;
        localStorage.setItem("darkMode", String(state.isDarkMode));
        renderApp();
        break;
      case "toggle-tier":
        if (tier) {
          state.expandedTiers[tier] = !state.expandedTiers[tier];
          const relatedStocksSection = document.getElementById('related-stocks-section');
          if (relatedStocksSection) {
              relatedStocksSection.innerHTML = renderRelatedStocks();
              if (typeof lucide !== "undefined") lucide.createIcons();
          }
        }
        break;
      case "copy-stock":
        const stockName = target.dataset.stockName;
        if(stockName) copyToClipboard(stockName, `종목명 '${stockName}'이 복사되었습니다.`);
        break;
      case "copy-all":
        if (state.selectedEvent) {
          const allStockNames = state.selectedEvent.relatedStocks
            .flatMap(cat => getFilteredStocks(cat))
            .map(stock => stock.name)
            .join('\n');
          if(allStockNames) {
            copyToClipboard(allStockNames, '현재 필터링된 모든 종목명이 복사되었습니다.');
          } else {
            showToast('복사할 종목이 없습니다.', 'error');
          }
        }
        break;
      case "copy-tier":
        if (tier && state.selectedEvent) {
          const category = state.selectedEvent.relatedStocks.find((cat) => cat.tier === tier);
          if (category) {
            const tierStockNames = getFilteredStocks(category).map(stock => stock.name).join('\n');
            if(tierStockNames) {
                copyToClipboard(tierStockNames, `${category.tierName} 리스트가 복사되었습니다.`);
            } else {
                showToast('복사할 종목이 없습니다.', 'error');
            }
          }
        }
        break;
      case "open-contact":
      case "close-contact":
        state.isContactModalOpen = !state.isContactModalOpen;
        renderApp();
        break;
      case "open-privacy":
      case "close-privacy":
        state.isPrivacyModalOpen = !state.isPrivacyModalOpen;
        renderApp();
        break;
      case "open-about":
      case "close-about":
        state.isAboutModalOpen = !state.isAboutModalOpen;
        renderApp();
        break;
    }
  });

  appRoot.addEventListener("submit", async (event) => {
    const targetForm = event.target;
    if (targetForm instanceof HTMLFormElement && targetForm.id === "contact-form") {
      event.preventDefault();
      const submitBtn = document.getElementById("contact-submit-btn");
      const originalBtnText = submitBtn.innerHTML;
      
      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loader-btn"></span> 전송 중...';
        
        const formData = new FormData(targetForm);
        const response = await fetch(targetForm.action, {
          method: targetForm.method,
          body: formData,
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          showToast("문의가 성공적으로 전송되었습니다!", "success");
          targetForm.reset();
          state.isContactModalOpen = false;
          renderApp();
        } else {
          const errorData = await response.json();
          const errorMessage = errorData.errors ? errorData.errors.map(e => e.message).join(', ') : '양식 제출에 실패했습니다.';
          showToast(errorMessage, "error");
        }
      } catch (error) {
        showToast("네트워크 오류가 발생했습니다. 다시 시도해주세요.", "error");
      } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
      }
    }
  });

  let searchTimeout;
  appRoot.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.id === "stock-search-input") {
      clearTimeout(searchTimeout);
      state.searchQuery = target.value;
      searchTimeout = setTimeout(() => {
        const relatedStocksSection = document.getElementById('related-stocks-section');
        if (relatedStocksSection) {
            relatedStocksSection.innerHTML = renderRelatedStocks();
            if (typeof lucide !== "undefined") lucide.createIcons();
            
            // Maintain focus after re-render
            const newSearchInput = document.getElementById("stock-search-input");
            if (newSearchInput) {
                newSearchInput.focus();
                const len = newSearchInput.value.length;
                newSearchInput.setSelectionRange(len, len);
            }
        }
      }, 300); // Debounce search
    }
  });
}

async function init() {
  renderApp(); // Initial render with loading state
  try {
    const loadedEvents = loadEventsFromEmbeddedData();
    if (!loadedEvents || loadedEvents.length === 0) {
      throw new Error("캘린더 데이터를 불러오는 데 실패했습니다. 데이터 파일이 올바른지 확인해주세요.");
    }

    state.events = loadedEvents.sort((a,b) => a.date - b.date);

    state.lastUpdateDate = state.events.reduce((latest, event) => {
        return !latest || event.lastUpdated > latest ? event.lastUpdated : latest;
      }, null) || new Date();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find first event for today or future
    let upcomingEvent = state.events.find(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0,0,0,0);
        return eventDate >= today;
    });
    
    // If no future events, find the most recent past event
    if (!upcomingEvent && state.events.length > 0) {
        upcomingEvent = state.events[state.events.length - 1];
    }

    state.selectedEvent = upcomingEvent || null;
    if (state.selectedEvent) {
        state.currentDate = new Date(state.selectedEvent.date);
    }

  } catch (error) {
    console.error(error);
    state.loadError = error.message;
  } finally {
    state.isLoading = false;
    renderApp();
    bindEvents();
  }
}

init();