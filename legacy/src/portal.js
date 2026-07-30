// The portal bundle (SCRUM-32).
//
// Everything behind a login: the student, tutor and admin portals. This module
// is only ever reached through a dynamic import(), so Rollup emits it as its
// own chunk and an anonymous visitor to the marketing site never downloads it.
// That was the concrete harm in the platform review — admin and tutor business
// logic was shipped to, and readable by, everyone who loaded the homepage.
//
// The three portals share one chunk rather than getting one each, because they
// are not cleanly separable: the modules interleave (19-edit-tutor is admin and
// student, 05 is tutor and admin, 18 is tutor and student). Splitting them
// three ways would put cross-references across a chunk boundary that is only
// sometimes loaded — a broken-button-in-production bug. One boundary, drawn
// where the code actually separates, is worth more than three that leak.

import './modules/02-openstudentportal.js';
import './modules/03-openadminportal.js';
import './modules/04-admin-analytics-live-data-from-api-analy.js';
import './modules/05-opentutorportal.js';
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
import './modules/22-student-profile-view-edit.js';
import './modules/23-tutor-calendar.js';
