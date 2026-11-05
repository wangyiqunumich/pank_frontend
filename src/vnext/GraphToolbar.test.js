import React from 'react';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import GraphToolbar from './GraphToolbar';

test('capsule expands to labeled controls, with the reverse collapse arrow and no click menu', () => {
  const onZoomIn = jest.fn(), onZoomOut = jest.fn(), onReset = jest.fn(), onHover = jest.fn();
  render(<GraphToolbar zoomPercent={100} canZoomIn canZoomOut hoverEnabled onZoomIn={onZoomIn} onZoomOut={onZoomOut} onReset={onReset} onHover={onHover} />);
  const toolbar = screen.getByRole('toolbar', { name: 'Graph controls' });
  const expand = within(toolbar).getByRole('button', { name: 'Expand graph toolbar' });
  expect(expand.querySelector('img').style.transform).toBe('scaleX(-1)');
  fireEvent.click(expand);
  expect(within(toolbar).getByRole('heading', { name: 'View' })).toBeTruthy();
  const collapse = within(toolbar).getByRole('button', { name: 'Collapse graph toolbar' });
  expect(collapse.querySelector('img').style.transform).toBe('none');
  expect(within(toolbar).queryByText('Click menu')).toBeNull();
  fireEvent.click(within(toolbar).getByRole('button', { name: 'Zoom in' }));
  fireEvent.click(within(toolbar).getByRole('button', { name: 'Zoom out' }));
  fireEvent.click(within(toolbar).getByRole('button', { name: 'Hover info' }));
  fireEvent.click(within(toolbar).getByRole('button', { name: 'Reset graph' }));
  expect(onZoomIn).toHaveBeenCalledTimes(1); expect(onZoomOut).toHaveBeenCalledTimes(1);
  expect(onReset).toHaveBeenCalledTimes(1); expect(onHover).toHaveBeenCalledTimes(1);
  fireEvent.click(collapse);
  expect(screen.getByRole('button', { name: 'Expand graph toolbar' })).toBeTruthy();
});

test('zoom bounds and fullscreen state are accessible in either toolbar layout', () => {
  render(<GraphToolbar fullscreen zoomPercent={200} canZoomIn={false} canZoomOut={false} />);
  expect(screen.getByRole('button', { name: 'Zoom in' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Zoom out' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Expand graph toolbar' }));
  expect(screen.getByText('200%')).toBeTruthy();
});

test.each([false, true])('download menu chooses a format without starting a download on open (expanded: %s)', expanded => {
  const json = jest.fn(), image = jest.fn();
  render(<GraphToolbar onDownloadJson={json} onDownload={image} />);
  if (expanded) fireEvent.click(screen.getByRole('button', { name: 'Expand graph toolbar' }));
  const download = screen.getByRole('button', { name: 'Download', exact: true });
  fireEvent.click(download);
  expect(json).not.toHaveBeenCalled(); expect(image).not.toHaveBeenCalled();
  expect(download.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(screen.getByRole('menuitem', { name: 'Download JSON' }));
  expect(json).toHaveBeenCalledTimes(1); expect(image).not.toHaveBeenCalled();
  fireEvent.click(download);
  fireEvent.click(screen.getByRole('menuitem', { name: 'Download image' }));
  expect(image).toHaveBeenCalledTimes(1);
});

test('density follows the graph pane height, ignores hidden tabs and cleans up its observer', () => {
  const original = global.ResizeObserver;
  let resize, height = 300;
  const disconnect = jest.fn();
  global.ResizeObserver = jest.fn(function Observer(callback) { resize = callback; this.observe = jest.fn(); this.disconnect = disconnect; });
  const bounds = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 500, height }));
  try {
    const { unmount } = render(<GraphToolbar canZoomIn canZoomOut />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.className).toContain('is-short');
    fireEvent.click(screen.getByRole('button', { name: 'Expand graph toolbar' }));
    expect(within(toolbar).getAllByRole('button')).toHaveLength(8);
    height = 0; act(() => resize());
    expect(toolbar.className).toContain('is-short');
    height = 720; act(() => resize());
    expect(toolbar.className).not.toContain('is-short');
    unmount(); expect(disconnect).toHaveBeenCalledTimes(1);
  } finally { bounds.mockRestore(); global.ResizeObserver = original; }
});

test.each([false, true])('image export reports failures and allows retry in either toolbar layout (%s)', async expanded => {
  const image = jest.fn().mockRejectedValueOnce(new Error('Canvas unavailable')).mockResolvedValueOnce();
  render(<GraphToolbar onDownloadJson={jest.fn()} onDownload={image} />);
  if (expanded) fireEvent.click(screen.getByRole('button', { name: 'Expand graph toolbar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Download', exact: true }));
  await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Download image' })));
  expect(screen.getByRole('alert').textContent).toContain('Download failed');
  expect(screen.getByRole('menuitem', { name: 'Download image' }).getAttribute('aria-disabled')).not.toBe('true');
  await act(async () => fireEvent.click(screen.getByRole('menuitem', { name: 'Download image' })));
  expect(image).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('menu')).toBeNull();
});
