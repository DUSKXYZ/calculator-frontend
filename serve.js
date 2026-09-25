/* ============================================================
 * serve.js —— 一个 30 行的本地静态文件服务器
 * 作用：本地预览前端页面（也可以直接双击 index.html 打开，效果一样）。
 * 用法：node serve.js        然后浏览器访问 http://localhost:3000
 * 部署提示：这个文件只是为了本地方便；正式部署时把整个文件夹
 *           丢到 Vercel / GitHub Pages 等静态托管上即可。
 * ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;              // 网站根目录 = 本文件所在目录
const PORT = process.argv[2] || 3000; // 端口：命令行第二个参数可改，默认 3000

// 常见文件类型对应的 Content-Type（告诉浏览器怎么解析响应）
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    // 1. 解析 URL：去掉查询参数；访问 / 时返回 index.html
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath === "/") urlPath = "/index.html";

    // 2. 拼出磁盘上的真实路径，并防止 ../ 越权访问项目外的文件
    const filePath = path.join(ROOT, path.normalize(urlPath));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("403 Forbidden");
    }

    // 3. 读取文件并返回；读不到就 404
    fs.readFile(filePath, (err, buf) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("404 Not Found: " + urlPath);
      }
      const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      res.end(buf);
    });
  })
  .listen(PORT, () => {
    console.log(`前端页面已就绪: http://localhost:${PORT}`);
  });
