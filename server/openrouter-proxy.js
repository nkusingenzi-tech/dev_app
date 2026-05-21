const http = require('http');

const PORT = Number(process.env.PORT || 8787);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Freeman <verify@freemanapp.online>';
const AUTH_CONTINUE_URL = process.env.AUTH_CONTINUE_URL || 'https://www.freemanapp.online/';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = [
  'deepseek/deepseek-v4-flash:free',
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'minimax/minimax-m2.5:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'openrouter/free',
];
const MODEL_TIMEOUT_MS = Number(process.env.MODEL_TIMEOUT_MS || 9000);
const AI_OVERALL_TIMEOUT_MS = Number(process.env.AI_OVERALL_TIMEOUT_MS || 28000);
const MAX_REQUESTS_PER_MIN = Number(process.env.MAX_REQUESTS_PER_MIN || 20);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 2000;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const DISABLED_MODELS = new Set([
  'inclusionai/ring-2.6-1t:free',
]);

function resolveModels() {
  const configuredModels = (process.env.OPENROUTER_MODELS || DEFAULT_MODELS.join(','))
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)
    .filter((model) => !DISABLED_MODELS.has(model));

  return configuredModels.length ? configuredModels : DEFAULT_MODELS;
}

const models = resolveModels();

const recoveryScope =
  'Freeman AI only helps users beat porn/sexual-content addiction, manage urges, recover after relapse, build healthy routines, improve accountability, and protect their streak. In this recovery context, "gooning" means masturbating with heavy porn consumption. Refuse unrelated topics briefly and redirect to recovery support.';

const requestLog = new Map();
let firebaseAdmin;

function sendJson(res, status, body, requestId) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Cache-Control': 'no-store',
    ...(requestId ? { 'X-Request-Id': requestId } : {}),
  });
  res.end(JSON.stringify({ ...body, requestId }));
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

