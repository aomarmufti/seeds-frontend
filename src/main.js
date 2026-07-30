// SCRUM-32 entry point.
//
// The app used to be 25 global-scope <script> blocks inside index.html. They
// are now ES modules under ./modules, imported here in their original document
// order — that order is load-bearing: later blocks call into earlier ones at
// module-evaluation time, and each module's generated bridge has to have run
// before the next one references it.
//
// Everything below is a static import, so the whole app is still one eager
// bundle. Route-level splitting is the next step; doing it in the same change
// as the module split would have made a regression impossible to attribute.

import './modules/00-scroll-progress-indicator-lets-people-se.js';
import './modules/01-supabase-client.js';
import './modules/02-openstudentportal.js';
import './modules/03-openadminportal.js';
import './modules/04-admin-analytics-live-data-from-api-analy.js';
import './modules/05-opentutorportal.js';
import './modules/06-config.js';
import './modules/07-admin.js';
import './modules/08-admin.js';
import './modules/09-admin.js';
import './modules/10-seedsauthheaders.js';
import './modules/11-tploadschedule.js';
import './modules/12-tutor.js';
import './modules/13-tpopenaddlesson.js';
import './modules/14-tutor.js';
import './modules/15-admin.js';
import './modules/16-item-6.js';
import './modules/17-lesson-prep-mode.js';
import './modules/18-student-profile-setup.js';
import './modules/19-edit-tutor.js';
import './modules/20-tutor-profile-editing.js';
import './modules/21-openlegal.js';
import './modules/22-student-profile-view-edit.js';
import './modules/23-tutor-calendar.js';
import './modules/24-accessibility-pass.js';
