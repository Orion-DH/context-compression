# 论文录入规范

本仓库是“上下文压缩”论文库，托管在 GitHub Pages 上。网站内容全部来自 `data/papers.json`，录入论文时只需要改这个文件。

## 收录范围

收录以压缩或管理 LLM／MLLM 上下文为主要内容或明确组成部分的论文，包括文本与检索上下文、Agent 历史与工作记忆、潜在表示、视觉与音视频 token、3D 与具身输入、KV Cache，以及相关评测和机理研究。只是扩大上下文窗口、并未处理压缩问题的论文不收录。

## 录入要求

1. 所有信息必须来自论文原文或官方页面，不要凭记忆填写。查不到的可选字段直接省略。
2. 按 `id` 和标题查重，已有论文就更新原条目，不新增。同一论文同时出现在会议和 HF Daily 时，保留会议条目，并补充 `hf`、`arxiv`、`hfDate` 和 `source`。
3. `relevance`、`category`、`branch` 和标签字段只能使用 `data/taxonomy.json` 里的取值。确实需要新分类时，先改 taxonomy，并在提交说明里写明原因。
4. `summary` 写清压缩对象、方法和入选理由；如果压缩只是配套组件或有适用边界，要明确写出。实验数字要带上比较条件。
5. 录入后运行校验，通过后再提交：

```bash
python3 scripts/validate.py
```

## 主类归属规则

一篇论文只进一个主类，交叉时按顺序判断：

1. 主要贡献是评测、机理分析或综述，归“评测、机理与可靠性”。
2. 直接压缩 KV Cache，归“KV Cache”，模态用标签标出。
3. 方法依赖 3D 几何、具身或行业任务约束，归“3D、具身与领域专用”。通用剪枝只是用于某个场景时，按输入类型归类。
4. 其余按被压缩的内容归入文本、Agent、潜在表示、图像或视频主类。

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 唯一编号，如 `icml-2026-01`；新论文可用 `会议-年份-短名` |
| `title` | 是 | 论文原标题 |
| `authors` | 是 | 作者数组 |
| `year` | 是 | 整数 |
| `venue` | 是 | 如 `ICLR 2026`；未核实录用的 HF 论文填 `HF Daily` |
| `track` | 是 | 录用类型，取值见 taxonomy 的 `trackOrder` |
| `relevance` | 是 | `核心方法`、`扩展相关`、`分析研究` 或 `其他录用类型` |
| `source` | 是 | 数组，`会议论文`、`HF Daily` 之一或两者 |
| `url` | 是 | 官方论文页面；只来自 HF Daily 的论文填 HF 页面 |
| `category` | 是 | 压缩主类 |
| `branch` | 是 | 所选主类下的方法分支 |
| `summary` | 是 | 中文的压缩方法与入选理由 |
| `added` | 是 | 收录日期，格式 `YYYY-MM-DD` |
| `pdf`、`code` | 否 | PDF 或 OpenReview 入口、官方代码链接 |
| `hf`、`arxiv`、`hfDate` | 否 | HF 页面、arXiv 页面和 HF 收录日期 `YYYY-MM-DD` |
| `modality`、`mechanism`、`scenario` | 否 | 标签数组，只标论文或摘要明确提到的内容 |
| `notes` | 否 | 对象，可含 `method`、`evidence`、`assumptions`、`limitations`、`related` |
