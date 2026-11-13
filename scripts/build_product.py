import bpy
import bmesh
import math
import os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets", "product")
RENDERS = os.path.join(ROOT, "renders")
os.makedirs(RENDERS, exist_ok=True)

# -----------------------------------------------------------------------------
# Clean scene
# -----------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.curves, bpy.data.lights, bpy.data.cameras):
    for block in list(datablocks):
        if block.users == 0:
            datablocks.remove(block)

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0

# Collections
product_col = bpy.data.collections.new("Product")
stage_col = bpy.data.collections.new("Stage")
scene.collection.children.link(product_col)
scene.collection.children.link(stage_col)

def move_to(obj, collection):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)

def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True

def bevel(obj, width=0.002, segments=3, angle=30):
    mod = obj.modifiers.new("Bevel", 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(angle)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)

def make_mat(name, color, metallic=0.0, roughness=0.4, transmission=0.0, ior=1.45, alpha=1.0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, alpha)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    if "IOR" in bsdf.inputs:
        bsdf.inputs["IOR"].default_value = ior
    t = bsdf.inputs.get("Transmission Weight") or bsdf.inputs.get("Transmission")
    if t is not None:
        t.default_value = transmission
    if emission is not None:
        e = bsdf.inputs.get("Emission Color")
        if e is not None:
            e.default_value = (*emission, 1.0)
        es = bsdf.inputs.get("Emission Strength")
        if es is not None:
            es.default_value = 1.0
    try:
        mat.use_screen_refraction = True
    except Exception:
        pass
    if alpha < 1.0:
        try:
            mat.surface_render_method = 'DITHERED'
        except Exception:
            try:
                mat.blend_method = 'BLEND'
            except Exception:
                pass
    return mat

# Materials
mat_clear = make_mat("Clear_Acrylic", (0.95, 0.93, 1.0), metallic=0.0, roughness=0.001, transmission=1.0, ior=1.41)
mat_purple_glass = make_mat("Purple_Glass", (0.50, 0.22, 0.68), metallic=0.0, roughness=0.03, transmission=0.85, ior=1.45)
mat_lid_glass = make_mat("Lid_Glass", (0.62, 0.38, 0.80), metallic=0.0, roughness=0.015, transmission=0.95, ior=1.43)
mat_silver = make_mat("Silver_Band", (0.78, 0.78, 0.80), metallic=1.0, roughness=0.18)
mat_gold = make_mat("Gold_Applicator", (0.86, 0.64, 0.30), metallic=1.0, roughness=0.22)
mat_cream = make_mat("Cream", (1.0, 0.96, 0.84), metallic=0.0, roughness=0.40)
mat_white = make_mat("Flower_White", (0.96, 0.94, 0.90), metallic=0.0, roughness=0.42)
mat_yellow = make_mat("Flower_Center", (0.95, 0.78, 0.38), metallic=0.0, roughness=0.5)

# -----------------------------------------------------------------------------
# Outer clear acrylic square tub
# -----------------------------------------------------------------------------
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.020))
outer = bpy.context.object
outer.name = "Outer_Clear_Tub"
outer.scale = (0.085, 0.085, 0.040)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.024))
cutter = bpy.context.object
cutter.name = "Tub_Cutter"
cutter.scale = (0.081, 0.081, 0.044)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

mod = outer.modifiers.new("Hollow", 'BOOLEAN')
mod.operation = 'DIFFERENCE'
mod.solver = 'EXACT'
mod.object = cutter
bpy.context.view_layer.objects.active = outer
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cutter, do_unlink=True)
bevel(outer, width=0.0022, segments=3)
outer.data.materials.append(mat_clear)
move_to(outer, product_col)

# -----------------------------------------------------------------------------
# Inner purple jar (hollow cup)
# -----------------------------------------------------------------------------
bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=0.031, radius2=0.0335, depth=0.052, location=(0, 0, 0.032))
jar = bpy.context.object
jar.name = "Inner_Purple_Jar"
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.0285, depth=0.055, location=(0, 0, 0.0365))
jar_cutter = bpy.context.object
jar_cutter.name = "Jar_Cutter"
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

