import './style.css';
import { TicketDispatcherUI } from '@/app/DispatcherApp';

document.addEventListener('DOMContentLoaded', () => {
  const ui = new TicketDispatcherUI('app');
  ui.init();
});
