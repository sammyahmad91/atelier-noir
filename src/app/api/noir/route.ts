import { z } from "zod";
import { getSessionAtelier } from "@/lib/dal";
import { getNoirModel } from "@/lib/noir";
import { encodeCards } from "@/lib/noir/protocol";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    .max(60),
});

export async function POST(req: Request) {
  const atelier = await getSessionAtelier();
  if (!atelier) return Response.json({ error: "Sign in to speak with NOIR." }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const messages = parsed.success ? parsed.data.messages : null;
  if (!messages || messages[messages.length - 1].role !== "user" || !messages[messages.length - 1].content.trim()) {
    return Response.json({ error: "Expected { messages } ending with a user message." }, { status: 400 });
  }

  const model = getNoirModel();
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort(), { once: true });
  const events = model
    .respond(messages, { userName: atelier.user.name, fragrances: atelier.fragrances, wears: atelier.wears, now: new Date() }, abort.signal)
    [Symbol.asyncIterator]();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) return controller.close();
        controller.enqueue(encoder.encode(value.type === "text" ? value.value : encodeCards(value.cards)));
      } catch (err) {
        console.error("NOIR stream failed", err);
        controller.enqueue(encoder.encode("\n\nForgive me — my thoughts scattered. Ask me once more?"));
        controller.close();
      }
    },
    async cancel() {
      abort.abort();
      await events.return?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Noir-Model": model.name,
    },
  });
}
