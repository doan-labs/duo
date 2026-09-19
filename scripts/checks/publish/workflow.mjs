import assert from 'node:assert/strict'

const workflow = await Bun.file('.github/workflows/publish.yml').text()

assert.match(workflow, /id: catalog/)
assert.match(workflow, /echo "changed=true" >> "\$GITHUB_OUTPUT"/)
assert.match(workflow, /echo "changed=false" >> "\$GITHUB_OUTPUT"/)
assert.match(workflow, /if: steps\.catalog\.outputs\.changed == 'true'/)
assert.match(workflow, /git commit --allow-empty -m "chore\(web\): redeploy catalog/)
assert.match(workflow, /git push origin HEAD:main/)

console.log('Publish workflow triggers a website rebuild after catalog changes')
