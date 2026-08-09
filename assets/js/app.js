/* CyberSabil Download Frontend v1.1.0 Public
   Purpose: Validates URLs, sends download requests to the backend, handles async/sync responses, and renders safe UI states. */

(() => {
  "use strict";

  // Backend configuration.
  // Replace API_ENDPOINT after the Web Downloader backend is ready.
  // Example: https://cybersabil-download.xubi.org/api/download
  const API_ENDPOINT = "";
  const RECENT_KEY = "cybersabil-download-recent-v1";
  const MAX_RECENT = 5;

  const $ = (id) => document.getElementById(id);

  const els = {
    form: $("downloadForm"),
    videoUrl: $("videoUrl"),
    urlField: $("urlField"),
    pasteButton: $("pasteButton"),
    downloadButton: $("downloadButton"),
    buttonIdle: document.querySelector(".button-idle"),
    buttonWorking: document.querySelector(".button-working"),
    formMessage: $("formMessage"),
    progressPanel: $("progressPanel"),
    progressTitle: $("progressTitle"),
    progressNote: $("progressNote"),
    elapsed: $("elapsed"),
    resultCard: $("resultCard"),
    resultTitle: $("resultTitle"),
    metaQuality: $("metaQuality"),
    metaResolution: $("metaResolution"),
    metaFps: $("metaFps"),
    metaSize: $("metaSize"),
    metaVideo: $("metaVideo"),
    metaAudio: $("metaAudio"),
    downloadFileButton: $("downloadFileButton"),
    downloadAnother: $("downloadAnother"),
    recentSection: $("recentSection"),
    recentList: $("recentList"),
    clearRecent: $("clearRecent")
  };

  let timerId = null;
  let startedAt = 0;

  function isYouTubeUrl(value) {
    try {
      const url = new URL(value.trim());
      if (url.protocol !== "https:") return false;
      const host = url.hostname.toLowerCase();
      return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com");
    } catch {
      return false;
    }
  }

  function safeDownloadUrl(value) {
    try {
      const url = new URL(String(value || ""), window.location.href);
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function text(value, fallback = "—") {
    const out = String(value ?? "").trim();
    return out || fallback;
  }

  function setMessage(message = "", type = "error") {
    els.formMessage.textContent = message;
    els.formMessage.style.color = type === "info" ? "#aebed4" : type === "success" ? "#9fffdc" : "#ff8ba0";
  }

  function setWorking(working) {
    els.downloadButton.disabled = working;
    els.buttonIdle.hidden = working;
    els.buttonWorking.hidden = !working;
    if (working) {
      els.progressPanel.hidden = false;
      startTimer();
    } else {
      stopTimer();
    }
  }

  function startTimer() {
    stopTimer();
    startedAt = Date.now();
    els.elapsed.textContent = "00:00";
    timerId = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      els.elapsed.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }, 1000);
  }

  function stopTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  function updateProgress(title, note) {
    els.progressTitle.textContent = title;
    els.progressNote.textContent = note;
  }

  function resetResult() {
    els.resultCard.hidden = true;
    els.downloadFileButton.removeAttribute("href");
    els.downloadFileButton.removeAttribute("download");
  }

  function renderResult(data) {
    const downloadUrl = safeDownloadUrl(data.download_url || data.downloadUrl || data.url);
    if (!downloadUrl) throw new Error("Backend completed the job but did not return a safe download URL.");

    els.resultTitle.textContent = text(data.title, "Video ready");
    els.metaQuality.textContent = text(data.quality || data.QUALITY);
    els.metaResolution.textContent = text(data.resolution || data.RESOLUTION);
    els.metaFps.textContent = text(data.fps || data.FPS);
    const size = data.size_mb ?? data.SIZE_MB;
    els.metaSize.textContent = size !== undefined && size !== null && String(size).trim() !== "" ? `${size} MB` : "—";
    els.metaVideo.textContent = text(data.video_codec || data.VIDEO_CODEC);
    els.metaAudio.textContent = text(data.audio_codec || data.AUDIO_CODEC);
    els.downloadFileButton.href = downloadUrl;
    els.downloadFileButton.setAttribute("download", "");
    els.resultCard.hidden = false;
    els.progressPanel.hidden = true;
    setMessage("Video is ready to download.", "success");

    addRecent({
      title: text(data.title, "Video"),
      quality: text(data.quality || data.QUALITY, ""),
      size: size !== undefined && size !== null ? String(size) : "",
      url: downloadUrl,
      time: Date.now()
    });
  }

  async function parseResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response.json();
    const raw = await response.text();
    try { return JSON.parse(raw); } catch { return { message: raw }; }
  }

  async function pollStatus(statusUrl) {
    const safeStatusUrl = safeDownloadUrl(statusUrl);
    if (!safeStatusUrl) throw new Error("Backend returned an invalid status URL.");

    for (let attempt = 0; attempt < 360; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      updateProgress("Downloading maximum quality...", "The backend is processing the video. You can keep this page open.");

      const response = await fetch(safeStatusUrl, { method: "GET", headers: { "Accept": "application/json" }, cache: "no-store" });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(text(data.error || data.message, `Status request failed (${response.status}).`));

      const state = String(data.status || data.STATUS || "").toLowerCase();
      if (["success", "complete", "completed"].includes(state)) return data;
      if (["failed", "error"].includes(state)) throw new Error(text(data.error || data.message, "Download failed."));
    }

    throw new Error("Download is taking longer than expected. Please try again later.");
  }

  async function requestDownload(videoUrl) {
    const headers = { "Content-Type": "application/json", "Accept": "application/json" };

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: videoUrl }),
      cache: "no-store"
    });

    const data = await parseResponse(response);
    if (!response.ok) {
      throw new Error(text(data.error || data.message, `Backend request failed (${response.status}).`));
    }

    const state = String(data.status || data.STATUS || "").toLowerCase();
    if (["failed", "error"].includes(state)) throw new Error(text(data.error || data.message, "Download failed."));
    if (data.job_id || data.jobId || data.status_url || data.statusUrl) {
      const statusUrl = data.status_url || data.statusUrl || `${API_ENDPOINT.replace(/\/$/, "")}/status/${encodeURIComponent(data.job_id || data.jobId)}`;
      return pollStatus(statusUrl);
    }
    return data;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    resetResult();
    setMessage("");
    els.urlField.classList.remove("invalid");

    const videoUrl = els.videoUrl.value.trim();
    if (!isYouTubeUrl(videoUrl)) {
      els.urlField.classList.add("invalid");
      setMessage("Please enter a valid youtube.com or youtu.be link.");
      els.videoUrl.focus();
      return;
    }

    if (!API_ENDPOINT) {
      setMessage("Frontend is ready. Backend API endpoint has not been connected yet.", "info");
      updateProgress("Backend not connected yet", "Next step: connect this page to the new Web Downloader API on the Oracle VM.");
      els.progressPanel.hidden = false;
      return;
    }

    setWorking(true);
    updateProgress("Connecting to backend...", "Validating the URL and starting the download job.");

    try {
      const data = await requestDownload(videoUrl);
      renderResult(data);
    } catch (error) {
      els.progressPanel.hidden = true;
      setMessage(text(error.message, "Download failed. Please try again."));
    } finally {
      setWorking(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const value = await navigator.clipboard.readText();
      if (value) {
        els.videoUrl.value = value.trim();
        els.urlField.classList.remove("invalid");
        setMessage("");
        els.videoUrl.focus();
      }
    } catch {
      setMessage("Clipboard access was blocked. Paste the link manually.", "info");
      els.videoUrl.focus();
    }
  }

  function loadRecent() {
    try {
      const items = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(items) ? items : [];
    } catch { return []; }
  }

  function saveRecent(items) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT))); } catch { /* Storage is optional. */ }
  }

  function addRecent(item) {
    const existing = loadRecent().filter((entry) => entry.url !== item.url);
    saveRecent([item, ...existing]);
    renderRecent();
  }

  function renderRecent() {
    const items = loadRecent();
    if (!items.length) {
      els.recentSection.hidden = true;
      els.recentList.replaceChildren();
      return;
    }

    els.recentSection.hidden = false;
    els.recentList.replaceChildren(...items.map((item) => {
      const row = document.createElement("article");
      row.className = "recent-item";

      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = text(item.title, "Video");
      const meta = document.createElement("div");
      meta.className = "recent-meta";
      const bits = [];
      if (item.quality) bits.push(item.quality);
      if (item.size) bits.push(`${item.size} MB`);
      if (item.time) bits.push(new Date(item.time).toLocaleString());
      meta.textContent = bits.join(" · ");
      copy.append(title, meta);

      const link = document.createElement("a");
      const safe = safeDownloadUrl(item.url);
      link.textContent = "Download";
      link.href = safe || "#";
      if (safe) link.setAttribute("download", "");

      row.append(copy, link);
      return row;
    }));
  }
  }

  els.form.addEventListener("submit", handleSubmit);
  els.pasteButton.addEventListener("click", pasteFromClipboard);
  els.downloadAnother.addEventListener("click", () => {
    resetResult();
    els.videoUrl.value = "";
    setMessage("");
    els.videoUrl.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  els.clearRecent.addEventListener("click", () => {
    localStorage.removeItem(RECENT_KEY);
    renderRecent();
  });
  els.videoUrl.addEventListener("input", () => {
    els.urlField.classList.remove("invalid");
    setMessage("");
  });

  renderRecent();
})();
