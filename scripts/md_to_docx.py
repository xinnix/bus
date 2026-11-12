#!/usr/bin/env python3
"""Convert the rebuild plan Markdown into a styled DOCX."""
from __future__ import annotations

import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor


SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/Users/xinnix/code/bus/docs/三秦巴士-系统重建方案.md")
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/Users/xinnix/code/bus/docs/三秦巴士-系统重建方案.docx")

BODY_EAST = "微软雅黑"
BODY_LATIN = "Calibri"
MONO = "Consolas"
ACCENT = RGBColor(0x1F, 0x4E, 0x79)
GRAY = RGBColor(0x66, 0x66, 0x66)


def set_run_font(run, name=BODY_EAST, size=None, bold=None, color=None):
    run.font.name = name
    run._element.rPr.rFonts.set(qn("w:eastAsia"), name)
    if size:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color is not None:
        run.font.color.rgb = color


def shade_cell(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    tcPr.append(shd)


def set_cell_margins(cell, top=40, bottom=40, left=80, right=80):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.first_child_found_in("w:tcMar")
    if tcMar is None:
        tcMar = OxmlElement("w:tcMar")
        tcPr.append(tcMar)
    for tag, val in (("top", top), ("bottom", bottom), ("left", left), ("right", right)):
        node = OxmlElement(f"w:{tag}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)


def add_hyperlink(paragraph, text, url):
    part = paragraph.part
    r_id = part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), r_id)
    new_run = OxmlElement("w:r")
    rPr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "1F4E79")
    rPr.append(color)
    u = OxmlElement("w:u")
    u.set(qn("w:val"), "single")
    rPr.append(u)
    new_run.append(rPr)
    t = OxmlElement("w:t")
    t.text = text
    new_run.append(t)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


INLINE_LINK = re.compile(r"\[([^\]]+)\]\((https?://[^)]+)\)")
INLINE_BOLD = re.compile(r"\*\*([^*]+)\*\*")
INLINE_CODE = re.compile(r"`([^`]+)`")


def add_rich_text(paragraph, text, size=10.5, color=None):
    # Links first
    parts = []
    last = 0
    for m in INLINE_LINK.finditer(text):
        if m.start() > last:
            parts.append(("text", text[last:m.start()]))
        parts.append(("link", m.group(1), m.group(2)))
        last = m.end()
    if last < len(text):
        parts.append(("text", text[last:]))

    for part in parts:
        if part[0] == "link":
            add_hyperlink(paragraph, part[1], part[2])
            continue
        raw = part[1]
        # bold + inline code, simple sequential scan
        tokens = re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", raw)
        for token in tokens:
            if not token:
                continue
            if token.startswith("**") and token.endswith("**") and len(token) > 4:
                run = paragraph.add_run(token[2:-2])
                set_run_font(run, size=size, bold=True, color=color)
            elif token.startswith("`") and token.endswith("`") and len(token) > 2:
                run = paragraph.add_run(token[1:-1])
                set_run_font(run, name=MONO, size=size - 0.5, color=RGBColor(0x80, 0x30, 0x30))
            else:
                run = paragraph.add_run(token)
                set_run_font(run, size=size, color=color)


def add_table(document, rows):
    if not rows:
        return
    cols = len(rows[0])
    table = document.add_table(rows=len(rows), cols=cols)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    if cols == 6:
        table.autofit = False
        ratios = [0.10, 0.12, 0.30, 0.14, 0.07, 0.27]
        total_width = 17.0  # cm, usable width of A4 with 2cm margins
        for j, ratio in enumerate(ratios):
            width = Cm(total_width * ratio)
            for cell in table.columns[j].cells:
                cell.width = width
    for i, row in enumerate(rows):
        for j in range(cols):
            cell = table.cell(i, j)
            cell.text = ""
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            value = row[j].strip() if j < len(row) else ""
            add_rich_text(p, value, size=8.5 if cols >= 6 else 9)
            set_cell_margins(cell)
            if i == 0:
                shade_cell(cell, "1F4E79")
                for run in p.runs:
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                    run.bold = True
            elif i % 2 == 0:
                shade_cell(cell, "EEF3F8")
    # spacer
    document.add_paragraph().paragraph_format.space_after = Pt(2)


def add_code_block(document, lines):
    table = document.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    cell = table.cell(0, 0)
    shade_cell(cell, "F5F5F5")
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    for idx, line in enumerate(lines):
        run = p.add_run(line)
        set_run_font(run, name=MONO, size=8)
        if idx < len(lines) - 1:
            run.add_break()
    document.add_paragraph().paragraph_format.space_after = Pt(2)


def add_page_number_footer(section):
    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("三秦巴士系统重建方案 · 第 ")
    set_run_font(run, size=8, color=GRAY)
    fldChar1 = OxmlElement("w:fldChar")
    fldChar1.set(qn("w:fldCharType"), "begin")
    instrText = OxmlElement("w:instrText")
    instrText.set(qn("xml:space"), "preserve")
    instrText.text = "PAGE"
    fldChar2 = OxmlElement("w:fldChar")
    fldChar2.set(qn("w:fldCharType"), "end")
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run2 = p.add_run(" 页")
    set_run_font(run2, size=8, color=GRAY)


