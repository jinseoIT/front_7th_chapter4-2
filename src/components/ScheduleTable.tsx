import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Text,
} from "@chakra-ui/react";
import { CellSize, DAY_LABELS, 분 } from "../constants";
import { Schedule } from "../types";
import { fill2, parseHnM } from "../utils";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ComponentProps, Fragment, memo, useCallback, useMemo } from "react";

// DnD context를 구독하여 active 상태만 체크하는 outline 레이어
const DndActiveOutline = memo(({ tableId }: { tableId: string }) => {
  const dndContext = useDndContext();

  const isActive = useMemo(() => {
    const activeId = dndContext.active?.id;
    if (!activeId) return false;
    const activeTableId = String(activeId).split(":")[0];
    return activeTableId === tableId;
  }, [dndContext.active?.id, tableId]);

  if (!isActive) return null;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      outline="5px dashed"
      outlineColor="blue.300"
      pointerEvents="none"
      zIndex={1}
    />
  );
});

DndActiveOutline.displayName = 'DndActiveOutline';

// 테이블 Grid를 메모이제이션
const MemoizedTableGrid = memo(({
  onScheduleTimeClick
}: {
  onScheduleTimeClick?: (timeInfo: { day: string; time: number }) => void;
}) => {
  return (
    <Grid
      templateColumns={`120px repeat(${DAY_LABELS.length}, ${CellSize.WIDTH}px)`}
      templateRows={`40px repeat(${TIMES.length}, ${CellSize.HEIGHT}px)`}
      bg="white"
      fontSize="sm"
      textAlign="center"
      outline="1px solid"
      outlineColor="gray.300"
    >
      <GridItem key="교시" borderColor="gray.300" bg="gray.100">
        <Flex justifyContent="center" alignItems="center" h="full" w="full">
          <Text fontWeight="bold">교시</Text>
        </Flex>
      </GridItem>
      {DAY_LABELS.map((day) => (
        <GridItem key={day} borderLeft="1px" borderColor="gray.300" bg="gray.100">
          <Flex justifyContent="center" alignItems="center" h="full">
            <Text fontWeight="bold">{day}</Text>
          </Flex>
        </GridItem>
      ))}
      {TIMES.map((time, timeIndex) => (
        <Fragment key={`시간-${timeIndex + 1}`}>
          <GridItem borderTop="1px solid" borderColor="gray.300" bg={timeIndex > 17 ? "gray.200" : "gray.100"}>
            <Flex justifyContent="center" alignItems="center" h="full">
              <Text fontSize="xs">
                {fill2(timeIndex + 1)} ({time})
              </Text>
            </Flex>
          </GridItem>
          {DAY_LABELS.map((day) => (
            <GridItem
              key={`${day}-${timeIndex + 2}`}
              borderWidth="1px 0 0 1px"
              borderColor="gray.300"
              bg={timeIndex > 17 ? "gray.100" : "white"}
              cursor="pointer"
              _hover={{ bg: "yellow.100" }}
              onClick={() => onScheduleTimeClick?.({ day, time: timeIndex + 1 })}
            />
          ))}
        </Fragment>
      ))}
    </Grid>
  );
});

MemoizedTableGrid.displayName = 'MemoizedTableGrid';

// DraggableSchedule를 감싸는 메모이제이션된 래퍼
const MemoizedDraggableSchedule = memo(({
  tableId,
  index,
  schedule,
  getColor,
  onDeleteButtonClick,
}: {
  tableId: string;
  index: number;
  schedule: Schedule;
  getColor: (lectureId: string) => string;
  onDeleteButtonClick?: (timeInfo: { day: string; time: number }) => void;
}) => {
  const handleDelete = useCallback(() => {
    onDeleteButtonClick?.({
      day: schedule.day,
      time: schedule.range[0],
    });
  }, [schedule.day, schedule.range, onDeleteButtonClick]);

  return (
    <DraggableSchedule
      id={`${tableId}:${index}`}
      data={schedule}
      bg={getColor(schedule.lecture.id)}
      onDeleteButtonClick={handleDelete}
    />
  );
});

