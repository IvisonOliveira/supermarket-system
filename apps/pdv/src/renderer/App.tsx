import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PDV from './pages/PDV';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PDV />} />
    </Routes>
  );
}
