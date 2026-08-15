import { Outliner } from "./Outliner";
import { Header } from "./Header";
import { useOwlbearStoreSync } from "./useOwlbearStoreSync";
import { useOwlbearStore } from "./useOwlbearStore";

export function App() {
  useOwlbearStoreSync();

  const sceneReady = useOwlbearStore((state) => state.sceneReady);

  if (sceneReady) {
    return <Outliner />;
  } else {
    return (
      <Header title="Outliner+" subtitle="Open a scene to use the outliner" />
    );
  }
}
