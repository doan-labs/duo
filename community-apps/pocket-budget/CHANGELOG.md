# Changelog

## 1.0.0

- Added dated expense entries with add, edit and delete, validated input and
  integer minor-unit amounts.
- Added seven spending categories with monthly limits editable per category.
- Added a month breakdown chart (spend against each limit) and a day-by-day
  spending strip, with explicit previous/next month navigation and a Today
  jump.
- Cover-first layout: entry, limits and both charts stay usable at 387 pt;
  the inner display puts the ledger beside the monthly breakdown through
  `useWide`.
- Persisted the ledger through `os.storage` and mirrored it plus the viewed
  month through `os.session`, so a fold mid-entry hands the same state to the
  other display.
