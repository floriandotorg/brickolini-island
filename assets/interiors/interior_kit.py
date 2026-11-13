import bmesh
import bpy
import math
import os
from pathlib import Path
from mathutils import Matrix, Vector

root_path = Path(__file__).resolve().parents[2]
vertical_tangent = math.tan(math.radians(25))
horizontal_tangent = vertical_tangent * 4 / 3


def screen(x, y, depth):
    return Vector(((x - 320) / 320 * horizontal_tangent * depth, depth, -(y - 240) / 240 * vertical_tangent * depth))


def pixels(size, depth):
    return size / 240 * vertical_tangent * depth


def ball(radius, steps=24):
    return [(radius * math.sin(math.pi * n / steps), -radius * math.cos(math.pi * n / steps)) for n in range(steps + 1)]


def srgb(value):
    value /= 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def color(hex_value):
    return tuple(srgb(int(hex_value[n : n + 2], 16)) for n in (1, 3, 5))


def material(name, base, metallic=0.0, roughness=0.35, coat=0.0, coat_roughness=0.06, emission=0.0):
    value = bpy.data.materials.new(name)
    rgb = color(base) if isinstance(base, str) else base
    value.diffuse_color = (*rgb, 1)
    shader = value.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Coat Weight'].default_value = coat
    shader.inputs['Coat Roughness'].default_value = coat_roughness
    if emission > 0:
        shader.inputs['Emission Color'].default_value = (*rgb, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return value


def plastic(name, base, roughness=0.3):
    return material(name, base, roughness=roughness, coat=0.1)


def fillet(points, closed=False, segments=6):
    result = []
    count = len(points)
    for n, point in enumerate(points):
        x, y = point[0], point[1]
        radius = point[2] if len(point) > 2 else 0.0
        if radius <= 0 or (not closed and (n == 0 or n == count - 1)):
            result.append((x, y))
            continue
        previous = Vector(points[(n - 1) % count][:2])
        following = Vector(points[(n + 1) % count][:2])
        corner = Vector((x, y))
        incoming = corner - previous
        outgoing = following - corner
        cut = min(radius, incoming.length * 0.49, outgoing.length * 0.49)
        start = corner - incoming.normalized() * cut
        end = corner + outgoing.normalized() * cut
        for m in range(segments + 1):
            t = m / segments
            value = start * (1 - t) ** 2 + corner * 2 * t * (1 - t) + end * t * t
            result.append((value.x, value.y))
    return result


def subdivide(start, end, spacing):
    count = max(1, math.ceil((end - start).length / spacing))
    return [start.lerp(end, n / count) for n in range(count + 1)]


def bend(points, radius, segments=10, spacing=0.03):
    points = [Vector(point) for point in points]
    result = [points[0]]
    for n in range(1, len(points) - 1):
        corner = points[n]
        incoming = corner - points[n - 1]
        outgoing = points[n + 1] - corner
        cut = min(radius, incoming.length * 0.45, outgoing.length * 0.45)
        start = corner - incoming.normalized() * cut
        end = corner + outgoing.normalized() * cut
        result.extend(subdivide(result[-1], start, spacing)[1:])
        for m in range(1, segments + 1):
            t = m / segments
            result.append(start * (1 - t) ** 2 + corner * 2 * t * (1 - t) + end * t * t)
    result.extend(subdivide(result[-1], points[-1], spacing)[1:])
    return result


def basis(axis, reference=None):
    axis = Vector(axis).normalized()
    reference = Vector(reference) if reference is not None else (Vector((0, 0, 1)) if abs(axis.z) < 0.9 else Vector((0, 1, 0)))
    v = (reference - axis * reference.dot(axis)).normalized()
    return axis, v.cross(axis).normalized(), v


class Interior:
    def __init__(self, name, file_name):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.scene = bpy.context.scene
        self.scene.name = name
        self.collection = self.scene.collection
        self.file_name = file_name
        self.root = self.group(name.replace(' ', ''))

    def group(self, name, parent=None, action=None):
        value = bpy.data.objects.new(name, None)
        self.collection.objects.link(value)
        value.parent = parent
        if action is not None:
            value['interiorAction'] = action
        return value

    def mesh(self, name, vertices, faces, surface, parent=None, sharp=None, recalc=True):
        data = bpy.data.meshes.new(name)
        data.from_pydata([tuple(vertex) for vertex in vertices], [], faces)
        data.validate()
        if recalc:
            normals = bmesh.new()
            normals.from_mesh(data)
            bmesh.ops.recalc_face_normals(normals, faces=normals.faces)
            normals.to_mesh(data)
            normals.free()
        data.shade_smooth()
        if sharp is not None:
            data.set_sharp_from_angle(angle=math.radians(sharp))
        data.materials.append(surface)
        value = bpy.data.objects.new(name, data)
        self.collection.objects.link(value)
        value.parent = parent or self.root
        return value

    def lathe(self, name, profile, origin, axis, surface, parent=None, sides=64, closed=False, sharp=35, segments=6, reference=None):
        profile = fillet(profile, closed, segments)
        axis, u, v = basis(axis, reference)
        origin = Vector(origin)
        vertices = []
        rings = []
        for radius, height in profile:
            center = origin + axis * height
            if abs(radius) < 1e-6:
                rings.append([len(vertices)])
                vertices.append(center)
                continue
            rings.append(list(range(len(vertices), len(vertices) + sides)))
            for m in range(sides):
                angle = 2 * math.pi * m / sides
                vertices.append(center + radius * (math.cos(angle) * u + math.sin(angle) * v))
        faces = []
        pairs = list(zip(rings, rings[1:]))
        if closed:
            pairs.append((rings[-1], rings[0]))
        for a, b in pairs:
            if len(a) == 1 and len(b) == 1:
                continue
            for m in range(sides):
                if len(a) == 1:
                    faces.append((a[0], b[m], b[(m + 1) % sides]))
                elif len(b) == 1:
                    faces.append((a[m], a[(m + 1) % sides], b[0]))
                else:
                    faces.append((a[m], a[(m + 1) % sides], b[(m + 1) % sides], b[m]))
        if len(rings[0]) > 1 and not closed:
            faces.append(tuple(reversed(rings[0])))
        if len(rings[-1]) > 1 and not closed:
            faces.append(tuple(rings[-1]))
        return self.mesh(name, vertices, faces, surface, parent, sharp)

    def sweep(self, name, path, radius, surface, parent=None, sides=40, start_cap=None, end_cap=None):
        path = [Vector(point) for point in path]
        radii = radius if callable(radius) else (lambda _: radius)
        lengths = [0.0]
        for n in range(1, len(path)):
            lengths.append(lengths[-1] + (path[n] - path[n - 1]).length)
        tangents = [(path[min(n + 1, len(path) - 1)] - path[max(n - 1, 0)]).normalized() for n in range(len(path))]
        _, normal, _ = basis(tangents[0])
        rings = []
        for n, tangent in enumerate(tangents):
            normal = (normal - tangent * normal.dot(tangent)).normalized()
            rings.append((path[n], tangent, (normal, tangent.cross(normal)), radii(lengths[n] / lengths[-1])))

        def capped(index, direction, cap):
            point, tangent, frame, size = rings[index]
            cap = size if cap is None else min(cap, size)
            return [(point + tangent * direction * cap * math.sin(math.pi / 2 * m / 6), tangent, frame, size - cap + cap * math.cos(math.pi / 2 * m / 6)) for m in range(1, 7)]

        rings = list(reversed(capped(0, -1, start_cap))) + rings + capped(len(rings) - 1, 1, end_cap)
        vertices = []
        faces = []
        for n, (point, _, (normal, binormal), size) in enumerate(rings):
            for m in range(sides):
                angle = 2 * math.pi * m / sides
                vertices.append(point + max(size, 0.0) * (math.cos(angle) * normal + math.sin(angle) * binormal))
            if n > 0:
                for m in range(sides):
                    a = (n - 1) * sides + m
                    b = (n - 1) * sides + (m + 1) % sides
                    faces.append((a, b, b + sides, a + sides))
        faces.append(tuple(reversed(range(sides))))
        faces.append(tuple((len(rings) - 1) * sides + m for m in range(sides)))
        return self.mesh(name, vertices, faces, surface, parent)

    def extrude(self, name, outline, depth, origin, u, v, surface, parent=None, bevel=0.0012, meter=None):
        outline = fillet(outline, True, 4)
        u = Vector(u).normalized()
        v = (Vector(v) - u * Vector(v).dot(u)).normalized()
        count = len(outline)
        vertices = [Vector((x, y, 0)) for x, y in outline] + [Vector((x, y, depth)) for x, y in outline]
        faces = [tuple(reversed(range(count))), tuple(range(count, 2 * count))]
        for n in range(count):
            m = (n + 1) % count
            faces.append((n, m, m + count, n + count))
        value = self.mesh(name, vertices, faces, surface, parent, sharp=40)
        value.matrix_basis = Matrix((u, v, u.cross(v))).transposed().to_4x4()
        value.location = origin
        if meter is not None:
            value['interiorMeter'] = meter
        if bevel > 0:
            modifier = value.modifiers.new('Soft edges', 'BEVEL')
            modifier.width = bevel
            modifier.segments = 2
            modifier.limit_method = 'ANGLE'
            modifier.harden_normals = True
        return value

    def solid(self, name, rings, surface, parent=None, bevel=0.0, sharp=30):
        count = len(rings[0])
        vertices = [Vector(point) for ring in rings for point in ring]
        faces = [tuple(reversed(range(count))), tuple(range((len(rings) - 1) * count, len(rings) * count))]
        for n in range(len(rings) - 1):
            for m in range(count):
                a = n * count + m
                b = n * count + (m + 1) % count
                faces.append((a, b, b + count, a + count))
        value = self.mesh(name, vertices, faces, surface, parent, sharp=sharp)
        if bevel > 0:
            modifier = value.modifiers.new('Rounded edges', 'BEVEL')
            modifier.width = bevel
            modifier.segments = 5
            modifier.limit_method = 'ANGLE'
            modifier.harden_normals = True
        return value

    def carve(self, target, cutter):
        modifier = target.modifiers.new('Carved recess', 'BOOLEAN')
        modifier.operation = 'DIFFERENCE'
        modifier.solver = 'EXACT'
        modifier.object = cutter
        modifier.material_mode = 'TRANSFER'
        target.modifiers.move(len(target.modifiers) - 1, 0)
        with bpy.context.temp_override(object=target, active_object=target):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        bpy.data.objects.remove(cutter, do_unlink=True)

    def box(self, name, center, size, radius, surface, parent=None, rotation=(0, 0, 0)):
        data = bmesh.new()
        bmesh.ops.create_cube(data, size=1.0)
        for vertex in data.verts:
            vertex.co = Vector((vertex.co.x * size[0], vertex.co.y * size[1], vertex.co.z * size[2]))
        mesh = bpy.data.meshes.new(name)
        data.to_mesh(mesh)
        data.free()
        mesh.shade_smooth()
        mesh.materials.append(surface)
        value = bpy.data.objects.new(name, mesh)
        self.collection.objects.link(value)
        value.parent = parent or self.root
        value.location = center
        value.rotation_euler = rotation
        if radius > 0:
            modifier = value.modifiers.new('Rounded edges', 'BEVEL')
            modifier.width = radius
            modifier.segments = 6
            modifier.harden_normals = True
        return value

    def sphere_letter(self, name, rectangles, center, axis, up, radius, height, surface, parent=None, steps=6):
        axis, right, up = basis(axis, up)
        center = Vector(center)
        vertices = []
        faces = []
        size = steps + 1
        layer = size * size
        for left, bottom, right_edge, top in rectangles:
            offset = len(vertices)
            grid = [(left + (right_edge - left) * m / steps, bottom + (top - bottom) * n / steps) for n in range(size) for m in range(size)]
            for level in [radius * 0.9, radius + height]:
                for x, y in grid:
                    direction = (axis * math.sqrt(max(0.0, 1 - (x * x + y * y) / (radius * radius))) + right * x / radius + up * y / radius).normalized()
                    vertices.append(center + direction * level)
            for n in range(steps):
                for m in range(steps):
                    a = offset + n * size + m
                    faces.append((a, a + 1, a + size + 1, a + size))
                    faces.append((a + layer, a + layer + size, a + layer + size + 1, a + layer + 1))
            border = list(range(size)) + [m * size + steps for m in range(1, size)] + [steps * size + n for n in range(steps - 1, -1, -1)] + [m * size for m in range(steps - 1, 0, -1)]
            for n in range(len(border)):
                a = offset + border[n]
                b = offset + border[(n + 1) % len(border)]
                faces.append((a, b, b + layer, a + layer))
        return self.mesh(name, vertices, faces, surface, parent, sharp=50)

    def hand(self, name, action, grip_start, grip_end, outer, length, yellow, sleeve, side, arm, bar_radius, arm_radius):
        group = self.group(name, self.root, action)
        grip_start = Vector(grip_start)
        axis = (Vector(grip_end) - grip_start).normalized()
        up = (Vector((0, 0, 1)) - axis * axis.z).normalized()
        forward = up.cross(axis).normalized() * side
        center = grip_start + axis * (length / 2)
        inner = bar_radius * 1.22
        steps = 72
        opening = 70
        middle = 150
        edge = min(0.012, (outer - inner) * 0.35)
        profile = fillet([(inner, -length / 2, edge * 0.6), (outer, -length / 2, edge), (outer, length / 2, edge), (inner, length / 2, edge * 0.6)], True, 5)
        vertices = []
        faces = []
        for n in range(steps + 1):
            angle = math.radians(middle + opening / 2 + (360 - opening) * n / steps)
            radial = forward * math.sin(angle) + up * math.cos(angle)
            for radius, offset in profile:
                vertices.append(center + axis * offset + radial * radius)
        ring = len(profile)
        for n in range(steps):
            for m in range(ring):
                a = n * ring + m
                b = n * ring + (m + 1) % ring
                faces.append((a, b, b + ring, a + ring))
        faces.append(tuple(range(ring)))
        faces.append(tuple(reversed(range(steps * ring, (steps + 1) * ring))))
        hand = self.mesh(f'{name} curved hand', vertices, faces, yellow, group, sharp=50)
        bevel = hand.modifiers.new('Rounded slot edges', 'BEVEL')
        bevel.width = edge * 0.5
        bevel.segments = 4
        bevel.limit_method = 'ANGLE'
        bevel.harden_normals = True
        wrist_direction = (Vector(arm[0]) - center).normalized()
        wrist_start = center + wrist_direction * (outer * 0.75)
        wrist_length = (Vector(arm[0]) - wrist_start).length + arm_radius * 0.4
        wrist_radius = outer * 0.48
        self.lathe(f'{name} wrist', [(0.0, 0.0), (wrist_radius * 1.15, 0.0), (wrist_radius, wrist_length * 0.35, wrist_radius * 0.3), (wrist_radius, wrist_length), (0.0, wrist_length)], wrist_start, wrist_direction, yellow, group, sides=40)
        self.sweep(f'{name} sleeve', bend(arm, 0.08, spacing=0.02), lambda t: arm_radius * (1 + 0.25 * t), sleeve, group, start_cap=arm_radius * 0.3, sides=48)
        return group

    def camera(self):
        data = bpy.data.cameras.new('Rider preview')
        data.type = 'PERSP'
        data.lens_unit = 'FOV'
        data.sensor_fit = 'VERTICAL'
        data.angle = math.radians(50)
        data.clip_start = 0.01
        value = bpy.data.objects.new('Rider preview', data)
        self.collection.objects.link(value)
        value.rotation_euler = Vector((0, 1, 0)).to_track_quat('-Z', 'Y').to_euler()
        self.scene.camera = value

    def lights(self):
        for name, position, energy, size in [('Preview key', (-2.5, -0.5, 4), 380, 3), ('Preview fill', (3, -0.5, 1.2), 140, 4), ('Preview rim', (0, 4, 2), 200, 3)]:
            data = bpy.data.lights.new(name, 'AREA')
            data.energy = energy
            data.shape = 'DISK'
            data.size = size
            light = bpy.data.objects.new(name, data)
            self.collection.objects.link(light)
            light.location = position
            light.rotation_euler = (Vector((0, 1.3, -0.4)) - light.location).to_track_quat('-Z', 'Y').to_euler()
        world = bpy.data.worlds.new('Preview sky')
        self.scene.world = world
        nodes = world.node_tree.nodes
        links = world.node_tree.links
        background = nodes.get('Background')
        coordinates = nodes.new('ShaderNodeTexCoord')
        separate = nodes.new('ShaderNodeSeparateXYZ')
        ramp = nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = 0.42
        ramp.color_ramp.elements[0].color = (0.3, 0.26, 0.2, 1)
        ramp.color_ramp.elements[1].position = 0.56
        ramp.color_ramp.elements[1].color = (0.55, 0.75, 1.0, 1)
        scale = nodes.new('ShaderNodeMath')
        scale.operation = 'MULTIPLY_ADD'
        scale.inputs[1].default_value = 0.5
        scale.inputs[2].default_value = 0.5
        links.new(coordinates.outputs['Normal'], separate.inputs['Vector'])
        links.new(separate.outputs['Z'], scale.inputs[0])
        links.new(scale.outputs['Value'], ramp.inputs['Fac'])
        links.new(ramp.outputs['Color'], background.inputs['Color'])
        background.inputs['Strength'].default_value = 0.8

    def finish(self, samples=48):
        self.camera()
        scene = self.scene
        scene.render.resolution_x = 640
        scene.render.resolution_y = 480
        scene.render.resolution_percentage = 100
        scene.render.film_transparent = True
        draft = os.environ.get('INTERIOR_DRAFT')
        if draft is not None:
            scene.render.engine = 'BLENDER_WORKBENCH'
            scene.display.shading.light = 'STUDIO'
            scene.display.shading.color_type = 'MATERIAL'
            scene.display.render_aa = '8'
            scene.view_settings.view_transform = 'Standard'
            scene.render.resolution_x = int(os.environ.get('INTERIOR_DRAFT_WIDTH', '640'))
            scene.render.filepath = draft
            bpy.ops.render.render(write_still=True)
            return
        self.lights()
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = samples
        scene.cycles.use_denoising = True
        scene.view_settings.view_transform = 'Khronos PBR Neutral'
        for value in bpy.data.objects:
            value.select_set(False)
        for value in [self.root, *self.root.children_recursive]:
            value.select_set(True)
        bpy.context.view_layer.objects.active = self.root
        model_path = root_path / f'public/models/interiors/{self.file_name}.glb'
        model_path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=str(model_path), export_format='GLB', use_selection=True, use_active_scene=True, export_extras=True, export_apply=True, export_cameras=False, export_lights=False)
        save_version = bpy.context.preferences.filepaths.save_version
        try:
            bpy.context.preferences.filepaths.save_version = 0
            bpy.ops.wm.save_as_mainfile(filepath=str(root_path / f'assets/interiors/{self.file_name}.blend'))
        finally:
            bpy.context.preferences.filepaths.save_version = save_version
        for suffix, width in [('preview', 640), ('wide-preview', 853)]:
            scene.render.resolution_x = width
            scene.render.filepath = str(root_path / f'assets/interiors/{self.file_name}-{suffix}.png')
            bpy.ops.render.render(write_still=True)
