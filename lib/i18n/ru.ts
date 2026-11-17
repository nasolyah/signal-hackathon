// All UI strings live here. To add Uzbek: copy this file to uz.ts with the same shape
// (type Dictionary enforces it) and switch the export in lib/i18n/index.ts.

import type {
  ActionStrength,
  CauseCategory,
  Factor,
  Harm,
  HospitalCode,
  IncidentType,
  Shift,
  Stage,
} from "@/lib/taxonomy";

export const ru = {
  app: {
    name: "Сигнал",
    tagline: "Анонимные сообщения об ошибках и почти-ошибках",
  },
  roles: {
    staff: "Сотрудник",
    hospital: "Больница",
    ministry: "Минздрав",
  },
  hospitals: {
    A: { name: "Больница А", region: "Ташкент" },
    B: { name: "Больница Б", region: "Самарканд" },
    C: { name: "Больница В", region: "Фергана" },
    D: { name: "Больница Г", region: "Андижан" },
    E: { name: "Больница Д", region: "Бухара" },
    F: { name: "Больница Е", region: "Наманган" },
  } satisfies Record<HospitalCode, { name: string; region: string }>,
  report: {
    title: "Сообщить об ошибке",
    department: "Отделение",
    departmentOptional: "необязательно",
    shift: "Смена",
    textLabel: "Что произошло",
    textPlaceholder:
      "Опишите, что произошло. Имена и номера палат система удалит автоматически.",
    trustLine: "Отчёт анонимный: мы не сохраняем ваше имя, IP-адрес и исходный текст",
    submit: "Отправить отчёт",
    submitting: "Обезличиваем и анализируем…",
    resultTitle: "Отчёт сохранён в обезличенном виде",
    redactedCount: "Удалено персональных данных",
    joinedPattern:
      "Похожие случаи уже есть в других больницах — это поможет найти системную причину",
    another: "Отправить ещё один отчёт",
    error: "Не удалось обработать отчёт. Ничего не сохранено — попробуйте ещё раз.",
  },
  fields: {
    type: "Тип",
    stage: "Этап",
    harm: "Вред",
    nearMiss: "Почти-ошибка",
    factors: "Факторы",
    yes: "Да",
    no: "Нет",
  },
  shift: {
    day: "День",
    night: "Ночь",
  } satisfies Record<Shift, string>,
  incidentType: {
    medication: "Лекарства",
    fall: "Падение",
    patient_identification: "Идентификация пациента",
    communication_handover: "Коммуникация и передача пациента",
    infection: "Инфекции",
    surgery: "Хирургия и процедуры",
    diagnosis: "Диагностика",
    equipment: "Оборудование",
    discharge: "Выписка",
    other: "Другое",
  } satisfies Record<IncidentType, string>,
  stage: {
    prescribing: "Назначение",
    dispensing: "Выдача",
    administration: "Введение",
    monitoring: "Наблюдение",
    diagnosis: "Диагностика",
    procedure: "Процедура",
    transfer: "Перевод/пересменка",
    discharge: "Выписка",
    other: "Другое",
  } satisfies Record<Stage, string>,
  harm: {
    none: "Без вреда",
    mild: "Лёгкий",
    moderate: "Умеренный",
    severe: "Тяжёлый",
    death: "Смерть",
  } satisfies Record<Harm, string>,
  factor: {
    fatigue: "Усталость",
    similar_packaging: "Похожие упаковки/названия",
    staffing_shortage: "Нехватка персонала",
    poor_lighting: "Плохое освещение",
    illegible_prescription: "Неразборчивое назначение",
    equipment_failure: "Сбой оборудования",
    handover_failure: "Нарушение пересменки",
    communication: "Коммуникация",
    missing_protocol: "Нет протокола/чек-листа",
    training_gap: "Недостаток подготовки",
    patient_factors: "Факторы пациента",
    environment: "Среда/помещение",
    other: "Другое",
  } satisfies Record<Factor, string>,
  strength: {
    strong: "Сильная",
    medium: "Средняя",
    weak: "Слабая",
  } satisfies Record<ActionStrength, string>,
  causeCategory: {
    people: "Люди",
    process: "Процессы",
    equipment: "Оборудование",
    environment: "Среда",
    materials: "Материалы",
    communication: "Коммуникация",
  } satisfies Record<CauseCategory, string>,
  status: {
    new: "Новый",
    in_review: "На разборе",
    closed: "Закрыт",
  },
  rca: {
    weakOnlyWarning:
      "Все меры слабые. Инструктаж и предупреждения редко предотвращают повтор — добавьте меру, которая меняет систему",
  },
};

export type Dictionary = typeof ru;
