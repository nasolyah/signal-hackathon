// Pre-draft RCA for every pattern (demo opens instantly).  npm run rca:warm
import { warmPatternRcas } from "@/lib/rca-warm";
warmPatternRcas(console.log)
  .then(() => console.log("✓ done"))
  .catch((e) => {
    console.error("✗", (e as Error).message);
    process.exit(1);
  });
