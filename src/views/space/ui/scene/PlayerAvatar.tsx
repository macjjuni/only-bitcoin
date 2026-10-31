"use client";

import { memo, type ReactNode, useEffect, useMemo } from "react";
import { resolveAvatarColor, SPACE_AVATAR } from "@/entities/space";
import { createShadowBlobTexture } from "@/views/space/lib/shadowBlobTexture";

/** 그림자 블롭이 바닥 격자와 겹쳐 지저분해지지 않도록 살짝 띄운다. */
const SHADOW_LIFT_Y = 0.02;

interface PlayerAvatarProps {
  colorIndex: number;
  hasRealtimeShadows: boolean;
}

function PlayerAvatar({ colorIndex, hasRealtimeShadows }: PlayerAvatarProps): ReactNode {
  // region [Hooks]
  const shadowTexture = useMemo(() => createShadowBlobTexture(), []);
  const avatarColor = useMemo(() => resolveAvatarColor(colorIndex), [colorIndex]);
  // endregion

  // region [Life Cycles]
  useEffect(() => {
    return () => {
      shadowTexture.dispose();
    };
  }, [shadowTexture]);
  // endregion

  return (
    <>
      <mesh position={[0, SPACE_AVATAR.bodyCenterY, 0]} castShadow={hasRealtimeShadows}>
        <capsuleGeometry
          args={[
            SPACE_AVATAR.bodyRadius,
            SPACE_AVATAR.bodyLength,
            SPACE_AVATAR.bodyCapSegments,
            SPACE_AVATAR.bodyRadialSegments,
          ]}
        />
        <meshStandardMaterial color={avatarColor} roughness={0.45} metalness={0.2} />
      </mesh>

      <mesh position={[0, SPACE_AVATAR.headCenterY, 0]} castShadow={hasRealtimeShadows}>
        <sphereGeometry
          args={[
            SPACE_AVATAR.headRadius,
            SPACE_AVATAR.headWidthSegments,
            SPACE_AVATAR.headHeightSegments,
          ]}
        />
        <meshStandardMaterial color={avatarColor} roughness={0.35} metalness={0.25} />
      </mesh>

      {/* 어느 방향을 보는지 알려주는 표식. 전방은 -Z 다. */}
      <mesh position={[0, SPACE_AVATAR.headCenterY, -SPACE_AVATAR.headRadius]}>
        <sphereGeometry args={[0.07, 6, 5]} />
        <meshStandardMaterial color="#06080e" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SHADOW_LIFT_Y, 0]}>
        <planeGeometry args={[SPACE_AVATAR.shadowRadius * 2, SPACE_AVATAR.shadowRadius * 2]} />
        <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

const MemoizedPlayerAvatar = memo(PlayerAvatar);
MemoizedPlayerAvatar.displayName = "PlayerAvatar";

export default MemoizedPlayerAvatar;
