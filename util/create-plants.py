import re

"""
	{NULL,
	 LegoPlantInfo::c_act1 | LegoPlantInfo::c_act2 | LegoPlantInfo::c_act3,
	 LegoPlantInfo::e_flower,
	 3,
	 0,
	 1,
	 LegoPlantInfo::e_red,
	 -1,
	 -1,
	 "edg01_20",
	 1,
	 -70.0f,
	 8.0f,
	 -8.40763f,
	 NULL,
	 -73.75f,
	 8.0f,
	 -8.4375f,
	 1.0f,
	 0.0f,
	 0.0f,
	 0.0f,
	 1.0f,
	 0.0f},
     """

# Starts at line 7
# variant: 3rd row
# color: +4 rows
# x, y, z: +9... rows
# each entry is 24 lines long

src_file = "LEGO1\\lego\\legoomni\\src\\common\\legoplants.cpp"

with open(src_file, "r", encoding="ascii") as f:
    lines = f.readlines()

extract_worlds_line = re.compile(r"^\s*((?:LegoPlantInfo::c_(?:act1|imain|ielev|iisle|act2|act3)\s*\|?\s*)+),$")
extract_worlds_value = re.compile(r"^\s*LegoPlantInfo::c_(act1|imain|ielev|iisle|act2|act3)\s*$")
#^\s*((LegoPlantInfo::c_(act1|imain|ielev|iisle|act2|act3)\s*\|?\s*)+),$
extract_variant_value = re.compile(r"^\s*LegoPlantInfo::e_(flower|tree|bush|palm),$")
extract_color_value = re.compile(r"^\s*LegoPlantInfo::e_(white|black|yellow|red|green),$")
extract_float_value = re.compile(r"^\s*(-?\d+\.\d+)f(?:\},?|,)$")


def parse_via_regex(regex: re.Pattern, src: str) -> str:
    match = regex.match(src)
    if match:
        return match.group(1)
    raise Exception(f"Cannot match {regex} in {src}")


def first_upper(s: str) -> str:
    if s:
        return s[0].upper() + s[1:]
    return s


def make_values_constant(s: str) -> str:
    if s[0] == "-":
        prefix = "-"
        without_prefix = s[1:]
    else:
        prefix = ""
        without_prefix = s

    if without_prefix == "0.707":
        return f"{prefix}Math.SQRT1_2"
    return s


def generate_vector(offset: int) -> str:
    x, y, z = [parse_via_regex(extract_float_value, value) for value in lines[offset:offset + 3]]
    if abs(float(x)) > 0.000000001:
        if x[0] == "-":
            x = x[1:]
        else:
            x = "-" + x
    return f"[{make_values_constant(x)}, {make_values_constant(y)}, {make_values_constant(z)}]"


START = 6
LINES_ENTRY = 24
for offset in range(START, len(lines) - LINES_ENTRY + 1, LINES_ENTRY):
    worlds_line = parse_via_regex(extract_worlds_line, lines[offset + 1])
    worlds = [f"World.{parse_via_regex(extract_worlds_value, value).upper()}" for value in worlds_line.split("|")]
    variant = first_upper(parse_via_regex(extract_variant_value, lines[offset + 2]))
    color = first_upper(parse_via_regex(extract_color_value, lines[offset + 2 + 4]))
    location = generate_vector(offset + 2 + 4 + 9)
    direction = generate_vector(offset + 2 + 4 + 9 + 3)
    up = generate_vector(offset + 2 + 4 + 9 + 3 + 3)
    # print(variant)
    # print(color)
    # print(x)
    # print(y)
    # print(z)
    # { variant: Variant.Flower, color: Color.Red, location: [0, 0, 0] },
    print(f"    {{ worlds: {' | '.join(worlds)}, variant: Variant.{variant}, color: Color.{color}, locationAndDirection: {{ location: {location}, direction: {direction}, up: {up} }}}},")
    # print(f"    {{ variant: Variant.{variant}, color: Color.{color}, location: {location}, up: {up}, direction: {direction}}},")
    # break
