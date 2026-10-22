import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VisualPreview from './VisualPreview';

test('a cell-browser preview can select its initial item without a requested selection', () => {
  const open = jest.fn(), close = jest.fn();
  render(<VisualPreview items={[{ id: 'single_cell_browser', title: 'Single cell browser', openLabel: 'Open in scBrowser →', content: <span>Atlas preview</span> }]} onOpen={open} onClose={close} />);
  expect(screen.getByRole('region', { name: 'Expression evidence' })).toBeTruthy();
  expect(screen.getByText('Atlas preview')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Minimize expression card' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Open in scBrowser →' }));
  expect(open).toHaveBeenCalledWith('single_cell_browser');
  fireEvent.click(screen.getByRole('button', { name: 'Close expression card' }));
  expect(close).toHaveBeenCalledTimes(1);
});
