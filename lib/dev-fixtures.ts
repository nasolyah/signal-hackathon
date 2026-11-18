// HACK: dev-only worst-case fixtures for break-ui (?data=worst | ?data=empty). Never used in production:
// every caller checks devData() first, which is null when NODE_ENV === "production".
// Values are plausible or at the schema limit: report text ≤ 4000 (app/report/actions.ts), a why ≤ 500,
// a user action ≤ 300, an owner ≤ 120 (app/rca/actions.ts). Pattern titles and AI text have no limit.

import type { KeptEntry } from "@/app/report/actions";
import type { DashboardData, LiveCounts, PatternCard } from "@/lib/dashboard";
import type { RcaRow } from "@/lib/rca-store";
import type { Department, Factor, Harm, HospitalCode, IncidentType, Shift, Stage } from "@/lib/taxonomy";

export type DevData = "worst" | "empty";

export function devData(v: string | string[] | undefined): DevData | null {
  if (process.env.NODE_ENV === "production") return null;
  return v === "worst" || v === "empty" ? v : null;
}

// ---------------------------------------------------------------- texts
const LONG_NARRATIVE =
  "Ночью в [ПАЛАТА] медсестра [СОТРУДНИК] готовила вечерние инъекции для четырёх пациентов с диабетом. В холодильнике поста инсулины короткого и длительного действия стоят в одном лотке, коробки одного производителя, отличаются только полоской цвета, которую при ночном освещении почти не видно. Шприц-ручки после вскрытия хранятся без колпачков с подписью, на двух ручках подписи стёрлись. " +
  "Пациенту [ПАЦИЕНТ] был назначен Актрапид 6 ЕД перед ужином, но в руке оказалась ручка Лантуса. Медсестра заметила это уже после того, как набрала дозу, когда сверяла лист назначений, — ввести не успела. Лист назначений написан от руки, дозировка и название препарата читаются с трудом, ночью на посту одна медсестра на 32 пациента. " +
  "Похожий случай был в прошлом месяце на соседнем посту, о нём говорили на пятиминутке, но хранение не поменяли. Предлагаю разнести инсулины по разным полкам и подписывать ручки крупно. Ссылка на протокол, который нам раздавали: https://protocols.example.uz/endocrinology/insulin-storage/2024/final-v3-approved.pdf\n\nПишу сюда, потому что в журнал на посту такое обычно не записывают.";

const UNBREAKABLE =
  "[СОТРУДНИК] перепутала флаконы: Хумулин-Регуляр/Хумулин-НПХ/Лантус/Актрапид стоят вплотную, этикетки одинаковые. Код партии на коробке: HUM-REG-2026-11-0004587193-TSH.";

const UZBEK_MIXED =
  "Kecha tunda hamshira [SOTRUDNIK]… нет, [СОТРУДНИК] insulinni adashtirib qoʻydi: Lantus oʻrniga Aktrapid olindi, qutilar bir xil va yonma-yon turadi. Bemorga [ПАЦИЕНТ] yuborilmadi, oʻz vaqtida payqaldi.";

const START_PLACEHOLDERS = "[ПАЦИЕНТ] [ПАЦИЕНТ] — два однофамильца в [ПАЛАТА], браслеты не надеты, [СОТРУДНИК] сверила только фамилию.";

// ---------------------------------------------------------------- dashboard
const LEAD: PatternCard = {
  id: "dev-worst-lead",
  title:
    "Путаница инсулинов короткого и длительного действия при хранении в одном лотке и наборе дозы из шприц-ручек без подписи в ночную смену",
  description: null,
  incidentCount: 1284,
  hospitalCount: 22,
  nightShare: 1,
  topFactors: ["similar_packaging", "illegible_prescription", "missing_protocol"],
  status: "open",
  hospitals: ["A", "B", "C", "D", "E", "F"],
};

