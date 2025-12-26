import { ChakraProvider } from "@chakra-ui/react";
import { ScheduleProvider } from "./components/ScheduleContext.tsx";
import { ScheduleTables } from "./components/ScheduleTables.tsx";

function App() {
  return (
    <ChakraProvider>
      <ScheduleProvider>
        <ScheduleTables />
      </ScheduleProvider>
    </ChakraProvider>
  );
}

export default App;
