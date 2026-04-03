// src/lib/vindicara.ts
// Vindicara AI runtime security — guard inputs/outputs against prompt injection

const VINDICARA_BASE_URL = "https://d1xzz26fz4.execute-api.us-east-1.amazonaws.com";

interface GuardResult {
  allowed: boolean;
  blocked: boolean;
  verdict: string;
  rules: any[];
}

const FAIL_OPEN: GuardResult = {
  allowed: true,
  blocked: false,
  verdict: "allowed",
  rules: [],
};

async function callGuard(
  input: string,
  output: string,
  policy: string
): Promise<GuardResult> {
  const apiKey = process.env.VINDICARA_API_KEY;
  if (!apiKey) {
    console.error("[vindicara] VINDICARA_API_KEY not set — failing open");
    return FAIL_OPEN;
  }

  try {
    const res = await fetch(`${VINDICARA_BASE_URL}/v1/guard`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Vindicara-Key": apiKey,
      },
      body: JSON.stringify({ input, output, policy }),
    });

    if (!res.ok) {
      console.error(`[vindicara] API returned ${res.status} — failing open`);
      return FAIL_OPEN;
    }

    const data = await res.json();
    return {
      allowed: data.verdict === "allowed",
      blocked: data.verdict === "blocked",
      verdict: data.verdict,
      rules: data.rules || [],
    };
  } catch (err) {
    console.error("[vindicara] Guard call failed — failing open", err);
    return FAIL_OPEN;
  }
}

export async function guardInput(
  text: string,
  policy = "prompt-injection"
): Promise<GuardResult> {
  return callGuard(text, "", policy);
}

export async function guardOutput(
  text: string,
  policy = "prompt-injection"
): Promise<GuardResult> {
  return callGuard("", text, policy);
}
