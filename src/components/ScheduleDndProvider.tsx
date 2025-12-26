import { DndContext, DragEndEvent, Modifier, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { PropsWithChildren, useCallback } from "react";
import { CellSize, DAY_LABELS } from "../constants";
import { useSetSchedulesMap } from "./ScheduleContext.tsx";

// 상수 정의: 매직 넘버 제거
const HEADER_OFFSET = {
  LEFT: 120,
  TOP: 40,
  BORDER: 1,
} as const;

function createSnapModifier(): Modifier {
  return ({ transform, containerNodeRect, draggingNodeRect }) => {
    const containerTop = containerNodeRect?.top ?? 0;
    const containerLeft = containerNodeRect?.left ?? 0;
    const containerBottom = containerNodeRect?.bottom ?? 0;
    const containerRight = containerNodeRect?.right ?? 0;

    const { top = 0, left = 0, bottom = 0, right = 0 } = draggingNodeRect ?? {};

    const minX = containerLeft - left + HEADER_OFFSET.LEFT + HEADER_OFFSET.BORDER;
    const minY = containerTop - top + HEADER_OFFSET.TOP + HEADER_OFFSET.BORDER;
    const maxX = containerRight - right;
    const maxY = containerBottom - bottom;

    return {
      ...transform,
      x: Math.min(Math.max(Math.round(transform.x / CellSize.WIDTH) * CellSize.WIDTH, minX), maxX),
      y: Math.min(Math.max(Math.round(transform.y / CellSize.HEIGHT) * CellSize.HEIGHT, minY), maxY),
    };
  };
}

const modifiers = [createSnapModifier()];

interface Props extends PropsWithChildren {
  tableId: string;
}

// 핵심: 각 테이블마다 독립적인 DndProvider!
export default function ScheduleDndProvider({ children, tableId }: Props) {
  const setSchedulesMap = useSetSchedulesMap();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const { x, y } = delta;

    // Early return: delta가 0이면 상태 업데이트 스킵
    if (x === 0 && y === 0) return;

    // ID 파싱 (tableId는 이미 prop으로 받음)
    const [, indexStr] = String(active.id).split(":");
    const scheduleIndex = Number(indexStr);

    // 잘못된 ID 형식 방어
    if (isNaN(scheduleIndex)) {
      console.warn('Invalid drag item ID format:', active.id);
      return;
    }

    setSchedulesMap((prevSchedulesMap) => {
      // 대상 스케줄 존재 확인
      const targetSchedules = prevSchedulesMap[tableId];
      if (!targetSchedules || !targetSchedules[scheduleIndex]) {
        console.warn('Target schedule not found:', { tableId, scheduleIndex });
        return prevSchedulesMap;
      }

      const targetSchedule = targetSchedules[scheduleIndex];

      // 현재 위치 계산
      const currentDayIndex = DAY_LABELS.indexOf(targetSchedule.day as (typeof DAY_LABELS)[number]);
      if (currentDayIndex === -1) {
        console.warn('Invalid day value:', targetSchedule.day);
        return prevSchedulesMap;
      }

      // 이동 거리 계산 (픽셀 -> 셀 단위)
      const moveDayIndex = Math.floor(x / CellSize.WIDTH);
      const moveTimeIndex = Math.floor(y / CellSize.HEIGHT);

      // 실제 변경 체크: 셀 이동이 없으면 원본 반환
      if (moveDayIndex === 0 && moveTimeIndex === 0) {
        return prevSchedulesMap; // 리렌더링 완전 방지
      }

      // 새 위치 계산 및 범위 검증
      const newDayIndex = currentDayIndex + moveDayIndex;
      if (newDayIndex < 0 || newDayIndex >= DAY_LABELS.length) {
        console.warn('Out of bounds: day index', newDayIndex);
        return prevSchedulesMap;
      }

      const newDay = DAY_LABELS[newDayIndex];
      const newRange = targetSchedule.range.map((time) => time + moveTimeIndex);

      // 시간 범위 유효성 검증 (선택적)
      const isValidTimeRange = newRange.every((time) => time >= 1 && time <= 24);
      if (!isValidTimeRange) {
        console.warn('Invalid time range:', newRange);
        return prevSchedulesMap;
      }

      // Immutable update: 변경된 스케줄만 새 객체 생성
      const updatedSchedules = targetSchedules.map((schedule, idx) =>
        idx === scheduleIndex
          ? { ...schedule, day: newDay, range: newRange }
          : schedule // 원본 참조 유지
      );

      // Shallow copy: 변경된 테이블만 새 참조, 나머지는 원본 참조 유지
      return {
        ...prevSchedulesMap,
        [tableId]: updatedSchedules,
      };
    });
  }, [tableId, setSchedulesMap]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={modifiers}>
      {children}
    </DndContext>
  );
}
