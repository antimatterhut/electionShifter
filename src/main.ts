import './styles.css';
import { start } from './ui/app.ts';

const app = document.getElementById('app');
if (app) void start(app);
