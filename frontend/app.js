const state = {
  audits: [],
  currentAuditId: null,
  currentAudit: null,
  currentSessionId: null,
  messages: [], // { role: 'user' | 'assistant', text, sources? }
};

const api = {
  async getAudits() {
    const res = await fetch("/api/audits");
    if (!res.ok) throw new Error("Fehler beim Laden der Prüfungen");
    return res.json();
  },

  async createAudit(title, description) {
    const res = await fetch("/api/audits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (!res.ok) throw new Error("Fehler beim Erstellen der Prüfung");
    return res.json();
  },

  async updateAuditStatus(auditId, status) {
    const res = await fetch(`/api/audits/${auditId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Fehler beim Ändern des Status");
    return res.json();
  },

  async chat(auditId, message, sessionId) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audit_id: auditId, message, session_id: sessionId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Fehler im Chat");
    }
    return res.json();
  },

  async uploadFile(auditId, sessionId, file) {
    const fd = new FormData();
    fd.append("audit_id", auditId);
    if (sessionId) fd.append("session_id", sessionId);
    fd.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error("Fehler beim Datei-Upload");
    return res.json();
  },

  async listDocuments(auditId) {
    const res = await fetch(`/api/upload/audits/${auditId}`);
    if (!res.ok) throw new Error("Fehler beim Laden der Dokumente");
    return res.json();
  },

  async listFindings(auditId) {
    const res = await fetch(`/api/findings/audits/${auditId}`);
    if (!res.ok) throw new Error("Fehler beim Laden der Feststellungen");
    return res.json();
  },

  async createFinding(auditId, title, description, severity) {
    const res = await fetch(`/api/findings/audits/${auditId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, severity }),
    });
    if (!res.ok) throw new Error("Fehler beim Anlegen der Feststellung");
    return res.json();
  },
};

// --- UI helpers ---

function $(id) {
  return document.getElementById(id);
}

function setAuditHeader(audit) {
  const titleEl = $("audit-title");
  const statusBadge = $("status-badge");
  const statusSelect = $("status-select");

  if (!audit) {
    titleEl.textContent = "Keine Prüfung ausgewählt";
    statusBadge.textContent = "–";
    statusSelect.disabled = true;
    return;
  }

  titleEl.textContent = audit.title;
  statusBadge.textContent = audit.status;
  statusSelect.value = audit.status;
  statusSelect.disabled = false;
}

function renderAuditList() {
  const list = $("audit-list");
  list.innerHTML = "";
  state.audits.forEach((audit) => {
    const li = document.createElement("li");
    li.textContent = audit.title;
    li.dataset.id = audit.id;
    if (audit.id === state.currentAuditId) {
      li.classList.add("active");
    }
    li.addEventListener("click", () => selectAudit(audit.id));
    list.appendChild(li);
  });
}

