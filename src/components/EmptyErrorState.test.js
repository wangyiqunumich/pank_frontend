import React from 'react';
import { render, screen } from '@testing-library/react';
import EmptyErrorState from './EmptyErrorState';

test('shared empty/error state keeps home and tutorial actions with a separate support action', () => {
  render(<EmptyErrorState errorTitle="No QTL data found" errorMessage="No records matched this search." />);

  expect(screen.getByRole('status')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'No QTL data found', level: 1 })).toBeTruthy();
  expect(screen.getByText('No records matched this search.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Back to Home' }).className).toContain('MuiButton-contained');
  expect(screen.getByRole('button', { name: 'View Tutorial' }).className).toContain('MuiButton-outlined');
  expect(screen.getByRole('link', { name: 'Email Support' }).getAttribute('href')).toMatch(/^mailto:/);
});
