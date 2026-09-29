import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ConnectionNotice, { ConnectionNoticeGroup } from './ConnectionNotice';

test('exhausted connection notices use a floating banner above the header', () => {
  const reconnect = jest.fn();
  render(<ConnectionNoticeGroup notices={[
    { status: 'paused' },
    { status: 'exhausted', onReconnect: reconnect },
  ]} />);

  const container = screen.getByTestId('connection-notice-container');
  expect(window.getComputedStyle(container).position).toBe('fixed');
  expect(window.getComputedStyle(container).zIndex).toBe('1900');
  expect(screen.queryByText('Updates are paused while this page is offline or hidden.')).toBeNull();
  expect(screen.getByText('Unable to load updates. Your available result is preserved.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(reconnect).toHaveBeenCalledTimes(1);
});

test('single connection notices use the same top banner and connected state stays hidden', () => {
  const { rerender } = render(<ConnectionNotice status="exhausted" />);
  expect(window.getComputedStyle(screen.getByTestId('connection-notice-container')).position).toBe('fixed');
  rerender(<ConnectionNotice status="connected" />);
  expect(screen.queryByTestId('connection-notice-container')).toBeNull();
  rerender(<ConnectionNotice status="paused" />);
  expect(screen.queryByTestId('connection-notice-container')).toBeNull();
});
