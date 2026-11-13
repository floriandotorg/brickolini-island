import math
import sys
from pathlib import Path
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from interior_kit import Interior, ball, bend, material, pixels, plastic, screen

interior = Interior('Bike interior', 'bike')
root = interior.root
red = plastic('Bike red plastic', '#c40000')
yellow = plastic('Rider yellow hands', '#f5c800', roughness=0.34)
sleeve = plastic('Rider white arms', '#ececec', roughness=0.38)
bell = plastic('Bell light grey', '#e2e2d6', roughness=0.32)
disc = plastic('Headlamp white', '#f2f2f2', roughness=0.28)
white = plastic('Information white ball', '#f6f6f6', roughness=0.18)
letter = plastic('Information red letter', '#e00010', roughness=0.22)
dark = material('Black lever', '#101010', roughness=0.3, coat=0.15)
outline = material('Information outline', '#303030', roughness=0.5)

bar_depth = 1.45
bar_radius = pixels(20, bar_depth)
center_left = screen(242, 350, bar_depth)
center_right = screen(398, 350, bar_depth)
side_left = screen(100, 367.5, 1.381)
side_right = screen(540, 367.5, 1.381)
reach_left = side_left - center_left
reach_right = side_right - center_right
bar = bend([center_left + reach_left * 1.62, center_left, center_right, center_right + reach_right * 1.62], 0.03)
interior.sweep('Continuous red handlebar', bar, bar_radius, red, start_cap=0.02, end_cap=0.02)

stem_depth = 1.475
stem_radius = pixels(22, stem_depth)
interior.sweep('Red steering stem', [screen(320, 350, stem_depth), Vector((0, stem_depth, -0.9))], stem_radius, red, start_cap=0.0, sides=48)
collar_top = screen(320, 426, stem_depth)
interior.lathe('Red stem collar', [(0.0, 0.0), (pixels(27, stem_depth), 0.0, 0.03), (pixels(24, stem_depth), -0.3), (0.0, -0.3)], collar_top, (0, 0, 1), red, sides=56)

lamp_depth = 1.62
lamp_radius = 50 / 320 * (4 / 3) * math.tan(math.radians(25)) * lamp_depth
lamp_normal = Vector((0, -math.cos(math.radians(5)), math.sin(math.radians(5))))
interior.lathe('Headlamp back', [(0.0, -0.06), (lamp_radius * 0.9, -0.06), (lamp_radius, -0.012, 0.012), (lamp_radius * 0.98, 0.0, 0.006), (lamp_radius * 0.86, 0.0, 0.004), (lamp_radius * 0.84, -0.006, 0.003), (lamp_radius * 0.6, -0.03, 0.03), (0.0, -0.036)], screen(320, 431, lamp_depth), lamp_normal, disc, sides=72)

horn = interior.group('Horn', root, 'horn')
bell_axis = Vector((0, -math.sin(math.radians(9)), math.cos(math.radians(9))))
bell_base = Vector((0, bar_depth, -0.262))
scale = pixels(1, bar_depth)
bell_profile = [(0.0, 0.0), (24 * scale, 0.0, 0.004), (24 * scale, 20 * scale, 0.002), (22 * scale, 21 * scale), (22 * scale, 22 * scale), (30 * scale, 23 * scale, 0.004), (31 * scale, 26 * scale, 0.006), (29 * scale, 29 * scale, 0.006), (19 * scale, 30 * scale), (19 * scale, 47 * scale, 0.005), (15 * scale, 48 * scale, 0.002), (14 * scale, 47 * scale), (0.0, 47 * scale)]
interior.lathe('Bell top button', bell_profile, bell_base, bell_axis, bell, horn, sides=72)
lever_start = bell_base + bell_axis * (40 * scale) + Vector((17 * scale, 0.004, 0))
lever_end = screen(388, 287, bar_depth - 0.01)
interior.sweep('Bell striker lever', [lever_start, lever_end], pixels(1.2, bar_depth), dark, horn, sides=12)
interior.lathe('Bell lever tip', ball(pixels(4.5, bar_depth), 12), lever_end + (lever_end - lever_start).normalized() * pixels(3, bar_depth), lever_end - lever_start, dark, horn, sides=24)

info = interior.group('Information', root, 'info')
ball_depth = 1.4
ball_radius = pixels(22.5, ball_depth)
ball_center = screen(320.5, 411, ball_depth)
ball_axis = (-ball_center).normalized()
interior.lathe('Information white face', ball(ball_radius, 32), ball_center, ball_axis, white, info, sides=64)
interior.lathe('Information outline ring', [(ball_radius * 0.99, -0.004), (ball_radius * 1.04, -0.004, 0.002), (ball_radius * 1.04, 0.002, 0.002), (ball_radius * 0.99, 0.002)], ball_center, ball_axis, outline, info, closed=True)
units = [(-0.13, -0.47, 0.23, 0.1), (-0.36, -0.09, -0.13, 0.1), (-0.3, -0.68, 0.39, -0.47)]
interior.sphere_letter('Information letter stem', [tuple(value * ball_radius for value in rectangle) for rectangle in units], ball_center, ball_axis, (0, 0, 1), ball_radius, ball_radius * 0.06, letter, info)
dot = (ball_axis * math.sqrt(1 - 0.376 ** 2) + Vector((0, 0, 1)) * 0.376).normalized()
interior.lathe('Information letter dot', ball(ball_radius * 0.2, 12), ball_center + dot * ball_radius * 0.98, dot, letter, info, sides=32)

hand_outer = pixels(31, 1.35)
arm_radius = 0.08
for side, name, center, reach in [(-1, 'LeftHand', center_left, reach_left), (1, 'RightHand', center_right, reach_right)]:
    grip_start = center + reach * 1.26
    grip_end = center + reach * 1.7
    middle = center + reach * 1.48
    cuff = screen(320 + side * 324, 390, 1.3)
    interior.hand(name, 'exit', grip_start, grip_end, hand_outer, (grip_end - grip_start).length, yellow, sleeve, side, [cuff, cuff + Vector((side * 0.04, -0.08, -0.1)), Vector((side * 1.0, 0.95, -0.9)), Vector((side * 1.02, 0.55, -1.2))], bar_radius, arm_radius)

interior.finish()
