import { OpenRouter } from "@openrouter/sdk";
import landing from "./landing.html";

const apiKey = Bun.env.OPENROUTER_API_KEY;
const openrouter = apiKey ? new OpenRouter({ apiKey }) : null;

const jsonHeaders = { "Content-Type": "application/json" };
const encoder = new TextEncoder();

Bun.serve({
  port: 3000,
  routes: {
    "/": landing,
    "/health": new Response(JSON.stringify({ status: "ok" }), {
      headers: jsonHeaders,
    }),
    "/chat": {
      POST: async (req) => {
        try {
          if (!openrouter) {
            return new Response(
              JSON.stringify({ error: "Missing OPENROUTER_API_KEY environment variable" }),
              { status: 500, headers: jsonHeaders }
            );
          }

          const body = (await req.json()) as {
            message?: string;
            model?: string;
            stream?: boolean;
          };

          if (!body?.message || typeof body.message !== "string") {
            return new Response(
              JSON.stringify({ error: "Field 'message' is required" }),
              { status: 400, headers: jsonHeaders }
            );
          }

          const stream = await openrouter.chat.send({
            chatGenerationParams: {
              model: body.model ?? "openrouter/free",
              messages: [{ role: "user", content: body.message }],
              stream: true,
              streamOptions: {
                includeUsage: true,
              },
            },
          });

          if (body.stream) {
            const streamResponse = new ReadableStream<Uint8Array>({
              async start(controller) {
                let reasoningTokens: number | null = null;

                try {
                  for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(
                        encoder.encode(
                          `${JSON.stringify({ type: "delta", content })}\n`
                        )
                      );
                    }

                    if (
                      chunk.usage?.completionTokensDetails?.reasoningTokens !==
                      undefined
                    ) {
                      reasoningTokens =
                        chunk.usage.completionTokensDetails.reasoningTokens;
                    }
                  }

                  controller.enqueue(
                    encoder.encode(
                      `${JSON.stringify({
                        type: "done",
                        model: body.model ?? "openrouter/free",
                        reasoningTokens,
                      })}\n`
                    )
                  );
                  controller.close();
                } catch (error) {
                  controller.enqueue(
                    encoder.encode(
                      `${JSON.stringify({
                        type: "error",
                        error: "Unable to process chat request",
                      })}\n`
                    )
                  );
                  controller.close();
                  console.error("/chat stream error", error);
                }
              },
            });

            return new Response(streamResponse, {
              headers: {
                "Content-Type": "application/x-ndjson; charset=utf-8",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
              },
            });
          }

          let reply = "";
          let reasoningTokens: number | null = null;

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              reply += content;
            }

            if (
              chunk.usage?.completionTokensDetails?.reasoningTokens !== undefined
            ) {
              reasoningTokens = chunk.usage.completionTokensDetails.reasoningTokens;
            }
          }

          return new Response(
            JSON.stringify({
              model: body.model ?? "openrouter/free",
              reply,
              reasoningTokens,
            }),
            { headers: jsonHeaders }
          );
        } catch (error) {
          console.error("/chat error", error);
          return new Response(
            JSON.stringify({ error: "Unable to process chat request" }),
            { status: 500, headers: jsonHeaders }
          );
        }
      },
    },
  },
  fetch() {
    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server running on http://localhost:3000");