MemoizedDraggableSchedule.displayName = 'MemoizedDraggableSchedule';

interface Props {
  tableId: string;
  schedules: Schedule[];
  onScheduleTimeClick?: (timeInfo: { day: string; time: number }) => void;
  onDeleteButtonClick?: (timeInfo: { day: string; time: number }) => void;
}

const TIMES = [
  ...Array(18)
    .fill(0)
    .map((v, k) => v + k * 30 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 30 * 분)}`),

  ...Array(6)
    .fill(18 * 30 * 분)
    .map((v, k) => v + k * 55 * 분)
    .map((v) => `${parseHnM(v)}~${parseHnM(v + 50 * 분)}`),
] as const;

const ScheduleTable = ({ tableId, schedules, onScheduleTimeClick, onDeleteButtonClick }: Props) => {
  // 강의 ID 목록을 문자열로 메모이제이션 (배열 참조가 아닌 내용 기반 비교)
  const lectureIdsKey = useMemo(() => {
    return [...new Set(schedules.map(({ lecture }) => lecture.id))].sort().join(',');
  }, [schedules]);

  // lectureIdsKey가 변경될 때만 getColor 함수 재생성
  const getColor = useMemo(() => {
    const lectures = lectureIdsKey.split(',').filter(id => id);
    const colors = ["#fdd", "#ffd", "#dff", "#ddf", "#fdf", "#dfd"];
    return (lectureId: string): string => {
      return colors[lectures.indexOf(lectureId) % colors.length];
    };
  }, [lectureIdsKey]);

  return (
    <Box position="relative">
      <DndActiveOutline tableId={tableId} />
      <MemoizedTableGrid onScheduleTimeClick={onScheduleTimeClick} />

      {schedules.map((schedule, index) => (
        <MemoizedDraggableSchedule
          key={`${schedule.lecture.title}-${index}`}
          tableId={tableId}
          index={index}
          schedule={schedule}
          getColor={getColor}
          onDeleteButtonClick={onDeleteButtonClick}
        />
      ))}
    </Box>
  );
};

const DraggableSchedule = memo(({
  id,
  data,
  bg,
  onDeleteButtonClick,
}: { id: string; data: Schedule } & ComponentProps<typeof Box> & {
    onDeleteButtonClick: () => void;
  }) => {
  const { day, range, room, lecture } = data;
  const { attributes, setNodeRef, listeners, transform } = useDraggable({ id });
  const leftIndex = DAY_LABELS.indexOf(day as (typeof DAY_LABELS)[number]);
  const topIndex = range[0] - 1;
  const size = range.length;

  return (
    <Popover>
      <PopoverTrigger>
        <Box
          position="absolute"
          left={`${120 + CellSize.WIDTH * leftIndex + 1}px`}
          top={`${40 + (topIndex * CellSize.HEIGHT + 1)}px`}
          width={CellSize.WIDTH - 1 + "px"}
          height={CellSize.HEIGHT * size - 1 + "px"}
          bg={bg}
          p={1}
          boxSizing="border-box"
          cursor="pointer"
          ref={setNodeRef}
          transform={CSS.Translate.toString(transform)}
          {...listeners}
          {...attributes}
        >
          <Text fontSize="sm" fontWeight="bold">
            {lecture.title}
          </Text>
          <Text fontSize="xs">{room}</Text>
        </Box>
      </PopoverTrigger>
      <PopoverContent onClick={(event) => event.stopPropagation()}>
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverBody>
          <Text>강의를 삭제하시겠습니까?</Text>
          <Button colorScheme="red" size="xs" onClick={onDeleteButtonClick}>
            삭제
          </Button>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
});

DraggableSchedule.displayName = 'DraggableSchedule';

export default memo(ScheduleTable);
