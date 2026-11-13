import bpy, math, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.resolution_x = 600
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100

cam = scene.camera
target = Vector((0, 0, 0.046))
views = [
    ("view_1", (0.155, -0.36, 0.155)),
    ("view_2", (0.0, -0.40, 0.115)),
    ("view_3", (-0.18, -0.33, 0.145)),
    ("view_4", (0.18, -0.26, 0.30)),
]
for name, loc in views:
    cam.location = loc
    direction = target - Vector(loc)
    cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(ROOT, "renders", name + ".png")
    bpy.ops.render.render(write_still=True)
    print("rendered", name)
