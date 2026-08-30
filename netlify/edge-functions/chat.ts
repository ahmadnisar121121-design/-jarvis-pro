const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_HISTORY = 8;

const systemPrompts = {
  en: "You are Jarvis, Ahmad's precise and thoughtful personal AI assistant. Be concise, practical, calm, and candid. Use clear formatting when helpful. Never claim to have completed actions you cannot perform.",
  ur: "آپ جاروس ہیں، احمد کے درست اور سمجھدار ذاتی AI معاون۔ مختصر، عملی، پُرسکون اور واضح اردو میں جواب دیں۔ جہاں مفید ہو سادہ فارمیٹنگ استعمال کریں۔",
};

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = Netlify.env.get("OPENROUTER_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "Chat service is not configured" }, 503);
  }

  try {
    const payload = await request.json();
    const language = payload?.language === "ur" ? "ur" : "en";
    const messages = Array.isArray(payload?.messages)
      ? payload.messages
          .filter((message: { role?: string; content?: string }) =>
            ["user", "assistant"].includes(message?.role || "") && typeof message?.content === "string",
          )
          .slice(-MAX_HISTORY)
          .map((message: { role: string; content: string }) => ({
            role: message.role,
            content: message.content.slice(0, 12000),
          }))
      : [];

    if (!messages.length || messages.at(-1)?.role !== "user") {
      return jsonResponse({ error: "A user message is required" }, 400);
    }

    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Netlify.env.get("SITE_URL") || new URL(request.url).origin,
        "X-Title": "Jarvis Pro Ahmad",
      },
      body: JSON.stringify({
        model: Netlify.env.get("OPENROUTER_MODEL") || "z-ai/glm-5.2:free",
        messages: [{ role: "system", content: systemPrompts[language] }, ...messages],
        max_tokens: language === "ur" ? 480 : 400,
        temperature: 0.65,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return jsonResponse({ error: "The AI provider rejected the request" }, upstream.status || 502);
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const stream = upstream.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const data = line.startsWith("data:") ? line.slice(5).trim() : "";
          if (!data || data === "[DONE]") continue;
          try {
            const event = JSON.parse(data);
            const content = event.choices?.[0]?.delta?.content;
            if (typeof content === "string") controller.enqueue(encoder.encode(content));
          } catch {}
        }
      },
    }));

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return jsonResponse({ error: "Invalid chat request" }, 400);
  }
}

export const config = { path: "/api/chat" };
