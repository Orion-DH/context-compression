# 论文录入规范

本仓库是“上下文压缩”论文库，托管在 GitHub Pages 上。网站内容全部来自 `data/papers.json`，录入论文时只需要改这个文件。

## 收录范围

收录的论文需要以“压缩或管理模型上下文中的信息”为主要贡献，包括提示压缩、对话与 Agent 上下文管理、模型内部压缩、KV 缓存管理、多模态长上下文，以及相关评测与理论。只是扩大上下文窗口、并未处理压缩问题的论文不收录。

## 录入要求

1. 所有信息必须来自论文原文或官方页面，不要凭记忆填写。查不到的可选字段直接省略。
2. 按 `id` 查重，已有论文就更新原条目，不新增。
3. `category`、`branch`、`status`、`award` 和各标签字段只能使用 `data/taxonomy.json` 里的取值。确实需要新分类时，先改 taxonomy，并在提交说明里写明原因。
4. 实验数字要带上比较条件，不能只写“提升明显”。
5. 录入后运行校验，通过后再提交：

```bash
python3 scripts/validate.py
```

## 字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | arXiv 论文用 `arxiv-编号`；其他论文用 `doi-编号` 或英文短名 |
| `title` | 是 | 论文原标题 |
| `authors` | 是 | 作者数组 |
| `year` | 是 | 整数 |
| `venue` | 是 | 如 `ICLR 2026`，预印本写 `arXiv` |
| `status` | 是 | `已发表` 或 `预印本` |
| `url` | 是 | 论文主页或官方页面 |
| `category` | 是 | 压缩主类 |
| `branch` | 是 | 所选主类下的方法分支 |
| `summary` | 是 | 一两句中文，说明压缩了什么、怎么压缩、效果如何 |
| `added` | 是 | 收录日期，格式 `YYYY-MM-DD` |
| `award` | 否 | 官方标注的奖项或展示类型 |
| `pdf`、`code` | 否 | PDF 和官方代码链接 |
| `location`、`retention`、`goal`、`scenario` | 否 | 标签数组 |
| `notes` | 否 | 对象，可含 `method`、`evidence`、`assumptions`、`limitations`、`related` |

## 示例结构

下面的取值只用于说明格式，不是真实论文，不要写入数据文件。

```json
{
  "id": "arxiv-0000.00000",
  "title": "论文原标题",
  "authors": ["作者一", "作者二"],
  "year": 2026,
  "venue": "arXiv",
  "status": "预印本",
  "url": "https://arxiv.org/abs/0000.00000",
  "pdf": "https://arxiv.org/pdf/0000.00000",
  "category": "输入与提示压缩",
  "branch": "摘要式重写",
  "location": ["模型输入前"],
  "retention": ["生成摘要"],
  "goal": ["减少 Token"],
  "scenario": ["长文档问答"],
  "summary": "用一两句话写清压缩对象、做法和实测效果。",
  "notes": {
    "method": "核心做法。",
    "evidence": "数据集、基线和具体指标。",
    "limitations": "论文没有覆盖或容易失效的情况。"
  },
  "added": "2026-01-01"
}
```
