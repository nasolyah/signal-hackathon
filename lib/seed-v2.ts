import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import type { DigestItem } from "@/lib/ai/digest";
import { tashkentDate } from "@/lib/time";
import { weekOf } from "@/lib/v2";
import type { ActionStrength, HospitalCode, InvolvedRole } from "@/lib/taxonomy";

// HACK: deterministic demo states for v2 (SPEC_V2_FLOW §6). Wipes ALL digests and rebuilds last week's,
// so the district screen looks alive and this week stays empty for the live demo.

const DAY = 86_400_000;
const at = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:00`).toISOString();
const plus = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

function roleFor(id: string): InvolvedRole {
  const n = createHash("sha256").update(id).digest()[0] % 100; // stable per incident
  return n < 50 ? "nurse" : n < 75 ? "doctor" : n < 90 ? "junior_staff" : "other";
}

type Act = { text: string; strength: ActionStrength; rationale: string };
type Seed = {
  h: HospitalCode;
  headline: string;
  items: { key: "insulin" | "falls" | "surname" | "handover"; title: string; what: string; why: string; actions: Act[] }[];
  stats: { reports: number; near_miss_share: number; severe: number };
  sentDay: number; // days after last week's Sunday (1 = Monday of this week)
  ackHours: number | null;
  decisions: { item: number; accept?: { action: number; dueInDays: number; done?: boolean }; reject?: string }[];
};

const INSULIN_ACTS: Act[] = [
  { text: "Хранить инсулины короткого и длительного действия на разных полках с цветной маркировкой", strength: "strong", rationale: "Физически убирает возможность взять не тот препарат" },
  { text: "Подписывать шприц-ручки крупно сразу после вскрытия", strength: "medium", rationale: "Снижает риск, но зависит от дисциплины смены" },
  { text: "Провести инструктаж персонала", strength: "weak", rationale: "Не меняет систему: при усталости ошибка повторится" },
];
const INSULIN = (what: string) => ({
  key: "insulin" as const,
  title: "Путаница инсулинов на ночной смене",
  what,
  why: "Похожие упаковки, хранение в одном лотке, приглушённый свет ночью",
  actions: INSULIN_ACTS,
});

const SEEDS: Seed[] = [
  {
    h: "A",
    headline: "Главное за неделю — путаница инсулинов ночью, ошибку ловили перед уколом",
    items: [
      INSULIN("Два случая, когда медсестра едва не ввела инсулин длительного действия вместо короткого"),
      {
        key: "handover",
        title: "Неразборчивые листы назначений",
        what: "Назначения пишут от руки: ночью дозу и название препарата трудно прочитать",
        why: "Нет печатного шаблона листа назначений",
        actions: [
          { text: "Перейти на печатный лист назначений из шаблона", strength: "strong", rationale: "Убирает почерк из цепочки" },
          { text: "Шаблон с обязательными полями: препарат, доза, время", strength: "medium", rationale: "Стандартизирует запись" },
          { text: "Напомнить врачам писать разборчиво", strength: "weak", rationale: "Полагается на внимание человека" },
        ],
      },
    ],
    stats: { reports: 4, near_miss_share: 0.75, severe: 0 },
    sentDay: 1,
    ackHours: 5,
    // item 1 is left undecided on purpose: /hospital/A always has a decision to make
    decisions: [{ item: 0, accept: { action: 0, dueInDays: 10 } }],
  },
  {
    h: "B",
    headline: "Повторяется путаница инсулинов; есть замечание по передаче смены",
    items: [
      INSULIN("Случай с перепутанными флаконами в холодильнике поста"),
      {
        key: "handover",
        title: "Неполная передача смены",
        what: "При пересменке не передали, что пациенту уже ввели препарат",
        why: "Нет единого шаблона передачи смены",
        actions: [{ text: "Ввести короткий шаблон передачи смены (SBAR)", strength: "medium", rationale: "Стандартизирует коммуникацию" }],
      },
    ],
    stats: { reports: 3, near_miss_share: 0.67, severe: 0 },
    sentDay: 1,
    ackHours: 20,
    decisions: [{ item: 0, accept: { action: 0, dueInDays: 14 } }, { item: 1, reject: "Шаблон передачи смены уже внедрён с октября" }],
  },
  {
    h: "C",
    headline: "Падения в коридоре корпуса 2 ночью — неисправное освещение",
    items: [
      {
        key: "falls",
        title: "Падения пациентов в тёмном коридоре",
        what: "Три падения ночью в одном коридоре, один пациент с ушибом",
        why: "Перегоревший свет и нет ночной подсветки",
        actions: [
          { text: "Заменить освещение и поставить ночную подсветку пола", strength: "strong", rationale: "Устраняет причину в среде" },
          { text: "Предупреждать пациентов не вставать без сопровождения", strength: "weak", rationale: "Полагается на память пациента" },
        ],
      },
    ],
    stats: { reports: 3, near_miss_share: 0.33, severe: 0 },
    sentDay: -2, // sent 3+ days ago and still unread → red on the district screen
    ackHours: null,
    decisions: [],
  },
  {
    h: "D",
    headline: "Путаница инсулинов повторяется — нужна мера хранения",
    items: [INSULIN("Случай, когда инсулин длительного действия набрали вместо короткого")],
    stats: { reports: 2, near_miss_share: 0.5, severe: 0 },
    sentDay: 1,
    ackHours: 8,
    decisions: [{ item: 0, accept: { action: 0, dueInDays: -2 } }], // overdue
  },
  {
    h: "E",
    headline: "Путаница инсулинов и похожие ампулы рядом",
    items: [INSULIN("Ампулы и шприц-ручки похожих препаратов хранятся вплотную")],
    stats: { reports: 3, near_miss_share: 0.67, severe: 0 },
    sentDay: 1,
    ackHours: 3,
    decisions: [{ item: 0, accept: { action: 0, dueInDays: 12 } }],
  },
  {
    h: "F",
    headline: "Однофамильцы в одной палате — риск перепутать пациентов",
    items: [
      {
        key: "surname",
        title: "Пациенты-однофамильцы",
        what: "Анализы и назначения едва не перепутали у двух пациентов с одной фамилией",
        why: "Сверка только по фамилии, браслеты не у всех",
        actions: [
          { text: "Разводить однофамильцев по разным палатам и ставить метку «однофамилец» в листе", strength: "strong", rationale: "Убирает условие ошибки" },
          { text: "Сверять минимум два идентификатора: ФИО и дату рождения", strength: "medium", rationale: "Стандартизированная проверка" },
        ],
      },
    ],
    stats: { reports: 2, near_miss_share: 1, severe: 0 },
    sentDay: 1,
    ackHours: 26,
    decisions: [{ item: 0, accept: { action: 0, dueInDays: 9 } }],
  },
];

export async function seedV2(log: (s: string) => void = () => {}) {
  const sb = db();
  const today = tashkentDate();
  const last = weekOf(plus(today, -7));

  // 1. Roles instead of names for the seed reports that have none yet.
  const { data: inc } = await sb.from("incidents").select("id, hospital_id, pattern_id, involved_role");
  const byRole = new Map<InvolvedRole, string[]>();
  for (const r of inc ?? []) if (r.involved_role === "unknown") byRole.set(roleFor(r.id), [...(byRole.get(roleFor(r.id)) ?? []), r.id]);
  for (const [role, ids] of byRole) await sb.from("incidents").update({ involved_role: role }).in("id", ids).throwOnError();

  // 2. Wipe all digests (actions cascade, incidents.digest_id is set null).
  await sb.from("digests").delete().not("id", "is", null).throwOnError();

  // 3. Pattern ids by meaning, for the item links.
  const { data: pats } = await sb.from("patterns").select("id, title");
  const pid = (re: RegExp) => (pats ?? []).find((p) => re.test(p.title))?.id ?? null;
  const patternOf = { insulin: pid(/инсулин/i), falls: pid(/паден/i), surname: pid(/однофамил/i), handover: null } as const;

  for (const s of SEEDS) {
    const items: DigestItem[] = s.items.map((it) => {
      const pattern_id = patternOf[it.key];
      return {
        id: crypto.randomUUID(),
        title: it.title,
        what: it.what,
        why: it.why,
        incident_ids: (inc ?? []).filter((r) => r.hospital_id === s.h && pattern_id && r.pattern_id === pattern_id).map((r) => r.id).slice(0, 5),
        pattern_id,
        actions: it.actions,
      };
    });
    const sentAt = at(plus(last.end, s.sentDay), "09:10");
    const ackAt = s.ackHours === null ? null : new Date(Date.parse(sentAt) + s.ackHours * 3_600_000).toISOString();
    const { data: d } = await sb
      .from("digests")
      .insert({
        hospital_id: s.h,
        period_start: last.start,
        period_end: last.end,
        headline: s.headline,
        items,
        stats: s.stats,
        status: ackAt ? "acknowledged" : "sent",
        sent_at: sentAt,
        acknowledged_at: ackAt,
      })
      .select("id")
      .single()
      .throwOnError();
    for (const dec of s.decisions) {
      const item = items[dec.item];
      if (dec.reject) {
        await sb.from("digest_actions").insert({ digest_id: d!.id, item_id: item.id, decision: "rejected", reject_reason: dec.reject }).throwOnError();
      } else if (dec.accept) {
        const a = item.actions[dec.accept.action];
        await sb
          .from("digest_actions")
          .insert({
            digest_id: d!.id,
            item_id: item.id,
            decision: "accepted",
            action_text: a.text,
            strength: a.strength,
            due_date: plus(today, dec.accept.dueInDays),
            status: dec.accept.done ? "done" : "planned",
            done_at: dec.accept.done ? at(plus(today, -1), "16:00") : null,
          })
          .throwOnError();
      }
    }
  }
  log(`✓ v2: roles set, ${SEEDS.length} digests for ${last.start}…${last.end}; this week left empty for the live demo`);
}
