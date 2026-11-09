#!/usr/bin/env python3
"""Check data/papers.json against data/taxonomy.json. Exits 1 if anything is wrong."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = ["id", "title", "authors", "year", "venue", "track", "relevance", "source", "acceptance", "url", "category", "branch", "summary", "added"]
NOTE_KEYS = {"method", "evidence", "assumptions", "limitations", "related"}
TOP_KEYS = set(REQUIRED) | {"source", "pdf", "code", "hf", "arxiv", "hfDate", "acceptanceNote", "modality", "mechanism", "scenario", "notes"}
OTHER_RELEVANCE = "其他录用类型"


def check_acceptance(paper):
    errors = []
    sources = paper.get("source") or []
    acceptance = paper.get("acceptance")
    if acceptance == "作者声明" and not paper.get("acceptanceNote"):
        errors.append("作者声明必须填写 acceptanceNote")
    if paper.get("acceptanceNote") and acceptance != "作者声明":
        errors.append("只有作者声明可以填写 acceptanceNote")
    if paper.get("venue") == "HF Daily":
        if acceptance == "官方确认":
            errors.append("HF Daily 条目不能标记为官方确认")
        if "正式发表" in sources:
            errors.append("HF Daily 条目的 source 不能包含正式发表")
    else:
        if acceptance != "官方确认":
            errors.append("已填写正式发表渠道的条目必须是官方确认")
        if "正式发表" not in sources:
            errors.append("已填写正式发表渠道的条目 source 必须包含正式发表")
    if "HF Daily" in sources and not (paper.get("hf") and paper.get("hfDate")):
        errors.append("来源含 HF Daily 时必须填写 hf 和 hfDate")
    return errors


def title_key(title):
    return re.sub(r"[\W_]+", "", str(title or "").casefold())


def check(paper, taxonomy):
    errors = [f"缺少字段 {k}" for k in REQUIRED if paper.get(k) in (None, "", [])]
    errors += [f"未知字段 {k}" for k in paper if k not in TOP_KEYS]

    if paper.get("relevance") not in [*taxonomy["relevances"], OTHER_RELEVANCE]:
        errors.append(f"relevance 无效：{paper.get('relevance')}")
    if paper.get("track") not in taxonomy["trackOrder"]:
        errors.append(f"track 无效：{paper.get('track')}")
    if not set(paper.get("source", [])) <= set(taxonomy["sources"]) or not paper.get("source"):
        errors.append(f"source 无效：{paper.get('source')}")
    if paper.get("acceptance") not in taxonomy["acceptances"]:
        errors.append(f"acceptance 无效：{paper.get('acceptance')}")
    if not isinstance(paper.get("year"), int):
        errors.append("year 必须是整数")
    if not isinstance(paper.get("authors"), list):
        errors.append("authors 必须是数组")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(paper.get("added", ""))):
        errors.append("added 必须是 YYYY-MM-DD")
    if "hfDate" in paper and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(paper["hfDate"])):
        errors.append("hfDate 必须是 YYYY-MM-DD")
    errors += check_acceptance(paper)
    for key in ("url", "pdf", "code", "hf", "arxiv"):
        if key in paper and not str(paper[key]).startswith(("http://", "https://")):
            errors.append(f"{key} 必须是 http(s) 链接")

    categories = {c["name"]: c["branches"] for c in taxonomy["categories"]}
    if paper.get("category") not in categories:
        errors.append(f"category 无效：{paper.get('category')}")
    elif paper.get("branch") not in categories[paper["category"]]:
        errors.append(f"branch 不属于该 category：{paper.get('branch')}")

    for facet in taxonomy["facets"]:
        allowed = {o["value"] for o in facet["options"]}
        values = paper.get(facet["key"], [])
        if not isinstance(values, list):
            errors.append(f"{facet['key']} 必须是数组")
            continue
        errors += [f"{facet['key']} 取值无效：{v}" for v in values if v not in allowed]

    notes = paper.get("notes", {})
    if not isinstance(notes, dict):
        errors.append("notes 必须是对象")
    else:
        errors += [f"未知 notes 字段 {k}" for k in notes if k not in NOTE_KEYS]
    return errors


def main():
    taxonomy = json.loads((ROOT / "data/taxonomy.json").read_text(encoding="utf-8"))
    papers = json.loads((ROOT / "data/papers.json").read_text(encoding="utf-8"))
    if not isinstance(papers, list):
        sys.exit("data/papers.json 顶层必须是数组")

    failed = False
    seen = set()
    seen_titles = set()
    for index, paper in enumerate(papers):
        label = paper.get("id") or f"第 {index + 1} 条"
        errors = check(paper, taxonomy)
        if paper.get("id") in seen:
            errors.append("id 重复")
        seen.add(paper.get("id"))
        if title_key(paper.get("title")) in seen_titles:
            errors.append("标题重复")
        seen_titles.add(title_key(paper.get("title")))
        for error in errors:
            failed = True
            print(f"[{label}] {error}")

    if failed:
        sys.exit(1)
    print(f"通过校验：{len(papers)} 篇论文")


if __name__ == "__main__":
    main()
