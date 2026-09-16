═══════════════════════════════════════════════════════════════════
THE VAULT FITNESS — WIREFRAME WORKFLOW PACK
Plain-text documentation of the whole build: views, paths, actions,
buttons, connections. Written so you can copy any section straight
into Kimi Code as a build prompt for your own PT app.
═══════════════════════════════════════════════════════════════════

FILES IN THIS FOLDER
────────────────────
00-README-start-here.txt          ← this file
01-app-map-and-architecture.txt   ← routes, shells, tech stack, file layout
02-client-view-wireframe.txt      ← member-facing pages, box diagrams
03-trainer-view-wireframe.txt     ← coach-facing pages, box diagrams
04-actions-buttons-directory.txt  ← EVERY button/action → what it does / where it goes
05-sheets-view-explained.txt      ← how the spreadsheet view is built, in detail
06-data-model-and-connections.txt ← mock data, stores, localStorage, →Supabase path
07-kimicode-prompts.txt           ← ready-to-paste build prompts per feature

HOW TO USE WITH KIMI CODE
─────────────────────────
1. Read 01 first (the map). Then pick the view you are building.
2. Paste the matching file (or section) into Kimi Code as context,
   then paste the matching prompt from 07.
3. Build one view at a time: client view → sheets → trainer view.

PRODUCT CONCEPT IN ONE PARAGRAPH
────────────────────────────────
Two personas share one app shell. CLIENT VIEW = a member logs in and
sees their training dashboard, enters data in spreadsheet-style
tracking sheets, views analytics, and reads the plan report their
coach generated. TRAINER VIEW = the coach sees a roster of clients,
builds/assigns programs, messages clients, tracks revenue, and
generates plan reports. A toggle in the sidebar switches personas
(in production this becomes role-based access from your auth system).
Marketing site funnels visitors into membership enquiry forms;
staff see submissions in an Enquiries Inbox.