mod = jar.modifiers.new("Hollow", 'BOOLEAN')
mod.operation = 'DIFFERENCE'
mod.solver = 'EXACT'
mod.object = jar_cutter
bpy.context.view_layer.objects.active = jar
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(jar_cutter, do_unlink=True)
bevel(jar, width=0.0018, segments=3)
smooth(jar)
jar.data.materials.append(mat_purple_glass)
move_to(jar, product_col)

# Cream fill inside jar
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.028, depth=0.044, location=(0, 0, 0.031))
cream = bpy.context.object
cream.name = "Cream_Fill"
bevel(cream, width=0.0015, segments=2)
smooth(cream)
cream.data.materials.append(mat_cream)
move_to(cream, product_col)

# Silver band around jar top
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.0355, depth=0.008, location=(0, 0, 0.055))
band = bpy.context.object
band.name = "Silver_Band"
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.0335, depth=0.010, location=(0, 0, 0.055))
band_cut = bpy.context.object
band_cut.name = "Band_Cutter"
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
mod = band.modifiers.new("Hollow", 'BOOLEAN')
mod.operation = 'DIFFERENCE'
mod.solver = 'EXACT'
mod.object = band_cut
bpy.context.view_layer.objects.active = band
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(band_cut, do_unlink=True)
bevel(band, width=0.001, segments=2)
smooth(band)
band.data.materials.append(mat_silver)
move_to(band, product_col)

# Silver rim around the tub opening
bpy.ops.mesh.primitive_torus_add(major_radius=0.0345, minor_radius=0.0022, major_segments=96, minor_segments=16, location=(0, 0, 0.0405))
rim = bpy.context.object
rim.name = "Tub_Silver_Rim"
smooth(rim)
rim.data.materials.append(mat_silver)
move_to(rim, product_col)

# Lid dome: purple glass outer + white inner cap
bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.0335, location=(0, 0, 0.060))
lid = bpy.context.object
lid.name = "Lid_Dome"
lid.scale = (1.0, 1.0, 0.60)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
smooth(lid)
lid.data.materials.append(mat_lid_glass)
move_to(lid, product_col)

bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.0305, depth=0.003, location=(0, 0, 0.0605))
lid_inner = bpy.context.object
lid_inner.name = "Lid_Inner_Disk"
bevel(lid_inner, width=0.0008, segments=2)
smooth(lid_inner)
lid_inner.data.materials.append(mat_cream)
move_to(lid_inner, product_col)

# -----------------------------------------------------------------------------
# Product label on the front face of the clear tub
# -----------------------------------------------------------------------------
def make_label_plane():
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -0.0427, 0.020))
    obj = bpy.context.object
    obj.name = "Front_Label"
    obj.scale = (0.060, 0.030, 1.0)
    obj.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    mat = bpy.data.materials.new("Label_Text")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
    bsdf.inputs["Roughness"].default_value = 0.35
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(ASSETS, "label_texture.png"))
    tex.image.colorspace_settings.name = 'sRGB'
    tex.interpolation = 'Cubic'
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    try:
        mat.surface_render_method = 'DITHERED'
    except Exception:
        try:
            mat.blend_method = 'BLEND'
        except Exception:
            pass
    obj.data.materials.append(mat)
    obj.visible_shadow = False
    return obj

label = make_label_plane()
move_to(label, product_col)

# -----------------------------------------------------------------------------
# Gold applicator / spatula
# -----------------------------------------------------------------------------
def create_spatula():
    # Profile in XZ plane: width at each z, from tip (bottom) to handle (top)
    profile = [
        (0.0010, 0.000),
        (0.0050, 0.012),
        (0.0100, 0.026),
        (0.0160, 0.042),
        (0.0190, 0.058),
        (0.0160, 0.074),
        (0.0100, 0.087),
        (0.0045, 0.095),
    ]
    verts = []
    for w, z in profile:
        verts.append((-w, 0, z))
    for w, z in reversed(profile):
        verts.append((w, 0, z))
    mesh = bpy.data.meshes.new("Spatula_Blade")
    mesh.from_pydata(verts, [], [list(range(len(verts)))])
    mesh.update()
    obj = bpy.data.objects.new("Gold_Spatula", mesh)
    product_col.objects.link(obj)
    mod = obj.modifiers.new("Solidify", 'SOLIDIFY')
    mod.thickness = 0.003
    mod.offset = 0.0
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # bevel
    bevel(obj, width=0.0012, segments=2)
    smooth(obj)
    obj.data.materials.append(mat_gold)
    obj.rotation_euler = (math.radians(4), math.radians(-10), math.radians(-12))
    obj.location = (0.098, -0.004, 0.0)
    return obj

