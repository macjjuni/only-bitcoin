import { useCallback, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { type UsePageAnimation } from "@/shared/hooks/usePageAnimation";
import { usePageAnimation } from "@/shared/hooks";
import { Gallery, TagList } from "@/pages/memePage/components";
import { useMemeImages } from "@/shared/api";
import "./MemePage.scss";


const MemePage = () => {

  // region [Hooks]

  usePageAnimation(useOutletContext<UsePageAnimation>());
  const { images } = useMemeImages();

  const [selectedTag, setSelectedTag] = useState<string>("전체");
  const tags = useMemo(() => [...new Set(images.flatMap(image => image.tags))], [images]);

  // endregion


  // region [Events]

  const onChangeTag = useCallback((tag: string) => {
    setSelectedTag(tag);
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
