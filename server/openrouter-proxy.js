const http = require('http');

const PORT = Number(process.env.PORT || 8787);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = [
  'inclusionai/ring-2.6-1t:free',
  'deepseek/deepseek-v4-flash:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];
const MODEL_TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS || 12000);

const models = (process.env.OPENROUTER_MODELS || DEFAULT_MODELS.join(','))
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);

const recoveryScope =
  'Freeman AI only helps users beat porn/sexual-content addiction, manage urges, recover after relapse, build healthy routines, improve accountability, and protect their streak. Refuse unrelated topics briefly and redirect to recovery support.';

const requestLog = new Map();

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new Error('Request body is too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 20;
  const recent = (requestLog.get(ip) || []).filter((time) => now - time < windowMs);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > maxRequests;
}

function sanitizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages
    .slice(-10)
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: String(message?.content || '').slice(0, 2000),
    }))
    .filter((message) => message.content.trim().length > 0);
}

function isClearlyOffTopic(text) {
  const normalized = text.toLowerCase();
  const recoveryTerms = [
    'urge',
    'relapse',
    'porn',
    'addiction',
    'trigger',
    'streak',
    'clean',
    'habit',
    'recovery',
    'masturb',
    'tempt',
    'craving',
    'accountability',
    'discipline',
    'block',
    'anxiety',
    'stress',
    'bored',
    'routine',
    'motivation',
    'withdrawal',
    'dopamine',
    'nofap',
    'sexual',
    'adult site',
  ];
  const unrelatedQuestionTerms = [
    'homework',
    'math',
    'code',
    'program',
    'recipe',
    'weather',
    'stock',
    'crypto',
    'movie',
    'game',
    'history',
    'politics',
    'translate',
    'write an essay',
    'solve',
    'capital of',
  ];

  const hasRecoveryTerm = recoveryTerms.some((term) => normalized.includes(term));
  const hasUnrelatedQuestion = unrelatedQuestionTerms.some((term) => normalized.includes(term));
  return hasUnrelatedQuestion && !hasRecoveryTerm;
}

function offTopicReply() {
  return 'I can only help with recovery from porn or sexual-content addiction. Tell me what you are feeling right now: an urge, a trigger, a relapse, boredom, stress, or a routine problem.';
}

async function callOpenRouter({ model, messages, username }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://freeman.local',
      'X-Title': 'Freeman',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            `You are Freeman AI, a calm recovery assistant for ${username}. ${recoveryScope} Keep replies short, practical, and direct. Do not answer general knowledge, coding, school, entertainment, politics, finance, or unrelated requests. For unrelated requests, say you can only help with recovery and ask what recovery challenge they are facing. Do not be judgmental. If the user seems in immediate danger, tell them to contact local emergency support.`,
        },
        ...messages,
      ],
    }),
  }).finally(() => clearTimeout(timeout));

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || `OpenRouter failed with ${response.status}`);
    error.status = response.status;
    error.model = model;
    throw error;
  }

  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    const error = new Error('OpenRouter returned an empty response');
    error.status = 502;
    error.model = model;
    throw error;
  }

  return reply;
}

async function handleChat(req, res) {
  if (!OPENROUTER_API_KEY) {
    sendJson(res, 500, { error: 'OPENROUTER_API_KEY is not set on the proxy server' });
    return;
  }

  const ip = req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: 'Proxy rate limit reached. Wait a minute and try again.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const username = String(payload.username || 'friend').slice(0, 50);
  const messages = sanitizeMessages(payload.messages);

  if (!messages.length) {
    sendJson(res, 400, { error: 'No chat messages provided' });
    return;
  }

  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (lastUserMessage && isClearlyOffTopic(lastUserMessage.content)) {
    sendJson(res, 200, { reply: offTopicReply(), model: 'scope-guard' });
    return;
  }

  const errors = [];
  for (const model of models) {
    try {
      const reply = await callOpenRouter({ model, messages, username });
      sendJson(res, 200, { reply, model });
      return;
    } catch (error) {
      errors.push(`${error.model || model}: ${error.message}`);
      if (![429, 502, 503, 504].includes(error.status)) break;
    }
  }

  sendJson(res, 502, { error: `All AI models failed. ${errors.join(' | ')}` });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, models });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    handleChat(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || 'Unexpected proxy error' });
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Freeman AI proxy listening on http://127.0.0.1:${PORT}`);
});
