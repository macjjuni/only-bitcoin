import { useState } from "react";


const useQuizState = () => {

  // region [Hooks]
  const [isVisible, setIsVisible] = useState(false);
  const [quizData, setQuizData] = useState<{
    question: string;
    options: string[];
    answer: string;
  } | null>(null);
  // endregion

  return { isVisible, setIsVisible, quizData, setQuizData };
};

export default useQuizState;