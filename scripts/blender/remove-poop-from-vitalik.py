"""
빚탈릭 티셔츠 등판의 똥 아이콘을 지움.

아이콘은 텍스처가 아니라 등판에 따로 붙은 메시 6개라 오브젝트만 지우면 됨. 그
자리는 티셔츠 등판(플레이어 색)이 그대로 보임. 가슴 이더리움 다이아몬드는 남김.

실행 — 원본을 고쳐 저장한 뒤 평소처럼 굽는다
  blender --background assets/avatars/voxel-vitalik.blend \
      --python scripts/blender/remove-poop-from-vitalik.py
  blender --background assets/avatars/voxel-vitalik.blend \
      --python scripts/blender/process-voxel-character.py -- public/models vitalik \
      Purple_Tshirt_connected_torso,Purple_short_sleeve_L,Purple_short_sleeve_R,Purple_Tshirt_collar \
      --height=1.8

두 번 돌려도 안전함. 지울 게 없으면 저장하지 않음.
"""
import bpy

POOP_PREFIX = "Poop_back_"

poop_objects = [obj for obj in bpy.data.objects if obj.name.startswith(POOP_PREFIX)]

if not poop_objects:
    print("[info] 똥 아이콘이 이미 없음. 건너뜀.")
else:
    names = sorted(obj.name for obj in poop_objects)
    for obj in poop_objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.wm.save_mainfile()
    print(f"[export] 똥 아이콘 {len(names)}개 지움: {', '.join(names)}")
