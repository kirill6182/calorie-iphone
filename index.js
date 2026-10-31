'use strict';

// Yandex Cloud Function: Node.js 18+.
// Environment variables: YC_API_KEY, YC_FOLDER_ID, optional YC_MODEL.
const ALLOWED_ORIGIN = 'https://kirill6182.github.io';
const MODEL = process.env.YC_MODEL || 'qwen3.6-35b-a3b';
const PROMPT = `Ты нутрициолог. По фото определи еду и оцени вес порции.
Верни ТОЛЬКО JSON без пояснений и без markdown:
{"items":[{"name":"Название по-русски","weight":150,"calories":248,"protein":46,"fat":5,"carbs":0}]}
weight — граммы, calories — ккал, protein/fat/carbs — граммы; всё для указанного веса порции.
Если на фото нет еды, верни {"items":[]}.`;

function reply(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    },
    body: JSON.stringify(body)
  };
}
function itemsFrom(content) {
  const text = typeof content === 'string' ? content :
    Array.isArray(content) ? content.map(x => x && x.text || '').join('') : '';
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('Модель вернула ответ не в формате JSON.');
  const parsed = JSON.parse(text.slice(a, b + 1));
  if (!Array.isArray(parsed.items)) throw new Error('В ответе модели отсутствует массив items.');
  return parsed.items.map(x => ({
    name: String(x.name || 'Блюдо'),
    weight: Math.max(0, Math.round(Number(x.weight) || 0)),
    calories: Math.max(0, Math.round(Number(x.calories) || 0)),
    protein: Math.max(0, Math.round(Number(x.protein) || 0)),
    fat: Math.max(0, Math.round(Number(x.fat) || 0)),
    carbs: Math.max(0, Math.round(Number(x.carbs) || 0))
  }));
}

exports.handler = async function (event) {
  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin || '';
  if (origin && origin !== ALLOWED_ORIGIN) return reply(403, {error:'Этот источник не разрешён.'});

  const method = event.httpMethod || event.method || 'POST';
  if (method === 'OPTIONS') return reply(204, {});
  if (method !== 'POST') return reply(405, {error:'Разрешён только POST-запрос.'});
  if (!process.env.YC_API_KEY || !process.env.YC_FOLDER_ID)
    return reply(500, {error:'На сервере не заданы YC_API_KEY или YC_FOLDER_ID.'});

  try {
    const raw = event.body || '';
    const body = event.isBase64Encoded
      ? JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
      : (typeof raw === 'string' ? JSON.parse(raw || '{}') : raw);
    const image = body && body.image;
    if (typeof image !== 'string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(image))
      return reply(400, {error:'Не получено изображение в поддерживаемом формате.'});
    if (image.length > 8 * 1024 * 1024)
      return reply(413, {error:'Фотография слишком большая. Попробуй другое фото.'});

    const upstream = await fetch('https://ai.api.cloud.yandex.net/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${process.env.YC_API_KEY}`,
        'OpenAI-Project': process.env.YC_FOLDER_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: `gpt://${process.env.YC_FOLDER_ID}/${MODEL}`,
        temperature: 0.1,
        max_tokens: 1000,
        messages: [{role:'user', content:[
          {type:'text', text:PROMPT + '\\nОпредели все видимые блюда. Оцени вес каждой порции. Верни только JSON.'},
          {type:'image_url', image_url:{url:image}}
        ]}]
      })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const msg = result.error && result.error.message || `Yandex AI Studio вернула статус ${upstream.status}.`;
      return reply(upstream.status === 429 ? 429 : 502, {error:msg.slice(0,300)});
    }
    const content = result.choices && result.choices[0] && result.choices[0].message
      ? result.choices[0].message.content : '';
    return reply(200, {items:itemsFrom(content)});
  } catch (e) {
    return reply(500, {error:e.message || 'Внутренняя ошибка функции.'});
  }
};
