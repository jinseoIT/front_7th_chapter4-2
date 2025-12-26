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
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ComponentProps, Fragment, memo, useCallback, useMemo, MouseEvent } from "react";

// 상수: 야간 수업 시작 인덱스
const NIGHT_CLASS_START_INDEX = 17;

// 각 셀을 메모이제이션 (primitive props만 사용)
const TimeCell = memo(({ day, timeIndex }: { day: string; timeIndex: number }) => {
  const isNightClass = timeIndex > NIGHT_CLASS_START_INDEX;

  return (
    <GridItem
      borderWidth="1px 0 0 1px"
      borderColor="gray.300"
      bg={isNightClass ? "gray.100" : "white"}
      cursor="pointer"
      _hover={{ bg: "yellow.100" }}
      data-day={day}
      data-time={timeIndex + 1}
    />
  );
});

TimeCell.displayName = 'TimeCell';

// 정적 헤더 셀
const HeaderCell = memo(({ label }: { label: string }) => {
  return (
    <GridItem borderLeft="1px" borderColor="gray.300" bg="gray.100">
      <Flex justifyContent="center" alignItems="center" h="full">
        <Text fontWeight="bold">{label}</Text>
      </Flex>
    </GridItem>
  );
});

HeaderCell.displayName = 'HeaderCell';

// 정적 시간 라벨 셀
const TimeLabel = memo(({ time, timeIndex }: { time: string; timeIndex: number }) => {
  const isNightClass = timeIndex > NIGHT_CLASS_START_INDEX;

  return (
    <GridItem borderTop="1px solid" borderColor="gray.300" bg={isNightClass ? "gray.200" : "gray.100"}>
      <Flex justifyContent="center" alignItems="center" h="full">
        <Text fontSize="xs">
          {fill2(timeIndex + 1)} ({time})
        </Text>
      </Flex>
    </GridItem>
  );
});

TimeLabel.displayName = 'TimeLabel';

// 완전히 정적인 테이블 Grid (props 없음, 리렌더링 없음)
const StaticTableGrid = memo(() => {
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
        <HeaderCell key={day} label={day} />
      ))}
      {TIMES.map((time, timeIndex) => (
        <Fragment key={`시간-${timeIndex + 1}`}>
          <TimeLabel time={time} timeIndex={timeIndex} />
          {DAY_LABELS.map((day) => (
            <TimeCell key={`${day}-${timeIndex}`} day={day} timeIndex={timeIndex} />
          ))}
        </Fragment>
      ))}
    </Grid>
  );
});

StaticTableGrid.displayName = 'StaticTableGrid';

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

  const bgColor = useMemo(() => getColor(schedule.lecture.id), [getColor, schedule.lecture.id]);

  return (
    <DraggableSchedule
      id={`${tableId}:${index}`}
      data={schedule}
      bg={bgColor}
      onDeleteButtonClick={handleDelete}
    />
  );
}, (prev, next) => {
  // 커스텀 비교: 불필요한 리렌더링 방지
  return (
    prev.tableId === next.tableId &&
    prev.index === next.index &&
    prev.schedule === next.schedule &&
    prev.getColor === next.getColor &&
    prev.onDeleteButtonClick === next.onDeleteButtonClick
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

// 강의별 색상 팔레트
const LECTURE_COLORS = ["#fdd", "#ffd", "#dff", "#ddf", "#fdf", "#dfd"] as const;

const ScheduleTable = ({ tableId, schedules, onScheduleTimeClick, onDeleteButtonClick }: Props) => {
  console.log(`🟢 ScheduleTable ${tableId} 렌더링`);

  // 강의 ID를 정렬된 문자열로 메모이제이션 (내용 기반 비교)
  const lectureIdsKey = useMemo(() => {
    const uniqueIds = new Set(schedules.map(({ lecture }) => lecture.id));
    return Array.from(uniqueIds).sort().join(',');
  }, [schedules]);

  // 강의 ID -> 색상 매핑 함수 (lectureIdsKey 변경 시만 재생성)
  const getColor = useMemo(() => {
    const lectureIds = lectureIdsKey ? lectureIdsKey.split(',') : [];

    return (lectureId: string): string => {
      const index = lectureIds.indexOf(lectureId);
      return index === -1
        ? LECTURE_COLORS[0]
        : LECTURE_COLORS[index % LECTURE_COLORS.length];
    };
  }, [lectureIdsKey]);

  // 이벤트 위임: 120개 셀의 개별 핸들러 대신 1개 핸들러
  const handleGridClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const gridItem = target.closest('[data-day]');

    if (!gridItem) return;

    const day = gridItem.getAttribute('data-day');
    const timeStr = gridItem.getAttribute('data-time');

    if (day && timeStr) {
      const time = Number(timeStr);
      if (!isNaN(time)) {
        onScheduleTimeClick?.({ day, time });
      }
    }
  }, [onScheduleTimeClick]);

  return (
    <Box position="relative" onClick={handleGridClick}>
      <StaticTableGrid />

      {schedules.map((schedule, index) => (
        <MemoizedDraggableSchedule
          key={`${tableId}:${schedule.lecture.id}:${index}`}
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
