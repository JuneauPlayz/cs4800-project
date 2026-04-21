import { useAppController } from './controllers/useAppController';
import { AppView } from './views/AppView';

export default function App() {
  const controller = useAppController();
  return <AppView controller={controller} />;
}
