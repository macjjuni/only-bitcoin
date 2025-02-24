import { RefObject, useCallback } from "react";
import { clipboardUtil } from "kku-util";
import { toast } from "react-toastify";


export default function useCopyOnClick(refElement: RefObject<HTMLElement|null>) {

  const onClickCopy = useCallback(async() => {

    if (!refElement.current) { return; }

    const text = refElement.current?.dataset.copy  || '';
    const isCopySuccess = await clipboardUtil.copyToClipboard(text);

    if (isCopySuccess) { toast.success(`"${text}" 복사`); }
  }, []);


  return { onClickCopy };
}
