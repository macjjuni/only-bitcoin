import React, { memo } from "react";
import { KModal } from "kku-ui";
import LazyImage from "@/components/ui/lazyImage/LazyImage";
import "./FearAndGreedModal.scss";

interface ModalTypes {
  isOpen: boolean;
  onClose: () => void;
}

const FearAndGreedModal = ({ isOpen, onClose }: ModalTypes) => {

  return (
    <KModal isOpen={isOpen} onClose={onClose} overlayClosable className="fearAndGreed__modal">
      <KModal.Header>
        공포 & 탐욕 지수
      </KModal.Header>
      <KModal.Content>
        <LazyImage src={`https://alternative.me/crypto/fear-and-greed-index.png?${Date.now()}`}
                   alt="공포 & 탐욕 지수" className="fear-and-greed-index__image" />
      </KModal.Content>
    </KModal>
  );
};

export default memo(FearAndGreedModal);
