import ast
import json
import re
import sys

s = sys.stdin.read()

start = s.find("{")
end_struct = s.find("struct LegoLocation")
end = s.rfind("}", 0, end_struct if end_struct != -1 else len(s))
if start == -1 or end == -1:
    sys.exit(1)
chunk = s[start : end + 1]

norm = chunk
norm = re.sub(r"([+-]?\d+(?:\.\d+)?)f\b", r"\1", norm)
norm = re.sub(r"\bNULL\b", "None", norm)
norm = re.sub(r"\bFALSE\b", "False", norm)
norm = re.sub(r"\bTRUE\b", "True", norm)
norm = norm.replace("{", "[").replace("}", "]")
norm = re.sub(r",\s*]", "]", norm)

try:
    data = ast.literal_eval("[" + norm + "]")
except Exception:
    sys.stderr.write("parse error\n")
    sys.exit(1)


def to_bool(v):
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(int(v))
    return bool(v)


def to_boundary(a):
    return {
        "name": a[0],
        "src": a[1],
        "srcScale": a[2],
        "dest": a[3],
        "destScale": a[4],
        "unk0x10": to_bool(a[5]),
    }


def to_loc(a):
    return {
        "index": a[0],
        "name": a[1],
        "position": [-a[2], a[3], a[4]],
        "direction": [-a[5], a[6], a[7]],
        "up": [-a[8], a[9], a[10]],
        "boundaryA": to_boundary(a[11]),
        "boundaryB": to_boundary(a[12]),
        "animationPlayedAtLocation": to_bool(a[13]),
        "frequency": a[14],
    }


mapped = [to_loc(x) for x in data[0]]

ts_type = """
type Boundary={
    name: string | null
    src: number
    srcScale: number
    dest: number
    destScale: number
    unk0x10: boolean
}

type LegoLocation={
    index: number
    name: string
    position: [number, number, number]
    direction: [number, number, number]
    up: [number, number, number]
    boundaryA: Boundary
    boundaryB: Boundary
    animationPlayedAtLocation: boolean
    frequency: number
}

"""

ts_data = f"export const locations: LegoLocation[] = {json.dumps(mapped, indent=2)}"
# +
# re.sub(
# r"\[\s+([0-9\.\-e]+),\s*([0-9\.\-e]+),\s*([0-9\.\-e]+)\s+\]",
# "new THREE.Vector3(\\1, \\2, \\3)",
# )
# +";",
# )

sys.stdout.write(ts_type + ts_data)
