const s = {
  apiKey: "",
  modelName: "gemini-2.5-pro",
  maxResolution: 1080,
  language: "ja",
  // ストレージ設定のデフォルト値
  autoOptimize: !0,
  maxSnapshotCount: 100,
  warningThresholdMB: 50,
  optimizeQuality: 0.8,
  optimizeMaxWidth: 800,
  // ベータ機能フラグ
  ENABLE_OUTLINE_EDIT: !1,
  ENABLE_AD_PAUSE: !1
}, i = async () => {
  const e = await chrome.storage.sync.get(Object.keys(s));
  return {
    ...s,
    ...e
  };
}, c = async (e) => {
  var a;
  const t = await i();
  if (!t.apiKey)
    throw new Error("API key not set");
  const r = `あなたはソフトウェア解説者です。以下の YouTube 動画を分析し、
各重要ステップを <timestamp> <title> <description> <code> 形式で
出力してください。省略なしで詳細に記述してください。`, o = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${t.modelName}:generateContent?key=${t.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: r },
              { text: `動画URL: ${e.videoUrl}` },
              { text: `言語: ${e.language || t.language}` },
              ...e.frameSamples ? e.frameSamples.map((n) => ({ inlineData: { data: n, mimeType: "image/png" } })) : []
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40
        }
      })
    }
  );
  if (!o.ok) {
    const n = await o.json();
    throw new Error(`API error: ${((a = n.error) == null ? void 0 : a.message) || "Unknown error"}`);
  }
  return await o.json();
};
chrome.runtime.onMessage.addListener((e, t, r) => {
  if (e.type === "GENERATE_SUMMARY")
    return g(e.data).then((o) => {
      console.log("Background: Sending success response for GENERATE_SUMMARY", o), r({ success: !0, data: o });
    }).catch((o) => {
      console.error("Background: Sending error response for GENERATE_SUMMARY", o), r({ success: !1, error: o.message });
    }), !0;
  console.warn("Background script received unexpected message:", e, "from sender:", t);
});
async function g(e) {
  try {
    return await c(e);
  } catch (t) {
    throw console.error("Error generating summary:", t), t;
  }
}
chrome.tabs.onUpdated.addListener((e, t, r) => {
  t.status === "complete" && r.url && r.url.includes("youtube.com/watch") && (console.log("YouTube Watch page detected, sending initialization message to content script"), chrome.tabs.sendMessage(e, { action: "initializeOverlay" }).catch((o) => {
    console.log("Error sending message to content script:", o);
  }));
});
console.log("YT Outline & Snap background service worker started");
