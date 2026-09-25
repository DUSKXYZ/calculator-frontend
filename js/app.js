/* ============================================================
 * 前端主逻辑（原生 JavaScript，无任何框架、无构建工具）
 *
 * 前端只做三件事（这是作业的核心要求：计算必须由后端完成）：
 *   1. 收集按键输入，拼出表达式字符串；
 *   2. 把表达式 POST 给后端 → 展示后端返回的结果或错误信息；
 *   3. 从后端读取历史列表 / 删除历史 → 渲染到页面。
 * 前端从头到尾不做任何真正的计算，也不缓存历史 —— 刷新后历史依旧来自数据库。
 * ============================================================ */

// 后端 API 地址。本地开发用 localhost:8080；部署后改成服务器地址即可，例如：
// const API_BASE = "http://你的服务器IP:8080/api";
const API_BASE = "http://localhost:8080/api";

// ---------- 获取页面元素（index.html 里的 id） ----------
const exprEl = document.getElementById("expression");      // 表达式显示行
const resultEl = document.getElementById("result");        // 结果/错误显示行
const listEl = document.getElementById("history-list");    // 历史列表 <ul>
const statusEl = document.getElementById("backend-status");// 后端连接状态

let currentExpr = ""; // 当前正在输入的表达式字符串

/* ==================== 事件绑定 ==================== */

// 给所有按键绑定点击事件：根据 data-action / data-key 分发
document.querySelectorAll(".key").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.action === "clear") return clearAll();
    if (btn.dataset.action === "backspace") return backspace();
    if (btn.dataset.action === "submit") return doCalculate();
    appendToExpr(btn.dataset.key); // 普通按键：把 data-key 里的字符追加到表达式
  });
});

// 键盘支持：数字、运算符、括号直接输入；Enter=计算；Backspace=退格；Esc=清空
document.addEventListener("keydown", (e) => {
  const k = e.key;
  if ((k >= "0" && k <= "9") || (k.length === 1 && "+-*/().".includes(k))) {
    appendToExpr(k);
    e.preventDefault();
  } else if (k === "Enter") {
    doCalculate();
    e.preventDefault();
  } else if (k === "Backspace") {
    backspace();
    e.preventDefault();
  } else if (k === "Escape") {
    clearAll();
    e.preventDefault();
  }
});

// 清空全部历史按钮（带一次确认，防止误触）
document.getElementById("clear-history").addEventListener("click", async () => {
  if (!confirm("确定要清空全部历史记录吗？此操作会删除数据库中的数据。")) return;
  try {
    const resp = await fetch(API_BASE + "/history", { method: "DELETE" });
    const data = await resp.json();
    if (data.success) await refreshHistory();
  } catch (err) {
    markBackendStatus(false);
  }
});

/* ==================== 输入处理 ==================== */

function appendToExpr(ch) {
  currentExpr += ch;
  renderExpr();
}

function backspace() {
  currentExpr = currentExpr.slice(0, -1);
  renderExpr();
}

function clearAll() {
  currentExpr = "";
  renderExpr();
  resultEl.textContent = "0";
  resultEl.classList.remove("error");
}

function renderExpr() {
  exprEl.textContent = currentExpr || " "; // 空的时候显示一个空格占位
}

/* ==================== 核心：把表达式交给后端计算 ==================== */

async function doCalculate() {
  const expression = currentExpr.trim();
  if (!expression) {
    showError("请先输入表达式");
    return;
  }

  try {
    // POST /api/calculate，请求体是 JSON：{"expression": "..."}
    const resp = await fetch(API_BASE + "/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expression }),
    });

    const data = await resp.json(); // 后端约定：任何情况下都返回 JSON

    if (data.success) {
      // 成功：展示后端算出的结果（注意：前端没有参与任何计算）
      resultEl.textContent = data.result;
      resultEl.classList.remove("error");
      await refreshHistory(); // 计算成功后刷新历史列表（新记录已入库）
    } else {
      // 失败：展示后端返回的错误原因（除零、括号不匹配、非法字符等）
      showError(data.message || "计算失败");
    }
  } catch (err) {
    // 走到 fetch 的 catch，一般是后端没启动或网络不通
    showError("无法连接后端服务，请确认后端已启动");
    markBackendStatus(false);
  }
}

function showError(msg) {
  resultEl.textContent = msg;
  resultEl.classList.add("error"); // CSS 会把它变成红色小字
}

/* ==================== 历史记录：全部来自后端数据库 ==================== */

// 从后端拉取历史列表并渲染。页面加载、每次计算成功、每次删除后都会调用。
async function refreshHistory() {
  try {
    const resp = await fetch(API_BASE + "/history");
    const data = await resp.json();
    if (!data.success) return;
    markBackendStatus(true);

    listEl.innerHTML = ""; // 先清空再重画（最简单的列表更新方式）

    if (data.data.length === 0) {
      listEl.innerHTML = '<li class="empty">暂无历史记录，去算一道题吧～</li>';
      return;
    }

    // 逐条创建 <li>。每条记录带一个删除按钮，点击时把 id 传给 deleteHistory
    for (const item of data.data) {
      const li = document.createElement("li");
      li.className = "history-item";
      // innerHTML 拼接前必须转义，防止恶意字符串注入页面（安全习惯）
      li.innerHTML = `
        <div class="info">
          <div class="expr">${escapeHtml(item.expression)}</div>
          <div class="res">= ${escapeHtml(item.result)}</div>
          <div class="time">${escapeHtml(item.createdAt)}</div>
        </div>
        <button class="del" title="删除这条记录">✕</button>`;
      li.querySelector(".del").addEventListener("click", () => deleteHistory(item.id));
      listEl.appendChild(li);
    }
  } catch (err) {
    markBackendStatus(false);
  }
}

// 删除一条历史：调用 DELETE /api/history/{id}，成功后刷新列表
async function deleteHistory(id) {
  try {
    const resp = await fetch(`${API_BASE}/history/${id}`, { method: "DELETE" });
    const data = await resp.json();
    if (data.success) {
      await refreshHistory();
    } else {
      alert(data.message); // 比如“记录不存在或已被删除”
    }
  } catch (err) {
    markBackendStatus(false);
  }
}

/* ==================== 小工具 ==================== */

// HTML 转义：把 & < > " 换成实体，防止被当成标签执行
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 更新页面顶部的后端连接状态
function markBackendStatus(ok) {
  statusEl.textContent = ok ? "● 后端已连接" : "● 后端未连接（请先启动后端）";
  statusEl.classList.toggle("ok", ok);
  statusEl.classList.toggle("bad", !ok);
}

// 页面打开时：加载一次历史（顺带探测后端是否在线）
refreshHistory();
