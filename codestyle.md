# 代码规范（codestyle）

> 规范来源：本项目前端代码规范以 **Airbnb JavaScript Style Guide**
> （https://github.com/airbnb/javascript ）为基础，结合课程作业要求做了少量简化。

## 1. 命名

- 变量 / 函数：小驼峰，动词开头，如 `refreshHistory`、`deleteHistory`
- 常量（不会重新赋值）：全大写 + 下划线，如 `API_BASE`
- CSS 类名：小写中划线，如 `.history-item`、`.btn-clear`
- id 名与 CSS 类名保持一致语义，如 `#history-list`

## 2. 格式

- 缩进：2 个空格（HTML / CSS / JS 统一）
- 字符串一律使用双引号 `"`（与 JSON 一致）
- 语句结尾不省略分号
- 每行不超过 100 字符

## 3. 注释

- 每个文件头部写块注释，说明文件职责
- 每个函数前用注释说明用途；关键步骤行内注释解释"为什么"
- 注释使用中文

## 4. 语言与安全

- 使用 `const` / `let`，不使用 `var`
- 异步一律使用 `async / await`，`fetch` 必须有 `try / catch` 兜底
- 任何来自后端的数据在拼进 `innerHTML` 前必须经过 `escapeHtml` 转义
- DOM 查询结果缓存到常量，避免重复 `getElementById`
- 前端不做任何计算：只收集输入、调用后端、展示结果

## 5. 提交

- 提交信息格式：`模块: 变更摘要`，如 `app: 历史删除后自动刷新`
- 提交前用浏览器实测一遍主要功能
