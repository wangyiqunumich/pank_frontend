import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SkillsPage from './SkillsPage';
import { getDevConfig } from '../vnext/runtimeConfig';

jest.mock('../components/AgentSidebar', () => () => <aside>Sidebar</aside>);
jest.mock('../vnext/runtimeConfig', () => ({ getDevConfig: jest.fn() }));
const mount = () => render(<MemoryRouter initialEntries={['/skills']}><Routes>
  <Route path="/skills" element={<SkillsPage />} />
  <Route path="/coloc-explorer" element={<h1>Coloc catalog route</h1>} />
</Routes></MemoryRouter>);

test('coloc flag leaves existing tools intact and hides unactivated explorer', () => {
  getDevConfig.mockReturnValue({ colocEnabled: false });
  mount();
  expect(screen.queryByText('Coloc Explorer')).toBeNull();
  expect(screen.getByText('QTL Explorer Tool')).toBeTruthy();
  expect(screen.getByText('GWAS Explorer Tool')).toBeTruthy();
  expect(screen.getByText('Pancreatic Islet Functional Data Tool')).toBeTruthy();
  expect(screen.getByText('HIRN Literature QA Tool')).toBeTruthy();
});

test('activated coloc card launches its dedicated catalog route', () => {
  getDevConfig.mockReturnValue({ colocEnabled: true });
  mount();
  const title = screen.getByText('Coloc Explorer');
  fireEvent.click(title.closest('.MuiPaper-root').querySelector('button'));
  expect(screen.getByRole('heading', { name: 'Coloc catalog route' })).toBeTruthy();
});
