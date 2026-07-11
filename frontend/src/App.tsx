import NeuralBackground from "@/components/ui/flow-field-background";
import { useWindowSize } from "@/hooks/useWindowSize";

export default function App() {
  const { width } = useWindowSize();

  // keep 60fps on phones
  const particleCount = width < 640 ? 300 : 600;

  return (
    <div className="fixed inset-0">
      <NeuralBackground color="#6366f1" particleCount={particleCount} />
    </div>
  );
}
