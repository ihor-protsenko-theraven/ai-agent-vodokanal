import './style.css';
import { TicketDispatcherUI } from './app';

document.addEventListener('DOMContentLoaded', () => {
  const ui = new TicketDispatcherUI('app');
  ui.init();
});
