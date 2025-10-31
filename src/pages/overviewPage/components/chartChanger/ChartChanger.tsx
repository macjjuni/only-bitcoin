import { memo, useCallback, useRef } from "react";
import { KDropdown, KDropdownRefs, KMenu } from "kku-ui";
import { DataIcon } from "@/components/icon";
import useStore from "@/shared/stores/store";
import { OverviewChartType } from "@/shared/stores/store.interface";
import "./ChartChanger.scss";


const overviewChartOptions = [
  { label: "Hashrate", value: "hashrate" },
  { label: "Difficulty", value: "difficulty" },
  { label: "Price", value: "price" }
] as const;

const ChartChanger = () => {

  // region [Hooks]
  const overviewChart = useStore(store => store.overviewChart);
  const setOverviewChart = useStore(store => store.setOverviewChart);
  const dropdownRef = useRef<KDropdownRefs>(null);
  // endregion


  // region [Events]
  const onClickMenuItem = useCallback((chart: OverviewChartType) => {
    setOverviewChart(chart);
    dropdownRef.current?.onClose();
  }, []);
  // endregion

  return (
    <KDropdown ref={dropdownRef} trigger="click" position="left-start" className="chart-changer">
      <KDropdown.Trigger className="chart-changer__trigger remove-highlight" style={{ cursor: "pointer" }}>
        <DataIcon size={20} style={{ padding: 2 }} />
      </KDropdown.Trigger>
      <KDropdown.Content zIndex={6} offset={{ x: -8, y: 0 }}>
        <KMenu size="small">
          { overviewChartOptions.map(item => (
              <KMenu.ItemSelectable key={item.value} selected={item.value === overviewChart} label={item.label}
                                    onClick={() => { onClickMenuItem(item.value); }} />
          ))}
        </KMenu>
      </KDropdown.Content>
    </KDropdown>
  );
};

export default memo(ChartChanger);
