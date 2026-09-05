#!/usr/bin/env python3
"""Turn an IM schedule .xlsx into the flat CSV that add_matches.js reads.

The workbooks are laid out as a visual calendar: a "WEEK n" banner, a row of day
headers like "Monday (9/14)", and under each day header a three-column block of
games. Two shapes exist, and both are handled:

  outdoor (Soccer, Spikeball, Cornhole, Flag Football)  ->  [time, "SY vs TD", field]
  indoor  (Pickleball, Table Tennis)                    ->  [room, "SY vs TD", time]

In the outdoor shape the time is written once per group and the rows beneath it
inherit it; in the indoor shape the room is written once per day and inherits.

Output columns are Date,Time,Home College,Away College,Sport,Location,Room --
exactly what add_matches.js destructures, with Location -> location and
Room -> location_extra.

Usage:
  ./format_schedule.py "data/Cornhole Fall 2026.xlsx"
  ./format_schedule.py "data/Cornhole Fall 2026.xlsx" -o data/out.csv --sport Cornhole

Reads .xlsx with the standard library only (it is a zip of XML), so there is
nothing to npm/pip install.
"""

import argparse
import csv
import datetime
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# Venue per sport: Location is the fixed venue, Room the indoor room when the
# workbook names one per game. Matches the convention in the existing
# *_schedule_formatted.csv files.
VENUES = {
    "Soccer": ("Yale Bowl/IM fields", None),
    "Flag Football": ("Yale Bowl", None),
    "Spikeball": ("Morse-Stiles Crescent", None),
    "Cornhole": ("Morse-Stiles Crescent", None),
    "Pickleball": ("PWG", "from_sheet"),
    "Table Tennis": ("PWG", "from_sheet"),
}

TIME_RE = re.compile(r"^\d{1,2}:\d{2}\s*(AM|PM)$", re.I)
DAY_RE = re.compile(
    r"^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*\((\d{1,2})/(\d{1,2})\)",
    re.I,
)
MATCH_RE = re.compile(r"^([A-Z]{2})\s+vs\.?\s+([A-Z]{2})$", re.I)


# ---------------------------------------------------------------- xlsx reading

def _col_index(ref):
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_sheet(path, sheet_name="Schedule"):
    """Return the sheet as a list of rows of trimmed strings."""
    z = zipfile.ZipFile(path)
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    targets = {r.get("Id"): r.get("Target") for r in rels}

    target = None
    for sh in wb.find("m:sheets", NS):
        if sh.get("name") == sheet_name:
            rid = [v for k, v in sh.attrib.items() if k.endswith("}id")][0]
            target = targets[rid]
    if target is None:
        raise SystemExit(f"{path}: no sheet named {sheet_name!r}")
    if not target.startswith("xl/"):
        target = "xl/" + target.lstrip("/")

    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")):
            shared.append("".join(t.text or "" for t in si.iter(f'{{{NS["m"]}}}t')))

    # Number formats, so date/time cells come back as text rather than serials.
    styles = ET.fromstring(z.read("xl/styles.xml"))
    codes = {}
    numfmts = styles.find("m:numFmts", NS)
    if numfmts is not None:
        for nf in numfmts:
            codes[int(nf.get("numFmtId"))] = nf.get("formatCode")
    xf_fmt = [int(xf.get("numFmtId", 0)) for xf in styles.find("m:cellXfs", NS)]
    builtin_dates = set(range(14, 23)) | set(range(45, 48)) | {27, 30, 36, 50, 57}

    rows = []
    for row in ET.fromstring(z.read(target)).iter(f'{{{NS["m"]}}}row'):
        cells = {}
        for c in row:
            ref = c.get("r")
            if not ref:
                continue
            kind, v = c.get("t"), c.find("m:v", NS)
            if kind == "inlineStr":
                text = "".join(x.text or "" for x in c.iter(f'{{{NS["m"]}}}t'))
            elif kind == "s":
                text = shared[int(v.text)] if v is not None else ""
            elif v is None:
                text = ""
            else:
                text = v.text or ""
                style = c.get("s")
                if style is not None and text:
                    fmt_id = xf_fmt[int(style)]
                    code = codes.get(fmt_id, "") or ""
                    if fmt_id in builtin_dates or re.search(r"[dmyhs]", code, re.I):
                        try:
                            dt = datetime.datetime(1899, 12, 30) + datetime.timedelta(
                                days=float(text)
                            )
                            text = (
                                dt.strftime("%-I:%M %p")
                                if float(text) < 1
                                else dt.strftime("%-m/%-d/%Y")
                            )
                        except ValueError:
                            pass
            cells[_col_index(ref)] = text.strip()
        rows.append([cells.get(i, "") for i in range(max(cells) + 1)] if cells else [])
    return rows


