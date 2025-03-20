import React, { memo, useMemo } from "react";
import { KModal } from "kku-ui";
import "./FearAndGreedModal.scss";
import { LazyImage } from "@/widgets";

interface ModalTypes {
  isOpen: boolean;
  onClose: () => void;
}


const FearAndGreedModal = ({ isOpen, onClose }: ModalTypes) => {


  // region [Templates]

  const Content = useMemo(() => (
    <LazyImage src={`https://alternative.me/crypto/fear-and-greed-index.png?${Date.now()}`}
               alt="공포 & 탐욕 지수" className="fear-and-greed-index__image"/>
  ), []);

  // endregion


  return (
    <KModal isOpen={isOpen} title="공포 & 탐욕 지수" content={Content}
            onClose={onClose} overlayClosable className="feerAndGreed__modal" />
  );
};

export default memo(FearAndGreedModal);
