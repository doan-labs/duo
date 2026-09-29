# Task: import live duo.doan-labs.com routes into the pen.dev file as editable layers

Pen file: /Users/minhthanh/Work/doan-labs/iphoneduo/design/pendev/design.pen (open in pen.dev; use the `mcp__pencil__*` tools, load them with ToolSearch "select:mcp__pencil__execute,mcp__pencil__browser,mcp__pencil__read_skill").
Never Read/Grep the .pen file. Do not touch nodes you did not create, except as stated. Other agents are working in the same file at the same time on other routes; only operate on your own node ids.

## Setup (once)
1. Create your own browser node, 1440x900, at the position given in your assignment:
   `execute`: `bw=Insert(document,{type:"browser",name:"Importer <AGENT>",x:<BX>,y:<BY>,width:1440,height:900,url:"https://duo.doan-labs.com/"});Print(bw)`

## Per route (repeat for each URL in your list, in order)
0. SAVE RULE: after every finished route run `sh /Users/minhthanh/Work/doan-labs/iphoneduo/design/pendev/scripts/save.sh` and check the byte count grew. Unsaved work is lost if the app quits; this already happened once.
1. `browser` action `load-page`, nodeId = your browser node, url = `http://localhost:4400<route>` (a local proxy of the live site that forces scroll-reveal content visible; the live URL leaves reveals at opacity 0 in off-screen browser nodes and the importer drops them).
   - The reply names the loaded URL. If it names a different URL, or times out, call load-page again (it sometimes reports the previous load).
2. (no scrolling needed with the proxy)
4. `browser` action `import-to-canvas`, nodeId = your browser node. It returns the imported frame id (placed at x=840,y=0 by default - move it at once in the next step).
5. `execute` the fix script: contents of /Users/minhthanh/Work/doan-labs/iphoneduo/design/pendev/scripts/fix.js with `ROOT_ID` replaced by the quoted frame id, `ROUTE` by the quoted route string (e.g. "/docs/cli"), and `X`/`Y` by the numbers from your assignment (`...x:X,y:Y...` -> `...x:1234,y:5678...`). It fixes known importer bugs (block content wrongly centered; hover-underline gradients imported as solid bars; 1425px scrollbar width) and exports a PNG to /tmp/pen-cmp/<id>.png.
6. Verify: crop the PNG into ~1000px tall slices with python3 PIL (save as /tmp/pen-cmp/<AGENT>-<n>.png) and Read them. For the FIRST route of each page template in your list, also call `browser` `return-screenshot` on your browser node and compare side by side. Fix real discrepancies (misalignment, missing/blank content, wrong colours, collapsed or overflowing frames, big solid bars that should be text or underlines) with targeted `execute` Updates on the imported nodes. Known accepted limitations, do NOT try to fix: inline rich text inside a paragraph (a link or `code` span in running text) renders in the paragraph's single style; sticky sidebars clip at viewport height as on the live page.
   - If a page region is blank because content is a canvas/WebGL/iframe: skip it and report it instead.
   - If you find a new systematic importer bug, fix it on every page you own and report the pattern.
7. Delete your cropped slice PNGs when done with that route.

## Finish
- Delete your browser node.
- Report: for each route, the frame id, final height, and any remaining discrepancy vs the live page. Keep it compact.

## Shared post-fix rules (apply on every page after fix.js)
- fix.js lastText rule: skip frames narrower than 60px or with fill/stroke/cornerRadius (badges like /publish "01").
- pre/code text: fontFamily -> "Geist Mono" (importer maps CSS `monospace` to Inter).
- Overflowing pre: padding bottom inflated by scrollbar gutter -> set bottom = top, shrink fixed-height ancestors by the delta.
- Tables: every td/th in a tr gets the row's max height; td/th justifyContent center -> start.
- ol/ul with plain-text li lose markers -> wrap each li with a marker text (see /tmp/pen-cmp/A-extra.js).
- Stalled reveals: frames with opacity<1 (non-svg) -> 1; if a subtree is missing, re-pump scroll and re-import. Run scroll/import calls sequentially, never in one parallel batch.
- Sym mask icons ("Qm - i"): tint /public/icons/sym/<name>.webp into assets/sym/<name>-<hex>.png (/tmp/pen-cmp/B-tint.py), image fill mode fit, delete the "i" child.
