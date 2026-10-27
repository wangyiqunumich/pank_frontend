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

test('restores the native top layer after a plan/answer slot moves an open dialog', () => {
  let frame;
  const frames = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
  const modal = new Set();
  const nativeMatches = Element.prototype.matches;
  const matches = jest.spyOn(Element.prototype, 'matches').mockImplementation(function match(selector) {
    return selector === ':modal' ? modal.has(this) : nativeMatches.call(this, selector);
  });
  const show = jest.fn(function showModal() { this.setAttribute('open', ''); modal.add(this); });
  const close = jest.fn(function closeModal() { this.removeAttribute('open'); modal.delete(this); });
  const oldShow = HTMLDialogElement.prototype.showModal, oldClose = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal = show; HTMLDialogElement.prototype.close = close;
  try {
    const view = render(<PersistentGraphViewport fullscreen onExit={() => {}}><canvas data-testid="retained" /><iframe title="retained preview" /></PersistentGraphViewport>);
    const dialog = screen.getByRole('dialog'), canvas = screen.getByTestId('retained'), preview = screen.getByTitle('retained preview');
    expect(show).toHaveBeenCalledTimes(1);
    // Browser behavior when GraphSlot reattaches the host after layout effects.
    modal.delete(dialog);
    expect(dialog.open).toBe(true);
    frame();
    expect(close).toHaveBeenCalledTimes(1); expect(show).toHaveBeenCalledTimes(2);
    expect(modal.has(dialog)).toBe(true);
    expect(screen.getByTestId('retained')).toBe(canvas); expect(screen.getByTitle('retained preview')).toBe(preview);
    view.unmount();
  } finally {
    frames.mockRestore(); matches.mockRestore();
    HTMLDialogElement.prototype.showModal = oldShow; HTMLDialogElement.prototype.close = oldClose;
  }
});
