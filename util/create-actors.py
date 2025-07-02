"""
00:	{"pepper",
01:	 NULL,
02:	 NULL,
03:	 0,
04:	 0,
05:	 0,
06:	 {{g_bodyPartIndices, g_bodyPartName, 1, g_chestTextureIndices, g_chestTexture, 0},
07:	  {g_pepperHatPartIndices, g_hatPartName, 0, g_hatColorIndices, g_colorAlias, 0},
08:	  {NULL, NULL, 0, g_gronColorIndices, g_colorAlias, 4},
09:	  {NULL, NULL, 0, g_faceTextureIndices, g_faceTexture, 0},
10:	  {NULL, NULL, 0, g_armColorIndices, g_colorAlias, 3},
11:	  {NULL, NULL, 0, g_armColorIndices, g_colorAlias, 3},
12:	  {NULL, NULL, 0, g_clawLeftColorIndices, g_colorAlias, 2},
13:	  {NULL, NULL, 0, g_clawRightColorIndices, g_colorAlias, 2},
14:	  {NULL, NULL, 0, g_legColorIndices, g_colorAlias, 4},
15:	  {NULL, NULL, 0, g_legColorIndices, g_colorAlias, 4}}},
"""

BODY_PARTS = ["Body", "BodyRed", "BodyBlack", "BodyWhite", "BodyYellow", "BodyBlue", "BodyGreen", "BodyBrown"]
CHEST_TEXTURES = ["peprchst.gif", "mamachst.gif", "papachst.gif", "nickchst.gif", "norachst.gif",
								"infochst.gif", "shftchst.gif", "rac1chst.gif", "rac2chst.gif", "bth1chst.gif",
								"bth2chst.gif", "mech.gif",     "polkadot.gif", "bowtie.gif",   "postchst.gif",
								"vest.gif",     "doctor.gif",   "copchest.gif", "l.gif",        "e.gif",
								"g.gif",        "o.gif",        "fruit.gif",    "flowers.gif",  "construct.gif",
								"paint.gif",    "l6.gif",       "unkchst.gif"]
COLORS = ["White", "Black", "Yellow", "Red", "Blue", "Brown", "LightGray", "Green"]
FACE_TEXTURES = [	"peprface.gif",
	"mamaface.gif",
	"papaface.gif",
	"nickface.gif",
	"noraface.gif",
	"infoface.gif",
	"shftface.gif",
	"dogface.gif",
	"womanshd.gif",
	"smileshd.gif",
	"woman.gif",
	"smile.gif",
	"mustache.gif",
	"black.gif"]

CHEST_TEXTURE_INDICES = [0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10, 11, 12, 13,
								14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 0xff]

def get_color_index(line: str) -> str:
    (color_indices, color_names, color_index) = [part.strip() for part in line.strip("{},").split(",")][3:]
    assert color_indices.startswith("g_")
    assert color_indices.endswith("ColorIndices")
    assert color_names == "g_colorAlias"
    return color_index

def get_color(line: str) -> str:
    color_index = get_color_index(line)
    return "Color." + COLORS[int(color_index)]

with open("LEGO1\\lego\\legoomni\\src\\common\\legoactors.cpp", mode = "r", encoding="ascii") as f:
    lines = [l.strip() for l in f.readlines()]
    for lineno, line in enumerate(lines):
        if line == "LegoActorInfo g_actorInfoInit[] = {":
            print(lineno)
            offset = lineno + 1
            break
    else:
        raise Exception()

    names = []
    while offset < len(lines) - 16:
        names += [lines[offset].strip("{\",")]
        print("  " + lines[offset].strip("{\",") + ": {")
        # ignore 5 lines
        (body_indices, body_parts, body_index, chest_indices, chest_names, chest_index) = [part.strip() for part in lines[offset + 6].strip("{},").split(",")]
        (hat_part_indices, hat_parts, hat_part_index, hat_color_indices, hat_color_names, hat_color_index) = [part.strip() for part in lines[offset + 7].strip("{},").split(",")]
        assert body_indices == "g_bodyPartIndices"
        assert body_parts == "g_bodyPartName"
        assert hat_parts == "g_hatPartName"
        assert hat_color_indices == "g_hatColorIndices"
        assert hat_color_names == "g_colorAlias"
        print("    bodyPart: BodyPart." + BODY_PARTS[int(body_index)] + ",")
        match hat_part_indices:
            case "g_pepperHatPartIndices": hat_parts_name = "PEPPER_HAT_PARTS"
            case "g_infomanHatPartIndices": hat_parts_name = "INFOMAN_HAT_PARTS"
            case "g_ghostHatPartIndices": hat_parts_name = "GHOST_HAT_PARTS"
            case "g_hatPartIndices": hat_parts_name = "HAT_PARTS"
            case _: raise Exception()
        print("    hatParts: " + hat_parts_name + ",")
        print("    hatPart: " + hat_part_index + ",")
        print("    hatColor: Color." + COLORS[int(hat_color_index)] + ",")
        if chest_names == "g_chestTexture":
            assert chest_indices == "g_chestTextureIndices"
            texture = CHEST_TEXTURES[CHEST_TEXTURE_INDICES[int(chest_index)]][:-4]
            if texture.endswith("chst"):
                texture = texture[:-4]
            texture = texture[0].upper() + texture[1:]
            print("    body: { texture: ChestTexture." + texture + " },")
        else:
            assert chest_indices == "g_legColorIndices" # ??
            print("    body: { color: Color." + COLORS[int(chest_index)] + " },")
        (face_texture_indices, face_texture_names, face_texture_index) = [part.strip() for part in lines[offset + 9].strip("{},").split(",")][3:]
        assert face_texture_indices == "g_faceTextureIndices"
        assert face_texture_names == "g_faceTexture"
        face_texture = FACE_TEXTURES[int(face_texture_index)][:-4]
        if face_texture.endswith("face"):
            face_texture = face_texture[:-4]
        if face_texture.endswith("shd"):
            face_texture = face_texture[:-3] + "Shd"
        face_texture = face_texture[0].upper() + face_texture[1:]
        print("    faceTexture: FaceTexture." + face_texture + ",")
        print("    groinColor: " + get_color(lines[offset + 8]) + ",")
        print("    leftArmColor: " + get_color(lines[offset + 10]) + ",")
        print("    rightArmColor: " + get_color(lines[offset + 11]) + ",")
        print("    leftClawColor: " + get_color(lines[offset + 12]) + ",")
        print("    rightClawColor: " + get_color(lines[offset + 13]) + ",")
        print("    leftLegColor: " + get_color(lines[offset + 14]) + ",")
        print("    rightLegColor: " + get_color(lines[offset + 15]) + ",")
        print("  },")

        offset += 16

    print()
    print()
    print("'" + "' | '".join(names) + "'")
