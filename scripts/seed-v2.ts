// v2 demo states: roles for seed reports, last week's digests per hospital (SPEC_V2_FLOW §6).
//   npm run seed:v2   (also runs inside npm run demo:reset)
import { seedV2 } from "@/lib/seed-v2";

seedV2(console.log).catch((e) => {
  console.error("✗", (e as Error).message);
  process.exit(1);
});