const OTHERS: PatternCard[] = [
  { id: "dev-worst-2", title: "Падения", description: null, incidentCount: 21, hospitalCount: 1, nightShare: 0, topFactors: [], status: "open", hospitals: ["A"] },
  {
    id: "dev-worst-3",
    title: "Ошибки идентификации пациентов-однофамильцев при переводе между отделениями, выписке и заборе крови в процедурном кабинете",
    description: null,
    incidentCount: 102,
    hospitalCount: 3,
    nightShare: 0.333333,
    topFactors: ["handover_failure"],
    status: "in_review",
    hospitals: ["B", "E", "F"],
  },
  { id: "dev-worst-4", title: "Инфузомат Perfusor®Space/Infusomat®Space-P: сбой дозирования", description: null, incidentCount: 5, hospitalCount: 2, nightShare: 0.6, topFactors: [], status: "closed", hospitals: ["C", "D"] },
];

const TYPES: IncidentType[] = ["communication_handover", "medication", "fall", "patient_identification", "equipment", "infection", "discharge", "diagnosis", "surgery", "other"];

export const WORST_DASHBOARD: DashboardData = {
  kpi: { total: 12847, nearMissShare: 1 / 3, severeOrDeath: 0, openPatterns: 1 },
  patterns: [LEAD, ...OTHERS],
  byType: TYPES.map((k, i) => [k, i === 0 ? 4210 : i === TYPES.length - 1 ? 1 : Math.round(4210 / (i + 1.5))] as [IncidentType, number]),
  byHospital: (["A", "B", "C", "D", "E", "F"] as HospitalCode[]).map((h, i) => [h, i === 5 ? 1 : 3000 - i * 400] as [HospitalCode, number]),
  byShift: { day: 0, night: 12847 },
  feed: Array.from({ length: 60 }, (_, i) => ({
    id: `dev-worst-${i}`,
    date: "2026-11-18",
    hospital: (["A", "B", "C", "D", "E", "F"] as HospitalCode[])[i % 6],
    type: TYPES[i % TYPES.length],
    harm: (["death", "severe", "none", "moderate", "mild"] as Harm[])[i % 5],
    nearMiss: i % 3 === 0,
    status: i % 7 === 0 ? "archived" : (["new", "in_review", "closed"] as const)[i % 3],
    shift: (i % 2 ? "day" : "night") as Shift,
  })),
};

export const EMPTY_DASHBOARD: DashboardData = {
  kpi: { total: 0, nearMissShare: 0, severeOrDeath: 0, openPatterns: 0 },
  patterns: [],
  byType: [],
  byHospital: [],
  byShift: { day: 0, night: 0 },
  feed: [],
};

export function devLive(d: DashboardData): LiveCounts {
  return {
    total: d.kpi.total,
    patterns: Object.fromEntries(d.patterns.map((p) => [p.id, { count: p.incidentCount, hospitals: p.hospitalCount, night: p.nightShare }])),
  };
}

// ---------------------------------------------------------------- pattern / incident / RCA
export const WORST_PATTERN = {
  title: LEAD.title,
  description:
    "Случаи связаны с риском введения неверного типа инсулина из-за внешнего сходства упаковок и флаконов, хранения в одном лотке и шприц-ручек без подписи. Чаще ночью, когда на посту одна медсестра и освещение приглушено. В части случаев лист назначений написан от руки и плохо читается; протокол раздельного хранения есть не во всех больницах, а там, где есть, не отражён в чек-листе поста.",
  incident_count: 1284,
  hospital_count: 22,
  night_share: 1,
  top_factors: LEAD.topFactors,
  status: "in_review",
  cases: [
    { id: "dev-c1", incident_date: "2026-11-18", hospital_id: "A" as HospitalCode, shift: "night" as Shift, incident_type: "medication" as IncidentType, harm: "death" as Harm, near_miss: false, redacted_text: LONG_NARRATIVE },
    { id: "dev-c2", incident_date: "2026-11-17", hospital_id: "B" as HospitalCode, shift: "night" as Shift, incident_type: "medication" as IncidentType, harm: "none" as Harm, near_miss: true, redacted_text: UNBREAKABLE },
    { id: "dev-c3", incident_date: "2026-11-16", hospital_id: "C" as HospitalCode, shift: "day" as Shift, incident_type: "medication" as IncidentType, harm: "mild" as Harm, near_miss: false, redacted_text: UZBEK_MIXED },
    { id: "dev-c4", incident_date: "2026-11-15", hospital_id: "D" as HospitalCode, shift: "day" as Shift, incident_type: "patient_identification" as IncidentType, harm: "none" as Harm, near_miss: true, redacted_text: START_PLACEHOLDERS },
    { id: "dev-c5", incident_date: "2026-11-14", hospital_id: "E" as HospitalCode, shift: "night" as Shift, incident_type: "medication" as IncidentType, harm: "none" as Harm, near_miss: true, redacted_text: "Перепутали." },
  ],
};

