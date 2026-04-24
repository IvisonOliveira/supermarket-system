import { useState, useEffect } from 'react';

import Login from './pages/Login';
import PDV from './pages/PDV';

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    window.electronAPI.auth.getUser().then((u: any) => {
      setUser(u);
      setChecking(false);
    });
  }, []);

  if (checking) return null;
  if (!user) return <Login onLogin={setUser} />;
  return <PDV />;
}
