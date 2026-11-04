import React from 'react';
import {render, screen, fireEvent, within} from '@testing-library/react';
import BrowserToolbar from './BrowserToolbar';

test('browser controls share graph action order and execute reset, info and zoom',()=>{
  const info=jest.fn(),reset=jest.fn(),zoom=jest.fn(),fullscreen=jest.fn();
  const {rerender}=render(<BrowserToolbar onInfo={info} onReset={reset} onZoomIn={zoom} onFullscreen={fullscreen} canZoomIn canZoomOut />);
  expect(within(screen.getByRole('toolbar')).getAllByRole('button').map(b=>b.getAttribute('aria-label'))).toEqual(['Expand graph toolbar','Open in full screen','Zoom in','Zoom out','Fit to view','Plot info','Download plot','Reset view']);
  fireEvent.click(screen.getByRole('button',{name:'Plot info'}));
  fireEvent.click(screen.getByRole('button',{name:'Reset view'}));
  fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));
  expect(info).toHaveBeenCalledTimes(1);expect(reset).toHaveBeenCalledTimes(1);expect(zoom).toHaveBeenCalledTimes(1);
  rerender(<BrowserToolbar fullscreen navigationOnly onFullscreen={fullscreen}/>);
  fireEvent.click(screen.getByRole('button',{name:'Expand graph toolbar'}));
  expect(screen.queryByRole('button',{name:'Zoom in'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Exit full screen'}));expect(fullscreen).toHaveBeenCalledTimes(1);
});

test('a static figure exposes only fullscreen and download without empty groups',()=>{
 render(<BrowserToolbar visibleActions={['fullscreen','download']} onFullscreen={()=>{}} onDownload={()=>{}}/>);
 expect(within(screen.getByRole('toolbar')).getAllByRole('button').map(b=>b.getAttribute('aria-label'))).toEqual(['Open in full screen','Download plot']);
});
