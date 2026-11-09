/** 원본과 같은 센트·0.01% 단위와 선택 필드 누락을 포함한 100행 HTML. */
export const createAssetRankingHtml = (): string => {
  const rows = Array.from({ length: 100 }, (_unused, assetIndex) => {
    const rank = assetIndex + 1;
    const name = rank === 1 ? "Gold" : rank === 2 ? "Bitcoin" : `Asset &amp; Fund ${rank}`;
    const ticker = rank === 1 ? "GOLD" : rank === 2 ? "BTC" : `FUND${rank}`;
    const sourceLink = rank === 2 ? "" : `<a href="/asset-${rank}/marketcap/">`;
    const sourceLinkEnd = rank === 2 ? "" : "</a>";
    const dailyChange = rank === 3 ? "<td>—</td>" : '<td data-sort="-270">-2.70%</td>';

    return `<tr>
      <td data-sort="${rank}">${rank}</td>
      <td><img class="company-logo" src="/img/company-logos/64/${ticker}.png">
        ${sourceLink}<div class="company-name">${name}</div>
        <div class="company-code"><span class="rank d-none">${rank}</span>${ticker}</div>${sourceLinkEnd}
      </td>
      <td data-sort="1483484374022">$1.483 T</td>
      <td data-sort="7379800">$73,798</td>
      ${dailyChange}
      <td><svg><path d="M0,0 L1,1" /></svg></td>
      <td>${rank === 2 ? "" : '🇺🇸 <span class="responsive-hidden">USA</span>'}</td>
    </tr>`;
  });
  return `<table class="marketcap-table"><tbody>${rows.join("\n")}</tbody></table>`;
};
