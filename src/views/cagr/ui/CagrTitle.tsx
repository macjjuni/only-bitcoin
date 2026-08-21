/**
 * 페이지 타이틀. `btc2apartment` 의 타이틀과 같은 2단 구성임.
 *
 * `Btc2ApartmentTitle` 과 달리 `"use client"` 를 붙이지 않음. 정적 마크업뿐이라
 * 클라이언트 경계를 만들 이유가 없고, 이 페이지는 자바스크립트를 한 줄도 안 보내는 게
 * 특징이라 여기서 경계가 생기면 그게 깨짐.
 *
 * 태그도 `h2` 가 아니라 `h1` 임. 이 화면에서 가장 위에 오는 제목이라
 * 문서에 `h1` 이 하나는 있어야 함. 보이는 모양은 같음.
 */
const CagrTitle = () => {
  return (
    <div className="flex flex-col px-5 py-1">
      <span className="mb-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-bitcoin">
        Monthly Returns
      </span>
      <h1 className="mb-2.5 text-[19px] font-bold leading-tight tracking-tight">
        비트코인 월별 등락률
      </h1>
    </div>
  );
};

export default CagrTitle;
