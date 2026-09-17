# Website

`packages/web`, same repo, same build, deploys with the rest. Its advantage over
any other platform's docs: the simulator is a web page, so the site embeds the
real device instead of screenshots.

## Pages

1. **Home.** The device, folding on scroll. Download links for the dmg, msi,
   AppImage, and Open in Browser.
2. **Get started.** `npx @doan-labs/ipduo create`, `npx @doan-labs/ipduo dev`, and the `?dev=`
   link. Target: an app on the home screen in five minutes. The embedded
   simulator targets the reader's localhost app document, subject to browser
   network permissions and CORS. Development uses the production sandbox and SDK.
3. **UI kit.** One page per component, generated from the TSDoc and props type
   in `packages/uikit`. The same demo file that powers the in-OS Developer app
   renders here, so there is one source of truth. Never hand-written.
4. **SDK and app lifecycle.** The manifest, host compatibility, bridge protocol,
   isolated display instances, and fold behavior. Mostly manifest.md and
   runtime.md rendered; label unresolved contracts until implemented.
5. **Publish.** publishing.md rendered, plus the PR template.
6. **Human Interface Guidelines.** Short and opinionated. The fold is the
   headline: design for the cover width first, then let the inner display give
   you room. Second: your app runs twice. Third: tokens only.
7. **Changelog.** The SDK's, kit's, and shell's, one page.

## Rules

- Docs live next to code. The site renders `docs/platform/*.md` and the kit's
  TSDoc; it does not have its own copies.
- No blog, no accounts, no forum. GitHub Discussions link in the footer.
- Ships after the kit exists. Building it earlier means writing it twice.
