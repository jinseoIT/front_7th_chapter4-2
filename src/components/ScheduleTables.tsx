import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useSchedulesMap, useSetSchedulesMap } from "./ScheduleContext.tsx";
import SearchDialog from "./SearchDialog.tsx";
import { useState, useCallback, memo } from "react";
import { Schedule } from "../types";

// 전체 테이블 카드(헤더 + 버튼 + ScheduleTable)를 메모이제이션
const ScheduleTableCard = memo(({
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
  const handleScheduleTimeClick = useCallback((timeInfo: { day: string; time: number }) => {
    onScheduleTimeClick(tableId, timeInfo.day, timeInfo.time);
  }, [tableId, onScheduleTimeClick]);

  const handleDeleteButtonClick = useCallback((timeInfo: { day: string; time: number }) => {
    onDeleteSchedule(tableId, timeInfo.day, timeInfo.time);
  }, [tableId, onDeleteSchedule]);

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
        <Heading as="h3" fontSize="lg">시간표 {index + 1}</Heading>
        <ButtonGroup size="sm" isAttached>
          <Button colorScheme="green" onClick={handleOpenDialog}>시간표 추가</Button>
          <Button colorScheme="green" mx="1px" onClick={handleDuplicate}>복제</Button>
          <Button colorScheme="green" isDisabled={isOnlyOne} onClick={handleRemove}>삭제</Button>
        </ButtonGroup>
      </Flex>
      <ScheduleTable
        schedules={schedules}
        tableId={tableId}
        onScheduleTimeClick={handleScheduleTimeClick}
        onDeleteButtonClick={handleDeleteButtonClick}
      />
    </Stack>
  );
});

ScheduleTableCard.displayName = 'ScheduleTableCard';

export const ScheduleTables = () => {
  const schedulesMap = useSchedulesMap();
  const setSchedulesMap = useSetSchedulesMap();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogInitialState, setDialogInitialState] = useState<{
    tableId: string;
    day?: string;
    time?: number;
  }>({ tableId: '' });

  const disabledRemoveButton = Object.keys(schedulesMap).length === 1;

  const duplicate = useCallback((targetId: string) => {
    setSchedulesMap(prev => ({
      ...prev,
      [`schedule-${Date.now()}`]: [...prev[targetId]]
    }))
  }, [setSchedulesMap]);

  const remove = useCallback((targetId: string) => {
    setSchedulesMap(prev => {
      delete prev[targetId];
      return { ...prev };
    })
  }, [setSchedulesMap]);

  const handleScheduleTimeClick = useCallback((tableId: string, day: string, time: number) => {
    setDialogInitialState({ tableId, day, time });
    setIsDialogOpen(true);
  }, []);

  const handleDeleteSchedule = useCallback((tableId: string, day: string, time: number) => {
    setSchedulesMap((prev) => ({
      ...prev,
      [tableId]: prev[tableId].filter(schedule => schedule.day !== day || !schedule.range.includes(time))
    }));
  }, [setSchedulesMap]);

  const openDialogForTable = useCallback((tableId: string) => {
    setDialogInitialState({ tableId });
    setIsDialogOpen(true);
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
            isOnlyOne={disabledRemoveButton}
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
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
