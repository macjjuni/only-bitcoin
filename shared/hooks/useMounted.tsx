import { useState, useEffect } from 'react';

export default function useMounted() {

  // region [Hooks]
  const [isMount, setIsMount] = useState(false);
  // endregion

  // region [Privates]
  const setOnMount = () => {
    setIsMount(true)
  }
  // endregion

  // region [Life Cycles]
  useEffect(setOnMount, []);
  // endregion

  return isMount;
}