function renderChat() {
  const container = $("chat-history");
  container.innerHTML = "";
  state.messages.forEach((msg) => {
    const div = document.createElement("div");
    div.classList.add("chat-message", msg.role);

    const roleSpan = document.createElement("div");
    roleSpan.classList.add("role");
    roleSpan.textContent = msg.role === "user" ? "Du" : "Assistant";
    div.appendChild(roleSpan);

    const textDiv = document.createElement("div");
    textDiv.classList.add("text");
    textDiv.textContent = msg.text;
    div.appendChild(textDiv);

    if (msg.role === "assistant" && msg.sources && msg.sources.length > 0) {
      const srcDiv = document.createElement("div");
      srcDiv.classList.add("chat-sources");
      const labels = msg.sources
        .map((s) => `${s.label} ${s.filename || ""}`.trim())
        .join(", ");
      srcDiv.textContent = `Quellen: ${labels}`;
      div.appendChild(srcDiv);
    }

    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

async function selectAudit(auditId) {
  const audit = state.audits.find((a) => a.id === auditId);
  state.currentAuditId = auditId;
  state.currentAudit = audit || null;
  state.currentSessionId = null;
  state.messages = [];
  renderAuditList();
  setAuditHeader(state.currentAudit);
  renderChat();
  await refreshDocuments();
  await refreshFindings();
}

// --- Data refresh ---

async function refreshAudits() {
  try {
    const audits = await api.getAudits();
    state.audits = audits;
    renderAuditList();
  } catch (e) {
    console.error(e);
  }
}

async function refreshDocuments() {
  if (!state.currentAuditId) return;
  try {
    const docs = await api.listDocuments(state.currentAuditId);
    const list = $("document-list");
    list.innerHTML = "";
    docs.forEach((d) => {
      const li = document.createElement("li");
      li.textContent = d.filename;
      list.appendChild(li);
    });
  } catch (e) {
    console.error(e);
  }
}

async function refreshFindings() {
  if (!state.currentAuditId) return;
  try {
    const findings = await api.listFindings(state.currentAuditId);
    const list = $("findings-list");
    list.innerHTML = "";
    findings.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = `${f.severity || ""} - ${f.title}`;
      list.appendChild(li);
    });
  } catch (e) {
    console.error(e);
  }
}

// --- Event handlers ---

async function handleNewAudit() {
  const title = window.prompt("Titel der neuen Prüfung:");
  if (!title) return;
  const description = window.prompt("Beschreibung (optional):") || "";
  try {
    const audit = await api.createAudit(title, description);
    state.audits.unshift(audit);
    await selectAudit(audit.id);
  } catch (e) {
    console.error(e);
    alert(e.message);
  }
}

async function handleSendMessage() {
  if (!state.currentAuditId) {
    alert("Bitte zuerst eine Prüfung auswählen oder erstellen.");
    return;
  }
  const input = $("chat-input");
  const text = input.value.trim();
  if (!text) return;

  // lokale Anzeige der User-Message
  state.messages.push({ role: "user", text });
  renderChat();
  input.value = "";

  try {
    const res = await api.chat(state.currentAuditId, text, state.currentSessionId);
    state.currentSessionId = res.session_id;
    state.messages.push({
      role: "assistant",
      text: res.message,
      sources: res.sources || [],
    });
    renderChat();
  } catch (e) {
    console.error(e);
    alert(e.message);
  }
}

async function handleUpload() {
  if (!state.currentAuditId) {
    alert("Bitte zuerst eine Prüfung auswählen.");
    return;
  }
  const input = $("file-input");
  const files = Array.from(input.files || []);
  if (!files.length) {
    alert("Bitte mindestens eine Datei auswählen.");
    return;
  }

  for (const file of files) {
    try {
      await api.uploadFile(state.currentAuditId, state.currentSessionId, file);
    } catch (e) {
      console.error(e);
      alert(`Fehler beim Upload von ${file.name}: ${e.message}`);
    }
  }

  input.value = "";
  await refreshDocuments();
}

async function handleStatusChange() {
  if (!state.currentAuditId) return;
  const sel = $("status-select");
  const status = sel.value;
  try {
    const updated = await api.updateAuditStatus(state.currentAuditId, status);
    // Update im State
    const idx = state.audits.findIndex((a) => a.id === updated.id);
    if (idx >= 0) state.audits[idx] = updated;
    state.currentAudit = updated;
    setAuditHeader(state.currentAudit);
    renderAuditList();
  } catch (e) {
    console.error(e);
    alert(e.message);
  }
}

async function handleNewFinding() {
  if (!state.currentAuditId) {
    alert("Bitte zuerst eine Prüfung auswählen.");
    return;
  }
  const title = window.prompt("Titel der Feststellung:");
  if (!title) return;
  const description = window.prompt("Beschreibung (optional):") || "";
  const severity = window.prompt("Schweregrad (LOW/MEDIUM/HIGH), optional:") || null;
  try {
    await api.createFinding(state.currentAuditId, title, description, severity);
    await refreshFindings();
  } catch (e) {
    console.error(e);
    alert(e.message);
  }
}

// --- Init ---

function init() {
  $("new-audit-button").addEventListener("click", handleNewAudit);
  $("send-button").addEventListener("click", handleSendMessage);
  $("upload-button").addEventListener("click", handleUpload);
  $("status-select").addEventListener("change", handleStatusChange);
  $("new-finding-button").addEventListener("click", handleNewFinding);

  $("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  refreshAudits();
}

document.addEventListener("DOMContentLoaded", init);
