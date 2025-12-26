import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { useSetSchedulesMap } from "./ScheduleContext.tsx";
import { Lecture } from "../types";
import { parseSchedule } from "../utils";
import axios from "axios";
import {
  SearchQueryFilter,
  CreditsFilter,
  GradesFilter,
  DaysFilter,
  TimesFilter,
  MajorsFilter,
} from "./SearchFilters.tsx";
import { LectureRow } from "./LectureRow.tsx";

interface Props {
  isOpen: boolean;
  initialTableId: string;
  initialDay?: string;
  initialTime?: number;
  onClose: () => void;
}

interface SearchOption {
  query?: string;
  grades: number[];
  days: string[];
  times: number[];
  majors: string[];
  credits?: number;
}

const PAGE_SIZE = 100;

const fetchMajors = () => axios.get<Lecture[]>(`${import.meta.env.BASE_URL}schedules-majors.json`);
const fetchLiberalArts = () => axios.get<Lecture[]>(`${import.meta.env.BASE_URL}schedules-liberal-arts.json`);

// TODO: 이 코드를 개선해서 API 호출을 최소화 해보세요 + Promise.all이 현재 잘못 사용되고 있습니다. 같이 개선해주세요.
const fetchAllLectures = async () => await Promise.all([fetchMajors(), fetchLiberalArts()]);

