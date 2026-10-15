import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { useStableGraphPane } from './StableGraphPane';

test('moving the graph between plan and answer slots preserves the same mounted component and DOM', () => {
  const mount = jest.fn(), unmount = jest.fn();
  function Graph() { useEffect(() => { mount(); return unmount; }, []); return <div data-testid="stable-graph">Graph</div>; }
  function Page({ planning }) {
    const graph = useStableGraphPane(<Graph />);
    return <>{graph.portal}{planning ? <section key="plan">{graph.slot}</section> : <article key="answer">{graph.slot}</article>}</>;
  }
  const view = render(<Page planning />);
  const original = screen.getByTestId('stable-graph');
  expect(original.closest('section')).not.toBeNull();
  view.rerender(<Page planning={false} />);
  expect(screen.getByTestId('stable-graph')).toBe(original);
  expect(original.closest('article')).not.toBeNull();
  expect(mount).toHaveBeenCalledTimes(1);
  expect(unmount).not.toHaveBeenCalled();
  view.unmount();
  expect(unmount).toHaveBeenCalledTimes(1);
});
