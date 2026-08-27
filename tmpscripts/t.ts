import { signatureTours } from "../src/data/signatureTours";
for (const t of signatureTours as any[]) console.log(t.id, "|", t.title);
