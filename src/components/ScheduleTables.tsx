import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useSchedulesMap, useSetSchedulesMap } from "./ScheduleContext.tsx";
import SearchDialog from "./SearchDialog.tsx";
import { useState, useCallback, memo, useMemo } from "react";
import { Schedule } from "../types";
import ScheduleDndProvider from "./ScheduleDndProvider.tsx";

// 전체 테이블 카드(헤더 + 버튼 + ScheduleTable)를 메모이제이션
const ScheduleTableCard = memo(
  ({
    tableId,
    schedules,
    index,
    isOnlyOne,
    onScheduleTimeClick,
    onDeleteSchedule,
    onOpenDialog,
    onDuplicate,
    onRemove,
  }: {
    tableId: string;
    schedules: Schedule[];
    index: number;
    isOnlyOne: boolean;
    onScheduleTimeClick: (tableId: string, day: string, time: number) => void;
    onDeleteSchedule: (tableId: string, day: string, time: number) => void;
    onOpenDialog: (tableId: string) => void;
    onDuplicate: (tableId: string) => void;
    onRemove: (tableId: string) => void;
  }) => {
    // 각 테이블별 콜백 메모이제이션
    const handleScheduleTimeClick = useCallback(
      (timeInfo: { day: string; time: number }) => {
        onScheduleTimeClick(tableId, timeInfo.day, timeInfo.time);
      },
      [tableId, onScheduleTimeClick]
    );

    const handleDeleteButtonClick = useCallback(
      (timeInfo: { day: string; time: number }) => {
        onDeleteSchedule(tableId, timeInfo.day, timeInfo.time);
      },
      [tableId, onDeleteSchedule]
    );

    const handleOpenDialog = useCallback(() => {
      onOpenDialog(tableId);
    }, [tableId, onOpenDialog]);

    const handleDuplicate = useCallback(() => {
      onDuplicate(tableId);
    }, [tableId, onDuplicate]);

    const handleRemove = useCallback(() => {
      onRemove(tableId);
    }, [tableId, onRemove]);

    return (
      <Stack width="600px">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading as="h3" fontSize="lg">
            시간표 {index + 1}
          </Heading>
          <ButtonGroup size="sm" isAttached>
            <Button colorScheme="green" onClick={handleOpenDialog}>
              시간표 추가
            </Button>
            <Button colorScheme="green" mx="1px" onClick={handleDuplicate}>
              복제
            </Button>
            <Button colorScheme="green" isDisabled={isOnlyOne} onClick={handleRemove}>
              삭제
            </Button>
          </ButtonGroup>
        </Flex>
        {/* 핵심: 각 테이블마다 독립적인 DndProvider! */}
        <ScheduleDndProvider tableId={tableId}>
          <ScheduleTable
            schedules={schedules}
            tableId={tableId}
            onScheduleTimeClick={handleScheduleTimeClick}
            onDeleteButtonClick={handleDeleteButtonClick}
          />
        </ScheduleDndProvider>
      </Stack>
    );
  },
  (prevProps, nextProps) => {
    // 커스텀 비교 함수: schedules 배열이 같은 참조면 리렌더링 스킵
    return (
      prevProps.tableId === nextProps.tableId &&
      prevProps.schedules === nextProps.schedules && // 참조 비교!
      prevProps.index === nextProps.index &&
      prevProps.isOnlyOne === nextProps.isOnlyOne &&
      prevProps.onScheduleTimeClick === nextProps.onScheduleTimeClick &&
      prevProps.onDeleteSchedule === nextProps.onDeleteSchedule &&
      prevProps.onOpenDialog === nextProps.onOpenDialog &&
      prevProps.onDuplicate === nextProps.onDuplicate &&
      prevProps.onRemove === nextProps.onRemove
    );
  }
);

ScheduleTableCard.displayName = "ScheduleTableCard";

// ScheduleTables를 memo로 감싸서 DnD context 변경 시 리렌더링 방지
export const ScheduleTables = memo(() => {
  const schedulesMap = useSchedulesMap();
  const setSchedulesMap = useSetSchedulesMap();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogInitialState, setDialogInitialState] = useState<{
    tableId: string;
    day?: string;
    time?: number;
  }>({ tableId: "" });

  // 테이블 개수에 따른 삭제 버튼 비활성화
  const isOnlyOneTable = useMemo(() => Object.keys(schedulesMap).length === 1, [schedulesMap]);

  // 테이블 복제: 깊은 복사로 독립적인 스케줄 생성
  const duplicate = useCallback(
    (targetId: string) => {
      setSchedulesMap((prev) => {
        const targetSchedules = prev[targetId];
        if (!targetSchedules) return prev;

        return {
          ...prev,
          [`schedule-${Date.now()}`]: targetSchedules.map((schedule) => ({ ...schedule })),
        };
      });
    },
    [setSchedulesMap]
  );

  // 테이블 삭제: Immutable 방식 (delete 연산자 사용 안함)
  const remove = useCallback(
    (targetId: string) => {
      setSchedulesMap((prev) => {
        if (!prev[targetId]) return prev;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [targetId]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [setSchedulesMap]
  );

  // 셀 클릭: 다이얼로그 열기
  const handleScheduleTimeClick = useCallback((tableId: string, day: string, time: number) => {
    setDialogInitialState({ tableId, day, time });
    setIsDialogOpen(true);
  }, []);

  // 스케줄 삭제: 해당 day와 time을 포함하는 스케줄 제거
  const handleDeleteSchedule = useCallback(
    (tableId: string, day: string, time: number) => {
      setSchedulesMap((prev) => {
        const targetSchedules = prev[tableId];
        if (!targetSchedules) return prev;

        const filteredSchedules = targetSchedules.filter(
          (schedule) => schedule.day !== day || !schedule.range.includes(time)
        );

        // 변경 없으면 원본 반환
        if (filteredSchedules.length === targetSchedules.length) {
          return prev;
        }

        return {
          ...prev,
          [tableId]: filteredSchedules,
        };
      });
    },
    [setSchedulesMap]
  );

  // 다이얼로그 열기 (시간 선택 없이)
  const openDialogForTable = useCallback((tableId: string) => {
    setDialogInitialState({ tableId });
    setIsDialogOpen(true);
  }, []);

  // 다이얼로그 닫기
  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <>
      <Flex w="full" gap={6} p={6} flexWrap="wrap">
        {Object.entries(schedulesMap).map(([tableId, schedules], index) => (
          <ScheduleTableCard
            key={tableId}
            tableId={tableId}
            schedules={schedules}
            index={index}
            isOnlyOne={isOnlyOneTable}
            onScheduleTimeClick={handleScheduleTimeClick}
            onDeleteSchedule={handleDeleteSchedule}
            onOpenDialog={openDialogForTable}
            onDuplicate={duplicate}
            onRemove={remove}
          />
        ))}
      </Flex>
      <SearchDialog
        isOpen={isDialogOpen}
        initialTableId={dialogInitialState.tableId}
        initialDay={dialogInitialState.day}
        initialTime={dialogInitialState.time}
        onClose={closeDialog}
      />
    </>
  );
});

ScheduleTables.displayName = "ScheduleTables";
