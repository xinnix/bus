import bpy, math
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=64; scene.cycles.use_denoising=True
scene.render.resolution_x=500; scene.render.resolution_y=500
mat=bpy.data.materials.new('Glass'); mat.use_nodes=True
b=mat.node_tree.nodes['Principled BSDF']
b.inputs['Base Color'].default_value=(0.82,0.76,0.92,1)
b.inputs['Roughness'].default_value=0.02
b.inputs['Transmission Weight'].default_value=1.0
b.inputs['IOR'].default_value=1.49
try: mat.surface_render_method='DITHERED'
except: pass
bpy.ops.mesh.primitive_cube_add(size=0.08, location=(0,0,0.04)); cube=bpy.context.object; cube.data.materials.append(mat)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.02, location=(0,0,0.04)); sph=bpy.context.object
m2=bpy.data.materials.new('Red'); m2.use_nodes=True; m2.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(0.8,0.05,0.1,1); sph.data.materials.append(m2)
bpy.ops.object.light_add(type='AREA', location=(0.3,-0.4,0.5)); l=bpy.context.object; l.data.energy=30; l.data.size=0.5
bpy.ops.object.camera_add(location=(0.2,-0.3,0.15)); cam=bpy.context.object; cam.data.lens=50
d=Vector((0,0,0.04))-cam.location; cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler(); scene.camera=cam
scene.render.filepath='/Users/xinnix/code/bus/renders/test_glass.png'
bpy.ops.render.render(write_still=True)
