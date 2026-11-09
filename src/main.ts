import { SCHEMA_VERSION } from './domain/version.ts';

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `<h1>electionShifter</h1><p>Coming soon</p><small>schema v${SCHEMA_VERSION}</small>`;
}
