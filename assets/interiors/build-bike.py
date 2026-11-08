import bpy
import bmesh
import math
from pathlib import Path
from mathutils import Vector

root_path = Path(__file__).resolve().parents[2]
scene = bpy.data.scenes.new('Bike interior')
bpy.context.window.scene = scene
collection = scene.collection


def material(name, color, metallic=0.0, roughness=0.3):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1)
    value.use_nodes = True
    shader = value.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return value


red = material('Bike red plastic', (0.64, 0.008, 0.012), roughness=0.26)
yellow = material('Rider yellow hands', (1.0, 0.72, 0.005), roughness=0.30)
silver = material('Bell satin silver', (0.65, 0.69, 0.71), metallic=0.65, roughness=0.28)
white = material('Information porcelain', (0.94, 0.95, 0.91), roughness=0.24)
sleeve = material('Rider light sleeves', (0.85, 0.86, 0.85), roughness=0.38)
dark = material('Bell lever', (0.055, 0.065, 0.07), metallic=0.5, roughness=0.3)


def group(name, parent=None, action=None):
    value = bpy.data.objects.new(name, None)
    collection.objects.link(value)
    value.parent = parent
    if action is not None:
        value['interiorAction'] = action
    return value


root = group('BikeInterior')
horn = group('Horn', root, 'horn')
info = group('Information', root, 'info')
left_hand = group('LeftHand', root, 'exit')
right_hand = group('RightHand', root, 'exit')


def finish(value, name, surface, parent, smooth=True):
    value.name = name
    value.data.materials.append(surface)
    value.parent = parent
    if smooth:
        for polygon in value.data.polygons:
            polygon.use_smooth = True
    return value


def cylinder(name, start, end, radius, surface, parent=root, vertices=48, bevel=0.004):
    start = Vector(start)
    end = Vector(end)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=(end - start).length, location=(start + end) / 2)
    value = bpy.context.object
    value.rotation_euler = (end - start).to_track_quat('Z', 'Y').to_euler()
    if bevel > 0:
        modifier = value.modifiers.new('Soft molded edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
        value.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
    return finish(value, name, surface, parent)


def sphere(name, position, scale, surface, parent=root):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=position)
    value = bpy.context.object
    value.scale = scale
    return finish(value, name, surface, parent)


def tube(name, points, radius, surface, parent=root, sides=24):
    vertices = []
    faces = []
    for n, point in enumerate(points):
        point = Vector(point)
        previous = Vector(points[max(0, n - 1)])
        following = Vector(points[min(len(points) - 1, n + 1)])
        tangent = (following - previous).normalized()
        normal = tangent.cross(Vector((0, 1, 0))).normalized()
        bitangent = tangent.cross(normal).normalized()
        for m in range(sides):
            angle = 2 * math.pi * m / sides
            vertices.append(point + radius * (math.cos(angle) * normal + math.sin(angle) * bitangent))
        if n > 0:
            for m in range(sides):
                a = (n - 1) * sides + m
                b = (n - 1) * sides + (m + 1) % sides
                faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(reversed(range(sides))))
    faces.append(tuple((len(points) - 1) * sides + n for n in range(sides)))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    value = bpy.data.objects.new(name, mesh)
    collection.objects.link(value)
    return finish(value, name, surface, parent)


def build_hand(side, hand):
    start = Vector((side * 0.76, 1.423, -0.37))
    axis = Vector((side * 0.30, 0, -0.02)).normalized()
    up = (Vector((0, 0, 1)) - axis * axis.z).normalized()
    forward = Vector((0, 1, 0))
    center = start + axis * 0.075
    cylinder(f'{hand.name} handlebar end', start, start + axis * 0.175, 0.065, red)

    vertices = []
    faces = []
    for n in range(97):
        angle = math.radians(115 + 290 * n / 96)
        radial = forward * math.sin(angle) + up * math.cos(angle)
        for axial in [-0.09, 0.09]:
            for radius in [0.070, 0.113]:
                vertices.append(center + axis * axial + radial * radius)
        if n > 0:
            previous = (n - 1) * 4
            current = n * 4
            faces.extend([
                (previous, current, current + 2, previous + 2),
                (previous + 1, previous + 3, current + 3, current + 1),
                (previous, previous + 1, current + 1, current),
                (previous + 2, current + 2, current + 3, previous + 3),
            ])
    faces.extend([(0, 2, 3, 1), (384, 385, 387, 386)])
    mesh = bpy.data.meshes.new(f'{hand.name} fitted gripper')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    normals = bmesh.new()
    normals.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(normals, faces=normals.faces)
    normals.to_mesh(mesh)
    normals.free()
    palm = bpy.data.objects.new(f'{hand.name} curved hand', mesh)
    collection.objects.link(palm)
    finish(palm, palm.name, yellow, hand)

    wrist_direction = (forward * -0.70710678 + up * -0.70710678).normalized()
    wrist = cylinder(f'{hand.name} wrist', center + wrist_direction * 0.18, center + wrist_direction * 0.093, 0.042, yellow, hand, bevel=0)
    bpy.context.view_layer.objects.active = palm
    union = palm.modifiers.new('Connected wrist', 'BOOLEAN')
    union.operation = 'UNION'
    union.solver = 'EXACT'
    union.object = wrist
    bpy.ops.object.modifier_apply(modifier=union.name)
    bpy.data.objects.remove(wrist, do_unlink=True)
    bevel = palm.modifiers.new('Rounded hand edges', 'BEVEL')
    bevel.width = 0.004
    bevel.segments = 3
    palm.modifiers.new('Molded hand normals', 'WEIGHTED_NORMAL')
    cylinder(f'{hand.name} sleeve', center + wrist_direction * 0.16, center + wrist_direction * 0.34, 0.058, sleeve, hand, bevel=0.006)