function getFirebaseAdmin() {
  if (firebaseAdmin !== undefined) return firebaseAdmin;

  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (serviceAccountJson) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        });
      } else if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        firebaseAdmin = null;
        return firebaseAdmin;
      }
    }
    firebaseAdmin = admin;
    return firebaseAdmin;
  } catch (error) {
    console.warn('Firebase Admin unavailable:', error.message);
    firebaseAdmin = null;
    return firebaseAdmin;
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extensionSetupPage(code) {
  const safeCode = escapeHtml(code || '');
  const chromeUrl = process.env.CHROME_EXTENSION_URL || '';
  const edgeUrl = process.env.EDGE_EXTENSION_URL || '';
  const firefoxUrl = process.env.FIREFOX_EXTENSION_URL || '';

  function storeLink(label, url) {
    if (!url) {
      return `<div class="store disabled"><strong>${label}</strong><span>Store link coming soon</span></div>`;
    }
    return `<a class="store" href="${escapeHtml(url)}" target="_blank" rel="noreferrer"><strong>${label}</strong><span>Install extension</span></a>`;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Freeman Browser Setup</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: #07090f;
        color: #f8fafc;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 28px 16px;
      }
      main {
        width: min(520px, 100%);
        border: 1px solid #1c2536;
        border-radius: 28px;
        background: linear-gradient(155deg, #0f1523, #090d16);
        padding: 28px;
        box-shadow: 0 24px 80px rgba(0,0,0,.45);
      }
      .eyebrow {
        color: #3d8f6b;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 1.6px;
        text-transform: uppercase;
      }
      h1 {
        margin: 10px 0 10px;
        font-size: 34px;
        line-height: 1.05;
      }
      p {
        margin: 0;
        color: #94a3b8;
        font-size: 15px;
        line-height: 1.6;
      }
      .code {
        margin: 22px 0;
        border: 1px solid #274132;
        background: #0a1410;
        border-radius: 18px;
        padding: 16px;
      }
      .code span {
        display: block;
        color: #94a3b8;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      .code strong {
        display: block;
        color: #5bb98b;
        font-size: 30px;
        letter-spacing: 2px;
      }
      .stores {
        display: grid;
        gap: 10px;
        margin: 20px 0;
      }
      .store {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        text-decoration: none;
        color: #f8fafc;
        border: 1px solid #1f2937;
        border-radius: 16px;
        padding: 14px 16px;
        background: #101827;
      }
      .store span { color: #5bb98b; font-weight: 800; }
      .store.disabled { opacity: .62; }
      .steps {
        margin-top: 18px;
        padding-left: 20px;
        color: #cbd5e1;
        line-height: 1.7;
      }
      .note {
        margin-top: 18px;
        color: #64748b;
        font-size: 13px;
      }
      button {
        width: 100%;
        border: 0;
        border-radius: 16px;
        padding: 14px 16px;
        background: #3d8f6b;
        color: #07100c;
        font-size: 15px;
        font-weight: 900;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">Freeman browser protection</div>
      <h1>Connect your computer blocker</h1>
      <p>Install Freeman on this browser, open the extension settings, then paste your access code.</p>
      <div class="code">
        <span>Your access code</span>
        <strong id="accessCode">${safeCode || 'Open from the app'}</strong>
      </div>
      <button type="button" onclick="navigator.clipboard?.writeText(document.getElementById('accessCode').textContent)">Copy access code</button>
      <div class="stores">
        ${storeLink('Chrome / Brave', chromeUrl)}
        ${storeLink('Microsoft Edge', edgeUrl)}
        ${storeLink('Firefox', firefoxUrl)}
      </div>
      <ol class="steps">
        <li>Install the Freeman extension for your browser.</li>
        <li>Open the extension popup, then open Settings.</li>
        <li>Paste the access code and press Link app.</li>
        <li>Turn on protection and allow Incognito/private browsing if needed.</li>
      </ol>
      <p class="note">If the store links are not active yet, the extension still needs to be published to the browser stores.</p>
    </main>
  </body>
</html>`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
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
  const recent = (requestLog.get(ip) || []).filter((time) => now - time < windowMs);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > MAX_REQUESTS_PER_MIN;
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function makeRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];

  return rawMessages
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message?.role === 'assistant' ? 'assistant' : 'user',
      content: String(message?.content || '').slice(0, MAX_MESSAGE_CHARS),
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
    'goon',
    'gooning',
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

function providerFallbackReply(text) {
  const normalized = text.toLowerCase();

  if (normalized.includes('relapse') || normalized.includes('relapsed')) {
    return 'The AI provider is slow right now, but your next step is simple: log the relapse honestly, leave the trigger environment, drink water, and write one sentence about what started it. Do not turn this into a binge.';
  }

  if (normalized.includes('urge') || normalized.includes('goon') || normalized.includes('porn') || normalized.includes('trigger')) {
    return 'The AI provider is slow right now, so use the emergency plan: put the phone away, stand up, leave the room, breathe slowly for one minute, and wait ten minutes before making any decision.';
  }

  return 'The AI provider is slow right now. Keep this recovery-focused: name the feeling, remove the easiest trigger, and take one small action that protects your streak for the next ten minutes.';
}

function verificationEmailHtml(link) {
  const safeLink = escapeHtml(link);

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#07090f;color:#f8fafc;font-family:Inter,Arial,sans-serif;padding:28px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#0e1220;border:1px solid #1c2536;border-radius:24px;padding:0;">
      <tr>
        <td style="padding:28px;">
          <p style="margin:0 0 8px;color:#3d8f6b;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">Freeman</p>
          <h1 style="margin:0 0 12px;color:#ffffff;font-size:30px;line-height:1.12;">Confirm your email</h1>
          <p style="margin:0 0 22px;color:#94a3b8;font-size:15px;line-height:1.6;">Confirm this email address to finish setting up your Freeman account.</p>
          <a href="${safeLink}" style="display:inline-block;background:#3d8f6b;color:#07100d;text-decoration:none;font-weight:900;font-size:15px;padding:14px 22px;border-radius:14px;">Verify email</a>
          <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.55;">If the button does not work, copy and paste this link into your browser:</p>
          <p style="word-break:break-all;margin:8px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">${safeLink}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function verificationEmailText(link) {
  return `Confirm your Freeman email address:\n\n${link}\n\nAfter confirming, return to the Freeman app and log in.`;
}

async function sendResendEmail({ to, subject, html, text }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to,
      subject,
      html,
      text,
    }),
  });

  const body = await response.text();
  let data;
  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    data = { raw: body };
  }

  if (!response.ok) {
    const error = new Error(data?.message || data?.error || `Resend failed with ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

async function handleSendVerificationEmail(req, res) {
  const requestId = makeRequestId();
  const admin = getFirebaseAdmin();

  if (!admin) {
    sendJson(res, 503, { error: 'Firebase Admin is not configured on the backend', code: 'FIREBASE_ADMIN_NOT_CONFIGURED' }, requestId);
    return;
  }

  if (!RESEND_API_KEY) {
    sendJson(res, 503, { error: 'RESEND_API_KEY is not configured on the backend', code: 'RESEND_NOT_CONFIGURED' }, requestId);
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(`verify:${ip}`)) {
    sendJson(res, 429, { error: 'Too many verification email requests. Wait a minute and try again.', code: 'RATE_LIMITED' }, requestId);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body', code: 'BAD_JSON' }, requestId);
    return;
  }

  const idToken = String(payload.idToken || '').trim();
  if (!idToken) {
    sendJson(res, 400, { error: 'Missing Firebase ID token', code: 'MISSING_ID_TOKEN' }, requestId);
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) {
      sendJson(res, 400, { error: 'Firebase account has no email address', code: 'EMAIL_MISSING' }, requestId);
      return;
    }

    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: AUTH_CONTINUE_URL,
      handleCodeInApp: false,
    });

    await sendResendEmail({
      to: email,
      subject: 'Verify your Freeman account',
      html: verificationEmailHtml(link),
      text: verificationEmailText(link),
    });

    sendJson(res, 200, { ok: true, email }, requestId);
  } catch (error) {
    console.warn(`[${requestId}] verification email failed: ${error.message}`);
    sendJson(res, error.status || 500, { error: error.message || 'Could not send verification email', code: 'VERIFICATION_EMAIL_FAILED' }, requestId);
  }
}

async function handleSignup(req, res) {
  const requestId = makeRequestId();
  const admin = getFirebaseAdmin();

  if (!admin) {
    sendJson(res, 503, { error: 'Firebase Admin is not configured on the backend', code: 'FIREBASE_ADMIN_NOT_CONFIGURED' }, requestId);
    return;
  }

  if (!RESEND_API_KEY) {
    sendJson(res, 503, { error: 'RESEND_API_KEY is not configured on the backend', code: 'RESEND_NOT_CONFIGURED' }, requestId);
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(`signup:${ip}`)) {
    sendJson(res, 429, { error: 'Too many signup attempts. Wait a minute and try again.', code: 'RATE_LIMITED' }, requestId);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body', code: 'BAD_JSON' }, requestId);
    return;
  }

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const username = String(payload.username || '').trim().slice(0, 50);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6 || !username) {
    sendJson(res, 400, { error: 'Enter username, valid email, and a 6+ character password.', code: 'BAD_SIGNUP_INPUT' }, requestId);
    return;
  }

  try {
    let userRecord;
    let created = false;

    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: username,
        emailVerified: false,
      });
      created = true;
    } catch (error) {
      if (error?.code !== 'auth/email-already-exists') {
        throw error;
      }

      userRecord = await admin.auth().getUserByEmail(email);
      if (userRecord.emailVerified) {
        sendJson(res, 409, { error: 'Account already exists. Log in instead.', code: 'ACCOUNT_EXISTS' }, requestId);
        return;
      }
    }

    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: AUTH_CONTINUE_URL,
      handleCodeInApp: false,
    });

    await sendResendEmail({
      to: email,
      subject: 'Verify your Freeman account',
      html: verificationEmailHtml(link),
      text: verificationEmailText(link),
    });

    sendJson(res, 200, {
      ok: true,
      created,
      uid: userRecord.uid,
      email,
    }, requestId);
  } catch (error) {
    console.warn(`[${requestId}] signup failed: ${error.message}`);
    sendJson(res, error.status || 500, { error: error.message || 'Could not create account', code: error.code || 'SIGNUP_FAILED' }, requestId);
  }
}

