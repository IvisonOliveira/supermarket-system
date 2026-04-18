import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';

import PDV from './pages/PDV';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PDV />} />
    </Routes>
  );
}
