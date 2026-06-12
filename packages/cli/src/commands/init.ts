import { mkdir, writeFile } from "node:fs/promises";

export async function initCommand() {
  await mkdir(".oaa", { recursive: true });
  await writeFile("agent-access.json", JSON.stringify(samplePolicy(), null, 2), { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  console.log("created .oaa/ and agent-access.json if they did not already exist");
}

function samplePolicy() {
  return {
    version: "0.1",
    protocol: "open-agent-access",
    site: {
      name: "Local Site",
      origin: "http://localhost:4021",
      contact: "mailto:agents@example.invalid",
      terms: "http://localhost:4021/terms"
    },
    defaults: {
      decision: "review",
      respectRobotsTxt: true,
      requireAgentIdentity: true,
      requirePurpose: true,
      requireReceipt: true
    },
    rules: [
      {
        id: "free",
        match: { methods: ["GET"], paths: ["/free"] },
        decision: "allow",
        purposes: ["research"],
        uses: ["read", "summarize", "ai-input"],
        deniedUses: ["ai-train"]
      }
    ]
  };
}
