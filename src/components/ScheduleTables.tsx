import { Button, ButtonGroup, Flex, Heading, Stack } from "@chakra-ui/react";
import ScheduleTable from "./ScheduleTable.tsx";
import { useScheduleContext } from "./ScheduleContext.tsx";
import SearchDialog from "./SearchDialog.tsx";
import { useState, useCallback, memo } from "react";
import { Schedule } from "../types";

// ScheduleTable을 감싸는 메모이제이션된 컴포넌트
const MemoizedScheduleTableItem = memo(({
  tableId,
  schedules,
  onScheduleTimeClick,
  onDeleteButtonClick
}: {
  tableId: string;
  schedules: Schedule[];
  onScheduleTimeClick: (tableId: string, day: string, time: number) => void;
  onDeleteButtonClick: (tableId: string, day: string, time: number) => void;
}) => {
  const handleScheduleTimeClick = useCallback((timeInfo: { day: string; time: number }) => {
    onScheduleTimeClick(tableId, timeInfo.day, timeInfo.time);
  }, [tableId, onScheduleTimeClick]);

  const handleDeleteButtonClick = useCallback((timeInfo: { day: string; time: number }) => {
    onDeleteButtonClick(tableId, timeInfo.day, timeInfo.time);
  }, [tableId, onDeleteButtonClick]);

  return (
    <ScheduleTable
      schedules={schedules}
      tableId={tableId}
      onScheduleTimeClick={handleScheduleTimeClick}
      onDeleteButtonClick={handleDeleteButtonClick}
    />
  );
});

MemoizedScheduleTableItem.displayName = 'MemoizedScheduleTableItem';

export const ScheduleTables = () => {
  const { schedulesMap, setSchedulesMap } = useScheduleContext();
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
          <Stack key={tableId} width="600px">
            <Flex justifyContent="space-between" alignItems="center">
              <Heading as="h3" fontSize="lg">시간표 {index + 1}</Heading>
              <ButtonGroup size="sm" isAttached>
                <Button colorScheme="green" onClick={() => openDialogForTable(tableId)}>시간표 추가</Button>
                <Button colorScheme="green" mx="1px" onClick={() => duplicate(tableId)}>복제</Button>
                <Button colorScheme="green" isDisabled={disabledRemoveButton}
                        onClick={() => remove(tableId)}>삭제</Button>
              </ButtonGroup>
            </Flex>
            <MemoizedScheduleTableItem
              tableId={tableId}
              schedules={schedules}
              onScheduleTimeClick={handleScheduleTimeClick}
              onDeleteButtonClick={handleDeleteSchedule}
            />
          </Stack>
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
