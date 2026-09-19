import { render } from '@testing-library/react';

import App from './app';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should greet the demo user by name', () => {
    const { getAllByText } = render(<App />);
    expect(getAllByText(new RegExp('Good morning, Ayşe', 'gi')).length > 0).toBeTruthy();
  });
});
