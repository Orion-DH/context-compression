# 上下文压缩论文库

收集并整理上下文压缩方向的论文，目前收录 CVPR、ECCV、ICLR、ICML、AAAI、ACL 2026 的 443 篇论文，支持按主类、方法分支、相关性、会议、录用类型、模态、机制和场景检索。

- 论文数据：`data/papers.json`
- 分类体系：`data/taxonomy.json`
- 录入规范：[AGENTS.md](AGENTS.md)

本地预览：

```bash
python3 -m http.server 8000
```

录入后校验：

```bash
python3 scripts/validate.py
```