def add_cover(document, subtitle):
    for _ in range(5):
        document.add_paragraph()
    p = document.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("三秦巴士 / 唐生出行")
    set_run_font(run, size=26, bold=True, color=ACCENT)
    p = document.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(subtitle)
    set_run_font(run, size=22, bold=True, color=ACCENT)
    p = document.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("基于 loom 全栈框架 · 管理后台 + 微信小程序")
    set_run_font(run, size=13, color=GRAY)
    for _ in range(8):
        document.add_paragraph()
    for line in [
        "调研日期：2026-11-12",
        "调研对象：https://www.ylxweb.com/admin.html（车队 sqbs，只读）",
        "目标框架：https://github.com/xinnix/loom",
        "文档版本：V1.0",
    ]:
        p = document.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(line)
        set_run_font(run, size=10, color=GRAY)
    document.add_page_break()


def main():
    text = SRC.read_text(encoding="utf-8")
    lines = text.splitlines()

    doc = Document()
    section = doc.sections[0]
    section.page_height = Cm(29.7)
    section.page_width = Cm(21.0)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(1.8)
    add_page_number_footer(section)

    # Base style
    normal = doc.styles["Normal"]
    normal.font.name = BODY_EAST
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), BODY_EAST)
    normal.font.size = Pt(10.5)
    normal.paragraph_format.line_spacing = 1.35
    normal.paragraph_format.space_after = Pt(4)

    for style_name, size in [("Heading 1", 16), ("Heading 2", 13), ("Heading 3", 11.5)]:
        st = doc.styles[style_name]
        st.font.name = BODY_EAST
        st._element.rPr.rFonts.set(qn("w:eastAsia"), BODY_EAST)
        st.font.size = Pt(size)
        st.font.color.rgb = ACCENT
        st.font.bold = True
        st.paragraph_format.space_before = Pt(12)
        st.paragraph_format.space_after = Pt(6)

    first_heading = next((ln[2:].strip() for ln in lines if ln.startswith("# ")), "")
    subtitle = first_heading
    for prefix in ("三秦巴士 / 唐生出行 ", "三秦巴士 "):
        if subtitle.startswith(prefix):
            subtitle = subtitle[len(prefix):]
            break
    add_cover(doc, subtitle)

    i = 0
    in_code = False
    code_lines = []
    table_rows = []
    seen_first_heading = False
    while i < len(lines):
        line = lines[i]

        if line.strip().startswith("```"):
            if not in_code:
                in_code = True
                code_lines = []
            else:
                in_code = False
                add_code_block(doc, code_lines)
            i += 1
            continue
        if in_code:
            code_lines.append(line)
            i += 1
            continue

        if line.startswith("|"):
            # collect table until non-table line
            raw = []
            while i < len(lines) and lines[i].startswith("|"):
                raw.append(lines[i])
                i += 1
            parsed = []
            for idx, row in enumerate(raw):
                cells = [c.strip() for c in row.strip().strip("|").split("|")]
                if idx == 0:
                    parsed.append(cells)
                elif all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in cells if c):
                    continue
                else:
                    parsed.append(cells)
            add_table(doc, parsed)
            continue

        if not line.strip():
            i += 1
            continue

        if line.strip() == "---":
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(2)
            pPr = p._p.get_or_add_pPr()
            pBdr = OxmlElement("w:pBdr")
            bottom = OxmlElement("w:bottom")
            bottom.set(qn("w:val"), "single")
            bottom.set(qn("w:sz"), "6")
            bottom.set(qn("w:space"), "1")
            bottom.set(qn("w:color"), "CCCCCC")
            pBdr.append(bottom)
            pPr.append(pBdr)
            i += 1
            continue

        if line.startswith("# "):
            # skip main title; cover already has it
            i += 1
            continue
        if line.startswith("## "):
            seen_first_heading = True
            p = doc.add_heading(level=1)
            add_rich_text(p, line[3:], size=16)
            i += 1
            continue
        if line.startswith("### "):
            p = doc.add_heading(level=2)
            add_rich_text(p, line[4:], size=13)
            i += 1
            continue
        if line.startswith("#### "):
            p = doc.add_heading(level=3)
            add_rich_text(p, line[5:], size=11.5)
            i += 1
            continue

        if line.startswith("> "):
            if not seen_first_heading:
                i += 1
                continue
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.4)
            add_rich_text(p, line[2:], size=9.5, color=GRAY)
            for run in p.runs:
                run.italic = True
            i += 1
            continue

        m = re.match(r"^(\s*)[-*] (.*)$", line)
        if m:
            indent = len(m.group(1))
            level = "List Bullet" if indent < 2 else "List Bullet 2"
            p = doc.add_paragraph(style=level)
            add_rich_text(p, m.group(2), size=10.5)
            i += 1
            continue

        m = re.match(r"^(\s*)(\d+)\. (.*)$", line)
        if m:
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Cm(0.75)
            p.paragraph_format.first_line_indent = Cm(-0.45)
            add_rich_text(p, f"{m.group(2)}. {m.group(3)}", size=10.5)
            i += 1
            continue

        p = doc.add_paragraph()
        add_rich_text(p, line.strip(), size=10.5)
        i += 1

    doc.save(str(OUT))
    print(f"Saved {OUT}")


if __name__ == "__main__":
    main()
