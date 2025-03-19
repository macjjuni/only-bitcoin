import { useCallback, useLayoutEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { usePageAnimation } from "@/shared/hooks";
import getMemeImageData, { MemeResponseImageData } from "@/shared/api/memeImageData";
import {Gallery} from "@/widgets/pages/meme";
import "./MemePage.scss";


const MemePage = () => {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());
  const [images, setImages] = useState<MemeResponseImageData[]>([]);

  // endregion


  // region [Transactions]

  const getMemeImages = useCallback(async () => {

    const data = await getMemeImageData();
    setImages(data);
  }, []);

  // endregion


  // region [Life Cycles]

  useLayoutEffect(() => {
    getMemeImages().then();
  }, []);

  // endregion

  return (
    <div className="meme__page">
      <Gallery images={images} />
    </div>
  );
};

export default MemePage;
