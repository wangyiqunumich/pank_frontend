import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import FunctionalVisual from './FunctionalVisual';
test('functional plot fills primary panel and offers expansion/download',()=>{
 render(<FunctionalVisual result={{resources_tabs:{empirical_evidence:{image_url:'/api/resources/plot',title:'Insulin response'}},component_status:{resources:'available'}}}/>);
 expect(screen.getByAltText('Insulin response')).toBeTruthy();
 expect(screen.getByRole('link',{name:'Download plot'}).getAttribute('href')).toContain('/api/resources/plot');
 fireEvent.click(screen.getByRole('button',{name:'Expand plot'}));
 expect(screen.getByRole('dialog')).toBeTruthy();
});
test('pending and failed plot states do not claim missing graph evidence',()=>{
 const {rerender}=render(<FunctionalVisual result={{component_status:{resources:'pending'}}}/>);
 expect(screen.getByText('Loading the selected cohort plot…')).toBeTruthy();
 rerender(<FunctionalVisual result={{component_status:{resources:'unavailable'}}}/>);
 expect(screen.getByText(/functional plot is unavailable/)).toBeTruthy();
 expect(screen.queryByText(/No matching graph/)).toBeNull();
});
