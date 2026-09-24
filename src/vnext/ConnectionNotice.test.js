import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ConnectionNotice, { ConnectionNoticeGroup } from './ConnectionNotice';

test('connection notices share a floating top banner above the header and paused status stays silent', () => {
  const reconnect = jest.fn();
  render(<ConnectionNoticeGroup notices={[
    { status: 'paused' },
    { status: 'exhausted', onReconnect: reconnect },
  ]} />);

  const container = screen.getByTestId('connection-notice-container');
  expect(window.getComputedStyle(container).position).toBe('fixed');
  expect(window.getComputedStyle(container).zIndex).toBe('1900');
  expect(screen.queryByText('Updates are paused while this page is offline or hidden.')).toBeNull();
  expect(screen.getByText('Live updates stopped. Your available result is preserved. Reconnect to read the saved result.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
  expect(reconnect).toHaveBeenCalledTimes(1);
});

test('single connection notices use the same top banner and connected state stays hidden', () => {
  const { rerender } = render(<ConnectionNotice status="reconnecting" />);
  expect(window.getComputedStyle(screen.getByTestId('connection-notice-container')).position).toBe('fixed');
  rerender(<ConnectionNotice status="connected" />);
  expect(screen.queryByTestId('connection-notice-container')).toBeNull();
  rerender(<ConnectionNotice status="paused" />);
  expect(screen.queryByTestId('connection-notice-container')).toBeNull();
});