spatula = create_spatula()

# ball handle at top
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.0062, location=(0.098, -0.004, 0.0975))
ball = bpy.context.object
ball.name = "Spatula_Ball_Handle"
smooth(ball)
ball.data.materials.append(mat_gold)
move_to(ball, product_col)

# -----------------------------------------------------------------------------
# Stylized gardenia flower
# -----------------------------------------------------------------------------
def make_petal(name, length=0.045, width=0.018, curl=0.010):
    nu, nv = 12, 10
    verts = []
    faces = []
    for i in range(nu + 1):
        u = i / nu
        for j in range(nv + 1):
            v = -1.0 + 2.0 * j / nv
            x = v * width * math.sin(math.pi * u) * (0.85 + 0.15 * (1 - u))
            y = u * length
            z = curl * math.sin(math.pi * u) * (1.0 - 0.45 * v * v) + 0.35 * curl * (v * v)
            verts.append((x, y, z))
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            b = a + 1
            c = a + (nv + 1)
            d = c + 1
            faces.append((a, b, d, c))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    product_col.objects.link(obj)
    mod = obj.modifiers.new("Solidify", 'SOLIDIFY')
    mod.thickness = 0.0007
    mod.offset = 0.0
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bevel(obj, width=0.0004, segments=1)
    smooth(obj)
    obj.data.materials.append(mat_white)
    return obj

def make_flower(location=(-0.066, -0.058, 0.0)):
    flower_parts = []
    layers = [
        (8, 1.00, 0.0, 12),
        (7, 0.78, 22.5, 26),
        (5, 0.55, 11.0, 44),
    ]
    for li, (count, scale, offset, tilt) in enumerate(layers):
        for k in range(count):
            p = make_petal(f"Petal_{li}_{k}", length=0.044 * scale, width=0.017 * scale, curl=0.009 * scale)
            p.location = (0, 0, 0.003 * li)
            p.rotation_euler = (math.radians(tilt), 0, math.radians(offset + k * 360.0 / count))
            flower_parts.append(p)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=0.006, location=(0, 0, 0.010))
    center = bpy.context.object
    center.name = "Flower_Center"
    smooth(center)
    center.data.materials.append(mat_yellow)
    flower_parts.append(center)
    for p in flower_parts:
        p.location.x += location[0]
        p.location.y += location[1]
        p.location.z += location[2]
        p.rotation_euler.z += math.radians(18)
    return flower_parts

flower = make_flower()

# Props are included in the .blend but hidden in the clean hero render
for obj in [spatula, ball] + flower:
    obj.hide_render = True

