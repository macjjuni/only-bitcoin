import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { type UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { usePageAnimation } from "@/shared/hooks";
import getMemeImageData, { MemeResponseImageData } from "@/shared/api/memeImageData";
import { Gallery, TagList } from "@/widgets/pages/meme";
import { shuffleArray } from "@/shared/utils/common";
import "./MemePage.scss";


const MemePage = () => {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());
  const [selectedTag, setSelectedTag] = useState<string>("전체");
  const [images, setImages] = useState<MemeResponseImageData[]>([]);
  const tags = useMemo(() => [...new Set(images.flatMap(image => image.tags))], [images]);

  // endregion


  // region [Events]

  const  onChangeTag = useCallback((tag: string) => {
    setSelectedTag(tag);
  }, []);

  // endregion


  // region [Transactions]

  const getMemeImages = useCallback(async () => {

    const data = await getMemeImageData();

    setImages(shuffleArray(data));
  }, []);

  // endregion


  // region [Life Cycles]

  useLayoutEffect(() => {
    getMemeImages().then()
  }, []);

  // endregion


  return (
    <div className="meme__page">
      <TagList tags={tags} selected={selectedTag} onChangeTag={onChangeTag} />
      <Gallery images={images} selected={selectedTag} />
    </div>
  );
};

export default MemePage;