points = []
for n in range(49):
    x = -0.83 + 1.66 * n / 48
    arch = math.cos(x / 0.83 * math.pi / 2)
    points.append((x, 1.42 + 0.04 * arch, -0.375 + 0.075 * arch))
tube('Continuous red handlebar', points, 0.065, red)
tube('Red steering stem', [(0, 1.46, -0.32), (0, 1.42, -0.39), (0, 1.32, -0.53), (0, 1.22, -0.73), (0, 1.18, -0.9)], 0.072, red)
cylinder('Stem clamp', (0, 1.38, -0.335), (0, 1.52, -0.335), 0.078, red)
cylinder('Steering headset', (0, 1.40, -0.46), (0, 1.36, -0.46), 0.13, silver)

for side, hand in [(-1, left_hand), (1, right_hand)]:
    build_hand(side, hand)

cylinder('Bell mounting post', (0, 1.43, -0.31), (0, 1.43, -0.215), 0.025, silver, horn)
cylinder('Bell lower rim', (0, 1.43, -0.225), (0, 1.43, -0.205), 0.093, silver, horn)
sphere('Bell dome', (0, 1.43, -0.200), (0.082, 0.082, 0.052), silver, horn)
cylinder('Bell top button', (0, 1.43, -0.188), (0, 1.43, -0.115), 0.047, silver, horn)
cylinder('Bell button cap', (0, 1.43, -0.125), (0, 1.43, -0.11), 0.049, silver, horn)
tube('Bell striker lever', [(0.058, 1.43, -0.19), (0.11, 1.425, -0.16), (0.22, 1.42, -0.14)], 0.007, dark, horn, sides=12)
sphere('Bell lever tip', (0.22, 1.42, -0.14), (0.016, 0.018, 0.011), dark, horn)

cylinder('Information bezel', (0, 1.228, -0.432), (0, 1.201, -0.432), 0.076, silver, info)
cylinder('Information white face', (0, 1.200, -0.432), (0, 1.188, -0.432), 0.067, white, info)
cylinder('Information letter stem', (0, 1.179, -0.458), (0, 1.179, -0.417), 0.010, red, info, bevel=0.002)
cylinder('Information letter foot', (-0.017, 1.179, -0.46), (0.017, 1.179, -0.46), 0.006, red, info, bevel=0.001)
sphere('Information letter dot', (0, 1.178, -0.396), (0.012, 0.006, 0.012), red, info)
info.location.z = 0.038

bpy.ops.object.camera_add(location=(0, 0, 0))
camera = bpy.context.object
camera.name = 'Bike rider preview'
camera.rotation_euler = Vector((0, 1, 0)).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'PERSP'
camera.data.lens_unit = 'FOV'
camera.data.sensor_fit = 'VERTICAL'
camera.data.angle = math.radians(50)
camera.data.clip_start = 0.01
scene.camera = camera

for name, position, energy, size in [('Preview key', (-2, -1, 4), 450, 3), ('Preview fill', (3, 0, 1), 180, 4)]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    light = bpy.data.objects.new(name, data)
    collection.objects.link(light)
    light.location = position
    light.rotation_euler = (Vector((0, 1.4, -0.4)) - light.location).to_track_quat('-Z', 'Y').to_euler()

scene.world = bpy.data.worlds.new('Bike preview world')
scene.world.use_nodes = True
scene.world.node_tree.nodes.get('Background').inputs[0].default_value = (0.3, 0.35, 0.4, 1)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value = 0.5
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.render.resolution_x = 960
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'

bpy.ops.object.select_all(action='DESELECT')
for value in [root, *root.children_recursive]:
    value.select_set(True)
bpy.context.view_layer.objects.active = root
model_path = root_path / 'public/models/interiors/bike.glb'
model_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(model_path), export_format='GLB', use_selection=True, use_active_scene=True, export_extras=True, export_apply=True, export_cameras=False, export_lights=False)
save_version = bpy.context.preferences.filepaths.save_version
try:
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(root_path / 'assets/interiors/bike.blend'))
finally:
    bpy.context.preferences.filepaths.save_version = save_version
scene.render.filepath = str(root_path / 'assets/interiors/bike-preview.png')
bpy.ops.render.render(write_still=True)
result = {'model': str(model_path), 'objects': len(root.children_recursive), 'scene': scene.name, 'preview': scene.render.filepath}
