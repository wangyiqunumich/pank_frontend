import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PersistentGraphViewport from './PersistentGraphViewport';

function Pane({ name }) {
  const [fullscreen, setFullscreen] = useState(false);
  return <PersistentGraphViewport fullscreen={fullscreen} onExit={() => setFullscreen(false)}>
    <section aria-label={name}><canvas data-testid={`${name}-canvas`} /><iframe title={`${name}-preview`} /><button onClick={() => setFullscreen(value => !value)}>{name} fullscreen</button></section>
  </PersistentGraphViewport>;
}
test('only the selected pane moves to fullscreen; Escape restores its exact canvas and preview without navigation', async () => {
  const push = jest.spyOn(window.history, 'pushState');
  const originalOverflow = document.body.style.overflow;
  const view = render(<><Pane name="first" /><Pane name="second" /></>);
  const canvas = screen.getByTestId('first-canvas'), preview = screen.getByTitle('first-preview');
  const originalDialog = canvas.closest('dialog');
  const originalParent = canvas.parentElement;
  const parent = canvas.closest('section').parentElement.parentElement;
  fireEvent.click(screen.getByRole('button', { name: 'first fullscreen' }));
  const dialog = screen.getByRole('dialog', { name: 'Fullscreen graph viewer' });
  expect(dialog).toBe(originalDialog); expect(canvas.parentElement).toBe(originalParent);
  expect(dialog.contains(canvas)).toBe(true); expect(dialog.contains(preview)).toBe(true);
  expect(dialog.contains(screen.getByTestId('second-canvas'))).toBe(false);
  expect(document.body.style.overflow).toBe('hidden');
  expect(push).not.toHaveBeenCalled();
  fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByTestId('first-canvas')).toBe(canvas); expect(screen.getByTitle('first-preview')).toBe(preview);
  expect(canvas.closest('dialog')).toBe(originalDialog); expect(canvas.parentElement).toBe(originalParent);
  expect(parent.contains(canvas)).toBe(true);
  expect(document.body.style.overflow).toBe(originalOverflow);
  view.unmount(); push.mockRestore();
});
test('unmounting a fullscreen pane restores page scrolling', () => {
  const overflow = document.body.style.overflow;
  const view = render(<Pane name="first" />);
  fireEvent.click(screen.getByRole('button', { name: 'first fullscreen' }));
  view.unmount();
  expect(document.body.style.overflow).toBe(overflow);
});
