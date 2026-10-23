import React from 'react';
import {createRoot} from 'react-dom/client';
import Central from '../app/central';
import '../app/globals.css';
import '../app/create-menu.css';
import '../app/personal-shortcuts.css';
import '../app/calendar-hub.css';
createRoot(document.getElementById('root')!).render(<Central hosting="render"/>);
