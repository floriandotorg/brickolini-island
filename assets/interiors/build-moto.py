import math
import sys
from pathlib import Path
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from interior_kit import Interior, ball, bend, material, pixels, plastic, screen

interior = Interior('Motorcycle interior', 'moto')
root = interior.root
black = material('Motorcycle gloss black', '#050608', roughness=0.12, coat=1.0, coat_roughness=0.03)
riser = plastic('Motorcycle riser grey', '#a8a8a8', roughness=0.35)
console = plastic('Motorcycle console white', '#f2f2f2', roughness=0.3)
recess = plastic('Motorcycle console recess', '#9aa2aa', roughness=0.4)
cap = plastic('Steering cap white', '#f6f6f6', roughness=0.22)
pod = plastic('Gauge grey', '#8a8a8a', roughness=0.3)
yellow = plastic('Rider yellow hands', '#f5c800', roughness=0.34)
sleeve = plastic('Rider white arms', '#ececec', roughness=0.38)
white = plastic('Information white ball', '#f6f6f6', roughness=0.18)
letter = plastic('Information red letter', '#e00010', roughness=0.22)
outline = material('Information outline', '#303030', roughness=0.5)
slot = material('Gauge black', '#050505', roughness=0.5)
fuel_fill = material('Fuel gauge yellow', '#ffce00', roughness=0.4, emission=0.4)
speed_fill = material('Speed gauge red', '#bd0000', roughness=0.4, emission=0.4)
pump = plastic('Fuel pump blue', '#9cb0e6', roughness=0.3)
pump_outline = plastic('Fuel pump outline', '#3c4c9c', roughness=0.35)
pump_window = plastic('Fuel pump window', '#e8eeff', roughness=0.2)
puff = plastic('Speed puff white', '#f4f4f4', roughness=0.3)
car = plastic('Speed car red', '#d00000', roughness=0.3)

bar_radius = pixels(20, 1.45)
center_depth = 1.38
side_depth = 1.26
center_left = screen(248, 314, center_depth)
center_right = screen(392, 314, center_depth)
reach_left = screen(100, 329, side_depth) - center_left
reach_right = screen(540, 329.5, side_depth) - center_right
bar = bend([center_left + reach_left * 1.62, center_left, center_right, center_right + reach_right * 1.62], 0.03)
interior.sweep('Black handlebar', bar, bar_radius, black, start_cap=0.02, end_cap=0.02)

top = -0.336
interior.box('Riser block', (0, 1.43, (top + center_left.z) / 2), (0.283, 0.14, center_left.z - top), 0.012, riser)

crease_depth = -top / ((400 - 240) / 240 * math.tan(math.radians(25)))
slope = math.tan(math.radians(16.6))


def face_height(depth):
    return top - (crease_depth - depth) * slope


def ring(depth, half, height):
    return [(-half, depth, height - 0.3), (half, depth, height - 0.3), (half, depth, height), (-half, depth, height)]


console_body = interior.solid('Console', [ring(1.36, 0.229, top), ring(crease_depth, 0.247, top), ring(0.88, 0.212, face_height(0.88)), ring(0.6, 0.17, face_height(0.6))], console, bevel=0.022)
cutter = interior.solid('Console recess cutter', [ring(crease_depth, 0.068, top + 0.265), ring(0.5, 0.068, face_height(0.5) + 0.265)], recess)
interior.carve(console_body, cutter)

cap_depth = 1.2366
cap_radius = 38 / 320 * (4 / 3) * math.tan(math.radians(25)) * cap_depth
interior.lathe('Steering cap', [(0.0, 0.0), (cap_radius, 0.0), (cap_radius, 0.0534, 0.006), (0.0, 0.0534)], (0, cap_depth, top), (0, 0, 1), cap, sides=72)

normal = Vector((0, -math.sin(math.radians(16.6)), math.cos(math.radians(16.6))))
across = Vector((1, 0, 0))
along = normal.cross(across).normalized()

info = interior.group('Information', root, 'info')
ball_depth = 1.0
ball_radius = pixels(27, ball_depth)
ball_center = screen(319.5, 431, ball_depth)
ball_axis = (-ball_center).normalized()
interior.lathe('Information white face', ball(ball_radius, 32), ball_center, ball_axis, white, info, sides=64)
interior.lathe('Information outline ring', [(ball_radius * 0.99, -0.004), (ball_radius * 1.04, -0.004, 0.002), (ball_radius * 1.04, 0.002, 0.002), (ball_radius * 0.99, 0.002)], ball_center, ball_axis, outline, info, closed=True)
units = [(-0.13, -0.47, 0.23, 0.1), (-0.36, -0.09, -0.13, 0.1), (-0.3, -0.68, 0.39, -0.47)]
interior.sphere_letter('Information letter stem', [tuple(value * ball_radius for value in rectangle) for rectangle in units], ball_center, ball_axis, (0, 0, 1), ball_radius, ball_radius * 0.06, letter, info)
dot = (ball_axis * math.sqrt(1 - 0.376 ** 2) + Vector((0, 0, 1)) * 0.376).normalized()
interior.lathe('Information letter dot', ball(ball_radius * 0.2, 12), ball_center + dot * ball_radius * 0.98, dot, letter, info, sides=32)

pod_depth = 0.932
pod_radius = pixels(30.5, pod_depth)
pod_height = 0.018
unit = 0.6218 * pod_depth / 320


def on_pod(center, u, v, lift):
    return center + across * (u * unit) + along * (v * unit / 0.62) + normal * (pod_height + lift)