function isRetryableError(error) {
  const message = String(error.message || '').toLowerCase();
  const modelUnavailable =
    message.includes('no longer available') ||
    message.includes('not a valid model') ||
    message.includes('model unavailable') ||
    message.includes('has transitioned to a paid model');

  if (modelUnavailable) return true;
  if (!error.status) return true;
  return RETRYABLE_STATUSES.has(error.status);
}

async function callOpenRouter({ model, messages, username }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
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
        temperature: 0.45,
        max_tokens: 320,
        messages: [
          {
            role: 'system',
            content:
              `You are Freeman AI, a calm recovery assistant for ${username}. ${recoveryScope} Keep replies short, practical, and direct. Give concrete next actions. Do not answer general knowledge, coding, school, entertainment, politics, finance, or unrelated requests. For unrelated requests, say you can only help with recovery and ask what recovery challenge they are facing. Do not be judgmental. If the user seems in immediate danger, tell them to contact local emergency support.`,
          },
          ...messages,
        ],
      }),
    });
  } catch (error) {
    const nextError = new Error(error?.name === 'AbortError' ? 'OpenRouter request timed out' : error.message || 'OpenRouter network error');
    nextError.status = undefined;
    nextError.model = model;
    throw nextError;
  } finally {
    clearTimeout(timeout);
  }

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
  const requestId = makeRequestId();
  if (!OPENROUTER_API_KEY) {
    sendJson(res, 503, { error: 'OPENROUTER_API_KEY is not set on the backend', code: 'AI_NOT_CONFIGURED' }, requestId);
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    sendJson(res, 429, { error: 'Proxy rate limit reached. Wait a minute and try again.', code: 'RATE_LIMITED' }, requestId);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body', code: 'BAD_JSON' }, requestId);
    return;
  }

  const username = String(payload.username || 'friend').slice(0, 50);
  const messages = sanitizeMessages(payload.messages);

  if (!messages.length) {
    sendJson(res, 400, { error: 'No chat messages provided', code: 'NO_MESSAGES' }, requestId);
    return;
  }

  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (lastUserMessage && isClearlyOffTopic(lastUserMessage.content)) {
    sendJson(res, 200, { reply: offTopicReply(), model: 'scope-guard' }, requestId);
    return;
  }

  const errors = [];
  const deadline = Date.now() + AI_OVERALL_TIMEOUT_MS;
  for (const model of models) {
    if (Date.now() >= deadline) break;

    try {
      const reply = await callOpenRouter({ model, messages, username });
      sendJson(res, 200, { reply, model }, requestId);
      return;
    } catch (error) {
      errors.push(`${error.model || model}: ${error.message}`);
      console.warn(`[${requestId}] ${error.model || model} failed: ${error.message}`);
      if (!isRetryableError(error)) break;
    }
  }

  const fallbackText = providerFallbackReply(lastUserMessage?.content || '');
  sendJson(res, 200, {
    reply: fallbackText,
    model: 'provider-fallback',
    degraded: true,
    providerErrors: errors.slice(-3),
  }, requestId);
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    sendJson(res, 200, {
      ok: true,
      service: 'freeman-ai-backend',
      configured: Boolean(OPENROUTER_API_KEY),
      models,
      modelTimeoutMs: MODEL_TIMEOUT_MS,
      overallTimeoutMs: AI_OVERALL_TIMEOUT_MS,
    });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/extension')) {
    const url = new URL(req.url, 'https://freeman.local');
    sendHtml(res, 200, extensionSetupPage(url.searchParams.get('code') || ''));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    handleChat(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || 'Unexpected backend error', code: 'UNEXPECTED_ERROR' });
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/auth/send-verification') {
    handleSendVerificationEmail(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || 'Unexpected backend error', code: 'UNEXPECTED_ERROR' });
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/auth/signup') {
    handleSignup(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || 'Unexpected backend error', code: 'UNEXPECTED_ERROR' });
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found', code: 'NOT_FOUND' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Freeman AI proxy listening on http://127.0.0.1:${PORT}`);
});