// TODO: 이 컴포넌트에서 불필요한 연산이 발생하지 않도록 다양한 방식으로 시도해주세요.
const SearchDialog = ({ isOpen, initialTableId, initialDay, initialTime, onClose }: Props) => {
  const setSchedulesMap = useSetSchedulesMap();

  // searchInfo를 내부 state로 관리
  const [currentTableId, setCurrentTableId] = useState(initialTableId);

  const loaderWrapperRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [page, setPage] = useState(1);
  const [searchOptions, setSearchOptions] = useState<SearchOption>({
    query: "",
    grades: [],
    days: [],
    times: [],
    majors: [],
  });

  const filteredLectures = useMemo(() => {
    const { query = "", credits, grades, days, times, majors } = searchOptions;
    return lectures
      .filter(
        (lecture) =>
          lecture.title.toLowerCase().includes(query.toLowerCase()) ||
          lecture.id.toLowerCase().includes(query.toLowerCase())
      )
      .filter((lecture) => grades.length === 0 || grades.includes(lecture.grade))
      .filter((lecture) => majors.length === 0 || majors.includes(lecture.major))
      .filter((lecture) => !credits || lecture.credits.startsWith(String(credits)))
      .filter((lecture) => {
        if (days.length === 0) {
          return true;
        }
        const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
        return schedules.some((s) => days.includes(s.day));
      })
      .filter((lecture) => {
        if (times.length === 0) {
          return true;
        }
        const schedules = lecture.schedule ? parseSchedule(lecture.schedule) : [];
        return schedules.some((s) => s.range.some((time) => times.includes(time)));
      });
  }, [lectures, searchOptions]);

  const allMajors = useMemo(() => {
    return [...new Set(lectures.map((lecture) => lecture.major))];
  }, [lectures]);

  const lastPage = Math.ceil(filteredLectures.length / PAGE_SIZE);

  const visibleLectures = useMemo(() => {
    return filteredLectures.slice(0, page * PAGE_SIZE);
  }, [filteredLectures, page]);

  const sortedTimes = useMemo(() => {
    return [...searchOptions.times].sort((a, b) => a - b);
  }, [searchOptions.times]);

  const changeSearchOption = useCallback((field: keyof SearchOption, value: SearchOption[typeof field]) => {
    setPage(1);
    setSearchOptions((prev) => ({ ...prev, [field]: value }));
    loaderWrapperRef.current?.scrollTo(0, 0);
  }, []);

  // 각 필터별 특화된 콜백 (React.memo 최적화를 위해)
  const handleQueryChange = useCallback(
    (value: string) => {
      changeSearchOption("query", value);
    },
    [changeSearchOption]
  );

  const handleCreditsChange = useCallback(
    (value: string) => {
      changeSearchOption("credits", value);
    },
    [changeSearchOption]
  );

  const handleGradesChange = useCallback(
    (value: number[]) => {
      changeSearchOption("grades", value);
    },
    [changeSearchOption]
  );

  const handleDaysChange = useCallback(
    (value: string[]) => {
      changeSearchOption("days", value);
    },
    [changeSearchOption]
  );

  const handleTimesChange = useCallback(
    (value: number[]) => {
      changeSearchOption("times", value);
    },
    [changeSearchOption]
  );

  const handleMajorsChange = useCallback(
    (value: string[]) => {
      changeSearchOption("majors", value);
    },
    [changeSearchOption]
  );

  const addSchedule = useCallback(
    (lecture: Lecture) => {
      if (!currentTableId) return;

      const schedules = parseSchedule(lecture.schedule).map((schedule) => ({
        ...schedule,
        lecture,
      }));

      setSchedulesMap((prev) => ({
        ...prev,
        [currentTableId]: [...prev[currentTableId], ...schedules],
      }));

      onClose();
    },
    [currentTableId, setSchedulesMap, onClose]
  );

  useEffect(() => {
    fetchAllLectures().then((results) => {
      setLectures(results.flatMap((result) => result.data));
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let observer: IntersectionObserver | null = null;

    const timeoutId = setTimeout(() => {
      const $loader = loaderRef.current;
      const $loaderWrapper = loaderWrapperRef.current;

      if (!$loader || !$loaderWrapper) {
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setPage((prevPage) => Math.min(lastPage, prevPage + 1));
          }
        },
        { threshold: 0, root: $loaderWrapper }
      );

      observer.observe($loader);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [lastPage, isOpen, filteredLectures.length]);

  useEffect(() => {
    if (isOpen) {
      setCurrentTableId(initialTableId);
      setSearchOptions((prev) => ({
        ...prev,
        days: initialDay ? [initialDay] : [],
        times: initialTime ? [initialTime] : [],
      }));
      setPage(1);
    }
  }, [isOpen, initialTableId, initialDay, initialTime]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxW="90vw" w="1000px">
        <ModalHeader>수업 검색</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4}>
              <SearchQueryFilter value={searchOptions.query} onChange={handleQueryChange} />
              <CreditsFilter value={searchOptions.credits} onChange={handleCreditsChange} />
            </HStack>

            <HStack spacing={4}>
              <GradesFilter value={searchOptions.grades} onChange={handleGradesChange} />
              <DaysFilter value={searchOptions.days} onChange={handleDaysChange} />
            </HStack>

            <HStack spacing={4}>
              <TimesFilter value={searchOptions.times} sortedTimes={sortedTimes} onChange={handleTimesChange} />
              <MajorsFilter value={searchOptions.majors} allMajors={allMajors} onChange={handleMajorsChange} />
            </HStack>
            <Text align="right">검색결과: {filteredLectures.length}개</Text>
            <Box>
              <Table>
                <Thead>
                  <Tr>
                    <Th width="100px">과목코드</Th>
                    <Th width="50px">학년</Th>
                    <Th width="200px">과목명</Th>
                    <Th width="50px">학점</Th>
                    <Th width="150px">전공</Th>
                    <Th width="150px">시간</Th>
                    <Th width="80px"></Th>
                  </Tr>
                </Thead>
              </Table>

              <Box overflowY="auto" maxH="500px" ref={loaderWrapperRef}>
                <Table size="sm" variant="striped">
                  <Tbody>
                    {visibleLectures.map((lecture, index) => (
                      <LectureRow key={`${lecture.id}-${index}`} lecture={lecture} onAdd={addSchedule} />
                    ))}
                  </Tbody>
                </Table>
                <Box ref={loaderRef} h="20px" />
              </Box>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SearchDialog;