for label, x in [('Fuel', -0.1413), ('Speed', 0.1376)]:
    base = Vector((x, pod_depth, face_height(pod_depth)))
    interior.lathe(f'{label} gauge pod', [(0.0, -0.03), (pod_radius, -0.03), (pod_radius, pod_height, 0.004), (0.0, pod_height)], base, normal, pod, sides=72)
    if label == 'Fuel':
        fuel_center = base
    else:
        speed_center = base

interior.extrude('Fuel gauge slot', [(-14 * unit / 0.62, -4 * unit, 0.0015), (14 * unit / 0.62, -4 * unit, 0.0015), (14 * unit / 0.62, 4 * unit, 0.0015), (-14 * unit / 0.62, 4 * unit, 0.0015)], 0.0015, on_pod(fuel_center, 17, -2.5, 0), (along * 1 + across * 0.1).normalized(), across * -1, slot, bevel=0)
interior.extrude('Fuel gauge fill', [(-14 * unit / 0.62, -4 * unit, 0.0015), (14 * unit / 0.62, -4 * unit, 0.0015), (14 * unit / 0.62, 4 * unit, 0.0015), (-14 * unit / 0.62, 4 * unit, 0.0015)], 0.003, on_pod(fuel_center, 17, -2.5, 0), (along * 1 + across * 0.1).normalized(), across * -1, fuel_fill, bevel=0, meter='fuel')

pump_origin = on_pod(fuel_center, -10.5, -2.5, 0)
pump_v = unit / 0.62
interior.extrude('Fuel pump outline', [(-11 * unit, -15 * pump_v, 0.002), (12 * unit, -15 * pump_v, 0.002), (12 * unit, 15 * pump_v, 0.003), (-11 * unit, 15 * pump_v, 0.003)], 0.0015, pump_origin, across, along, pump_outline, bevel=0)
interior.extrude('Fuel pump body', [(-9.5 * unit, -13.5 * pump_v, 0.002), (10.5 * unit, -13.5 * pump_v, 0.002), (10.5 * unit, 13.5 * pump_v, 0.003), (-9.5 * unit, 13.5 * pump_v, 0.003)], 0.0025, pump_origin, across, along, pump, bevel=0)
interior.extrude('Fuel pump window', [(-6 * unit, 6 * pump_v, 0.001), (7 * unit, 6 * pump_v, 0.001), (7 * unit, 10 * pump_v, 0.001), (-6 * unit, 10 * pump_v, 0.001)], 0.0035, pump_origin, across, along, pump_window, bevel=0)
for n, offset in enumerate([-4, 0, 4]):
    interior.extrude(f'Fuel pump stripe {n}', [(offset * unit - 0.8 * unit, -10 * pump_v, 0.0), (offset * unit + 0.8 * unit, -10 * pump_v, 0.0), (offset * unit + 0.8 * unit, 3 * pump_v, 0.0), (offset * unit - 0.8 * unit, 3 * pump_v, 0.0)], 0.0035, pump_origin, across, along, pump_outline, bevel=0)
hose = [pump_origin + across * (-9 * unit) + along * (10 * pump_v), pump_origin + across * (-15 * unit) + along * (6 * pump_v), pump_origin + across * (-15 * unit) + along * (-4 * pump_v), pump_origin + across * (-12 * unit) + along * (-8 * pump_v)]
interior.sweep('Fuel pump hose', bend([point + normal * 0.002 for point in hose], 0.006, spacing=0.003), 1.6 * unit, pump_outline, sides=10)

arrow = [(-26 * unit, -2.2 * pump_v, 0.0005), (16 * unit, -2.2 * pump_v, 0.0), (16 * unit, -5 * pump_v, 0.0005), (26 * unit, 0.0, 0.0005), (16 * unit, 5 * pump_v, 0.0005), (16 * unit, 2.2 * pump_v, 0.0), (-26 * unit, 2.2 * pump_v, 0.0005)]
arrow_origin = on_pod(speed_center, 2, -9.5, 0)
interior.extrude('Speed gauge slot', arrow, 0.0015, arrow_origin, across, along, slot, bevel=0)
interior.extrude('Speed gauge fill', arrow, 0.003, arrow_origin, across, along, speed_fill, bevel=0, meter='speed')
car_origin = on_pod(speed_center, 6, 6, 0)
interior.extrude('Speed car', [(-8 * unit, -5 * pump_v, 0.001), (14 * unit, -6 * pump_v, 0.001), (16 * unit, 2 * pump_v, 0.001), (6 * unit, 3 * pump_v, 0.001), (2 * unit, 7 * pump_v, 0.001), (-6 * unit, 6 * pump_v, 0.001)], 0.0035, car_origin, across, along, car)
for n, (u, v, length, width) in enumerate([(-12, 7, 20, 6), (-17, 3, 16, 5), (-5, 10, 12, 5)]):
    start = on_pod(speed_center, u - length / 2, v, 0.001)
    interior.sweep(f'Speed puff {n}', [start, start + across * (length * unit)], lambda t, w=width: w * unit * math.sin(math.pi * (0.15 + 0.7 * t)), puff, sides=16)

hand_outer = pixels(36, 1.24)
for side, name, center, reach in [(-1, 'LeftHand', center_left, reach_left), (1, 'RightHand', center_right, reach_right)]:
    grip_start = center + reach * 1.18
    grip_end = center + reach * 1.66
    cuff = screen(320 + side * 318, 334, 1.2)
    interior.hand(name, 'exit', grip_start, grip_end, hand_outer, (grip_end - grip_start).length, yellow, sleeve, side, [cuff, cuff + Vector((side * 0.04, -0.08, -0.1)), Vector((side * 1.0, 0.9, -0.85)), Vector((side * 1.02, 0.5, -1.15))], bar_radius, 0.08)

interior.finish()
