function getTelegramApiBase(token) {
  const t = token || process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  return `https://api.telegram.org/bot${t}`;
}

async function tg(method, payload, { token } = {}) {
  const url = `${getTelegramApiBase(token)}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw new Error(`Telegram API ${method} failed (${res.status}): ${JSON.stringify(json)?.slice(0, 500)}`);
  }
  return json.result;
}

export async function telegramSendMessage({ chatId, text, replyMarkup, disableWebPagePreview = true, token } = {}) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: disableWebPagePreview,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  }, { token });
}

export async function telegramEditMessage({ chatId, messageId, text, replyMarkup, token } = {}) {
  return tg("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  }, { token });
}

export async function telegramAnswerCallbackQuery({ callbackQueryId, text, showAlert = false, token } = {}) {
  return tg("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
    show_alert: showAlert
  }, { token });
}
