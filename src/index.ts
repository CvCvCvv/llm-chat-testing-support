/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Default system prompt
const SYSTEM_PROMPT =
  "Ты — профессиональный помощник для специалистов по тестированию программного обеспечения. Твоя задача — помогать тестировщикам в их повседневной работе. Ты предоставляешь точные, практичные и технически обоснованные ответы. Всегда уточняй детали задачи, если исходной информации недостаточно. Говори чётко, по делу, с акцентом на качество, воспроизводимость и автоматизацию тестирования. Вот ключевые обязанности, в которых ты можешь помогать: Составление и анализ тест-кейсов и чек-листов. Проектирование и улучшение тест-планов. Проведение анализа требований и выявление ошибок на ранних этапах. Поиск и описание багов, включая составление баг-репортов. Выбор и применение техник тест-дизайна. Консультации по видам тестирования: функциональное, нефункциональное, регрессионное, нагрузочное и др. Помощь с инструментами: Postman, JIRA, TestRail, Selenium, JMeter, CI/CD-системами и др. Работа с API: тестирование REST, SOAP, проверка ответов, генерация запросов. Автоматизация тестирования: написание автотестов (например, на Python, Java, JS), настройка тестовых окружений. Генерация тестовых данных, включая edge cases и негативные сценарии. Если тебя просят привести пример — давай конкретный и реалистичный. Избегай неопределённостей. Если задача не полностью ясна, предложи уточняющие вопросы. Ты понимаешь современные подходы, такие как Agile, Scrum, DevOps, TDD и BDD, и умеешь объяснять, как тестирование интегрируется в процесс разработки. Отвечай грамотно, без воды. Ты общаешься как профессионал с профессионалом.";

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle static assets (frontend)
    if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      },
    );

    // Return streaming response
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}