const LONG_WHY =
  "Потому что в больнице нет единого стандарта раздельного хранения препаратов высокого риска: протокол 2024 года есть только в эндокринологии, на постах терапии и хирургии его не видели, а чек-лист вечерних инъекций не содержит шага сверки типа инсулина по цвету ручки и названию, поэтому каждая медсестра раскладывает препараты по-своему, как удобнее в её смену, и после пересменки следующая смена находит их в другом порядке, особенно когда пост принимает медсестра из другого отделения по графику подработки.";

export const WORST_RCA: RcaRow = {
  id: "dev-rca",
  whys: [
    "Пациентам вводили или едва не вводили не тот тип инсулина.",
    "Нет протокола.",
    LONG_WHY,
    "Освещение на посту ночью приглушено, цветовую полоску не видно.",
    "Закупка идёт у одного производителя с одинаковыми коробками.",
  ],
  causes: {
    people: ["Усталость в ночную смену", "Одна медсестра на 32 пациента", "Медсестра из другого отделения не знает раскладку поста"],
    process: [],
    equipment: ["Шприц-ручки Хумулин-Регуляр/Хумулин-НПХ без индивидуальных колпачков-подписей"],
    environment: [],
    materials: [],
    communication: [],
  } as RcaRow["causes"],
  actions: [
    { text: "Физически разделить хранение инсулинов короткого и длительного действия: разные полки, разные цветные контейнеры, подписи крупным шрифтом.", strength: "strong", rationale: "Убирает возможность взять не тот препарат." },
    { text: "Штрихкод-сверка", strength: "strong", rationale: "Система не даст провести введение без совпадения кода." },
    {
      text: "Ввести на всех постах больницы двойную независимую сверку типа и дозы инсулина второй медсестрой или дежурным врачом перед каждым введением в ночную смену, с отметкой в листе назначений и еженедельной проверкой листов старшей медсестрой отделения и заместителем по качеству.",
      strength: "medium",
      rationale: "Ловит ошибку до введения, но зависит от людей и нагрузки смены.",
      owner: "Заместитель главного врача по сестринскому делу и контролю качества медицинской помощи, ГКБ №1 Ташкент",
      due: "31.12.2026",
      userAdded: true,
    },
    { text: "Провести инструктаж персонала.", strength: "weak", rationale: "Не меняет систему: при усталости и плохом освещении ошибка повторится." },
    { text: "Напомнить о внимательности на пятиминутке.", strength: "weak", rationale: "Полагается на память и внимание человека." },
    { text: "Повесить плакат «Проверь инсулин!» над холодильником.", strength: "weak", rationale: "Плакаты быстро перестают замечать." },
  ],
};

export const WORST_RCA_WEAK_ONLY: RcaRow = { ...WORST_RCA, actions: WORST_RCA.actions.filter((a) => a.strength === "weak") };

export const WORST_INCIDENT = {
  id: "dev-incident",
  hospital_id: "F" as HospitalCode,
  department: "endocrinology" as Department,
  shift: "night" as Shift,
  incident_date: "2026-11-18",
  redacted_text: LONG_NARRATIVE,
  redaction_count: 23,
  incident_type: "communication_handover" as IncidentType,
  stage: "transfer" as Stage,
  harm: "death" as Harm,
  near_miss: false,
  factors: ["similar_packaging", "illegible_prescription", "missing_protocol"] as Factor[],
  status: "in_review",
  human_verified: false,
  pattern_title: LEAD.title,
};

// ---------------------------------------------------------------- report result
export const WORST_KEPT: KeptEntry = {
  date: "2026-11-18",
  shift: "night",
  redactedText: LONG_NARRATIVE,
  removed: 23,
  incidentType: "communication_handover",
  stage: "transfer",
  harm: "death",
  nearMiss: false,
  factors: ["similar_packaging", "illegible_prescription", "missing_protocol"],
  summary: "",
  joinedPattern: true,
};