# ---------------------------------------------------------------- sheet layout

def cell(row, i):
    return row[i] if i < len(row) else ""


def detect_layout(rows):
    """"outdoor" -> [time, match, place]; "indoor" -> [room, match, time]."""
    before = after = 0
    for row in rows:
        for i, value in enumerate(row):
            if MATCH_RE.match(value):
                if TIME_RE.match(cell(row, i - 1)):
                    before += 1
                if TIME_RE.match(cell(row, i + 1)):
                    after += 1
    return "indoor" if after > before else "outdoor"


def season_year(month, fall_year):
    """Fall workbooks run Aug-Dec; anything earlier belongs to the next year."""
    return fall_year if month >= 8 else fall_year + 1


def parse_games(rows, fall_year):
    """Yield (date, time, home, away, room) in workbook reading order."""
    layout = detect_layout(rows)
    blocks = {}  # start column -> {"date": ..., "time": ..., "room": ...}

    for row in rows:
        headers = [(i, DAY_RE.match(v)) for i, v in enumerate(row) if DAY_RE.match(v)]
        if headers:
            blocks = {
                i: {
                    "date": datetime.date(
                        season_year(int(m.group(2)), fall_year),
                        int(m.group(2)),
                        int(m.group(3)),
                    ),
                    "time": "",
                    "room": "",
                }
                for i, m in headers
            }
            continue

        for start, state in sorted(blocks.items()):
            match = MATCH_RE.match(cell(row, start + 1))
            left, right = cell(row, start), cell(row, start + 2)

            if layout == "outdoor":
                if TIME_RE.match(left):
                    state["time"] = left.upper()
                time, room = state["time"], ""
            else:
                if left:
                    state["room"] = left
                if TIME_RE.match(right):
                    state["time"] = right.upper()
                time, room = state["time"], state["room"]

            if not match or not time:
                continue
            yield (
                state["date"].strftime("%-m/%-d/%Y"),
                time,
                match.group(1).upper(),
                match.group(2).upper(),
                room,
            )


def sport_from_filename(path):
    stem = re.sub(r"\.xlsx$", "", path.split("/")[-1], flags=re.I)
    stem = re.sub(r"\b(fall|spring|winter)\b", "", stem, flags=re.I)
    stem = re.sub(r"\b20\d{2}\b", "", stem)
    name = " ".join(stem.split())
    for known in VENUES:
        if known.lower() == name.lower():
            return known
    return name


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("xlsx")
    ap.add_argument("-o", "--out", help="output CSV (default: <Sport>_Fall_<year>_schedule_formatted.csv beside the xlsx)")
    ap.add_argument("--sport", help="sport name (default: inferred from the filename)")
    ap.add_argument("--year", type=int, default=2026, help="calendar year the fall term starts in")
    ap.add_argument("--sheet", default="Schedule")
    args = ap.parse_args()

    sport = args.sport or sport_from_filename(args.xlsx)
    if sport not in VENUES:
        raise SystemExit(
            f"unknown sport {sport!r}; add it to VENUES or pass --sport"
        )
    location, room_rule = VENUES[sport]

    rows = read_sheet(args.xlsx, args.sheet)
    games = list(parse_games(rows, args.year))
    if not games:
        raise SystemExit(f"{args.xlsx}: no games found -- check the sheet layout")

    out = args.out
    if not out:
        folder = "/".join(args.xlsx.split("/")[:-1])
        name = f"{sport.replace(' ', '_')}_Fall_{args.year}_schedule_formatted.csv"
        out = f"{folder}/{name}" if folder else name

    with open(out, "w", newline="") as fh:
        w = csv.writer(fh, lineterminator="\n")
        w.writerow(["Date", "Time", "Home College", "Away College", "Sport", "Location", "Room"])
        for date, time, home, away, room in games:
            w.writerow([date, time, home, away, sport, location, room if room_rule == "from_sheet" else ""])

    print(f"{out}: {len(games)} games")


if __name__ == "__main__":
    sys.exit(main())
