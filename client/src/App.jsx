import { RouterProvider } from "react-router-dom";
import RouteLoaderScreen from "./components/layout/RouteLoaderScreen";
import { router } from "./app/router";
import { getRandomLoadingMessage } from "./lib/loadingMessages";

function App() {
  return (
    <RouterProvider
      fallbackElement={<RouteLoaderScreen message={getRandomLoadingMessage()} />}
      router={router}
    />
  );
}

export default App;
