import React, { memo, useMemo } from "react";
import { KModal } from "kku-ui";
import "./FeerAndGreedModal.scss";

interface ModalTypes {
  isOpen: boolean;
  onClose: () => void;
}


const FeerAndGreedModal = ({ isOpen, onClose }: ModalTypes) => {


  // region [Templates]

  const Content = useMemo(() => (
      <img src={`https://alternative.me/crypto/fear-and-greed-index.png?${Date.now()}`} width={300} height={270}
           alt="feer & greed index" className="fear-and-greed-index__image" />
  ), []);

  // endregion


  return (
    <KModal isOpen={isOpen} title="Feer And Greed Index" content={Content}
            onClose={onClose} overlayClosable className="feerAndGreed__modal" />
  );
};

export default memo(FeerAndGreedModal);