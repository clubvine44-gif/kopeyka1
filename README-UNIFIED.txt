Kopeyka unified build

index.html = full app (Claude core + shell CSS + no competing render patches)
Scripts (order):
  income-guard.js
  auth-cloud.js
  state-fix.js
  notes-undo.js   (period summary + notes + undo only)
  calendar-stats.js
  unified.js      (FAB shell + pro features, outermost render)

REMOVED from load path: ui-finance-v4.js (it stole render and dropped pro sections)

Hard refresh after deploy: Ctrl+Shift+R