# -----------------------------------------------------------------------------
# Stage: floor + backdrop
# -----------------------------------------------------------------------------
def make_gradient_mat(name, bottom, top):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for n in list(nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nodes.remove(n)
    out = nodes.get("Material Output")
    tex = nodes.new("ShaderNodeTexCoord")
    sep = nodes.new("ShaderNodeSeparateXYZ")
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (*bottom, 1.0)
    ramp.color_ramp.elements[1].position = 0.55
    ramp.color_ramp.elements[1].color = (*top, 1.0)
    # add a third stop for a soft upper glow
    e = ramp.color_ramp.elements.new(0.85)
    e.color = (*[min(1.0, c * 1.25) for c in top], 1.0)
    links.new(tex.outputs["Generated"], sep.inputs["Vector"])
    links.new(sep.outputs["Z"], ramp.inputs["Fac"])
    em = nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 0.55
    links.new(ramp.outputs["Color"], em.inputs["Color"])
    links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat

def make_cyclorama():
    # Profile in (y, z): floor, curved cove, vertical wall
    profile = [(-2.0, 0.0), (-1.2, 0.0), (-0.6, 0.0), (0.0, 0.0), (0.35, 0.0)]
    radius = 0.55
    for i in range(1, 25):
        a = (math.pi / 2) * i / 24
        profile.append((0.35 + radius * math.sin(a), radius * (1 - math.cos(a))))
    profile += [(0.90, 0.9), (0.90, 1.9)]
    xs = (-2.2, 2.2)
    verts = []
    for x in xs:
        for y, z in profile:
            verts.append((x, y, z))
    n = len(profile)
    faces = []
    for i in range(n - 1):
        a = i
        b = i + 1
        c = i + n
        d = i + 1 + n
        faces.append((a, b, d, c))
    mesh = bpy.data.meshes.new("Cyclorama")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new("Cyclorama", mesh)
    stage_col.objects.link(obj)
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj.data.materials.append(make_gradient_mat("Cyclorama_Gradient", (0.10, 0.025, 0.13), (0.45, 0.22, 0.42)))
    return obj

cyclo = make_cyclorama()

# World
world = bpy.data.worlds.new("World") if not bpy.data.worlds else bpy.data.worlds[0]
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.035, 0.008, 0.05, 1.0)
bg.inputs["Strength"].default_value = 0.04

# -----------------------------------------------------------------------------
# Lights
# -----------------------------------------------------------------------------
def add_area(name, location, target, size, energy, color=(1,1,1)):
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.name = name
    light.data.size = size
    light.data.energy = energy
    light.data.color = color
    # point at target
    direction = Vector(target) - Vector(location)
    light.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    move_to(light, stage_col)
    return light

add_area("Key_Softbox", (-0.38, -0.48, 0.55), (0, 0, 0.045), 0.55, 55, (1.0, 0.93, 0.88))
add_area("Fill", (0.42, -0.30, 0.28), (0, 0, 0.045), 0.45, 18, (0.80, 0.78, 1.0))
add_area("Rim", (0.10, 0.38, 0.42), (0, 0, 0.045), 0.30, 35, (0.78, 0.52, 1.0))
add_area("Top", (0.00, -0.08, 0.68), (0, 0, 0.045), 0.45, 22, (1.0, 0.95, 0.95))

# -----------------------------------------------------------------------------
# Camera
# -----------------------------------------------------------------------------
bpy.ops.object.camera_add(location=(0.155, -0.36, 0.155))
cam = bpy.context.object
cam.name = "Product_Camera"
cam.data.lens = 85
cam.data.sensor_width = 36
direction = Vector((0, 0, 0.046)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
scene.camera = cam
move_to(cam, stage_col)

# -----------------------------------------------------------------------------
# Render settings
# -----------------------------------------------------------------------------
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = int(os.environ.get('SAMPLES', '64'))
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.cycles.max_bounces = 12
scene.cycles.transmission_bounces = 12
scene.cycles.transparent_max_bounces = 12
scene.render.resolution_x = int(os.environ.get('RES_X', '900'))
scene.render.resolution_y = int(os.environ.get('RES_Y', '1200'))
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = os.path.join(RENDERS, "product_preview.png")
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = 0.0
try:
    scene.view_settings.look = 'AgX - Medium High Contrast'
except Exception as e:
    print("Look not set:", e)

# Fix material slots (boolean ops can create an empty slot)
for obj in product_col.objects:
    if obj.type == 'MESH':
        mats = [m for m in obj.data.materials if m is not None]
        obj.data.materials.clear()
        for m in mats:
            obj.data.materials.append(m)
        if mats:
            for p in obj.data.polygons:
                p.material_index = 0

# Save blend
blend_path = os.path.join(ROOT, "product_model.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)

# Export GLB of product objects
bpy.ops.object.select_all(action='DESELECT')
for obj in product_col.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = jar
glb_path = os.path.join(ROOT, "product_model.glb")
bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', use_selection=True)

print("SAVED", blend_path, glb_path)
print("RENDERING", scene.render.filepath)
bpy.ops.render.render(write_still=True)
print("DONE")
